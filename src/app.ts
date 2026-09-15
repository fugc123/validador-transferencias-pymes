import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { SqliteTransferRepository } from './infrastructure/database/sqlite-transfer.repository';
import { BankParserFactory } from './infrastructure/parsers/bank-parser.factory';
import { IngestEmailUseCase, VerifyTransferUseCase, ClaimTransferUseCase } from './application/use-cases/transfer.use-cases';
import { TransferController } from './presentation/controllers/transfer.controller';

export function createApp(dbPath?: string) {
  const app = express();

  // Security Hardening
  app.use(helmet({
    contentSecurityPolicy: false // Allows self-contained inline kiosk audio & styles
  }));
  app.use(cors());

  // Rate Limiter
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false
  });
  app.use('/api/', limiter);

  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true, limit: '5mb' }));
  app.use(express.static(path.join(__dirname, '..', 'public')));

  // Dependency Injection
  const repository = new SqliteTransferRepository(dbPath);
  const parserFactory = new BankParserFactory();

  const ingestUseCase = new IngestEmailUseCase(repository, parserFactory);
  const verifyUseCase = new VerifyTransferUseCase(repository);
  const claimUseCase = new ClaimTransferUseCase(repository);

  const controller = new TransferController(ingestUseCase, verifyUseCase, claimUseCase, repository);

  // Webhook Secret Middleware
  const webhookAuth = (req: express.Request, res: express.Response, next: express.NextFunction): void => {
    const configuredSecret = process.env.WEBHOOK_SECRET || 'kiosko-secreto-2026';
    const authHeader = req.headers['x-webhook-secret'] || req.headers['authorization'];
    const querySecret = req.query.secret;
    const bodySecret = req.body?.secret;

    const provided = querySecret || bodySecret || (typeof authHeader === 'string' ? authHeader.replace(/^Bearer\s+/i, '') : '');

    if (configuredSecret && provided !== configuredSecret) {
      res.status(401).json({ error: 'No autorizado: token secreto inválido' });
      return;
    }
    next();
  };

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'validador-transferencias-pymes', time: new Date().toISOString() });
  });

  app.post('/api/webhook/email', webhookAuth, controller.handleWebhook);
  app.post('/api/transfers/verify', controller.handleVerify);
  app.post('/api/transfers/claim', controller.handleClaim);
  app.get('/api/transfers/recent', controller.handleRecent);

  return { app, repository };
}
