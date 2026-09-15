import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import { DatabaseSync } from 'node:sqlite';
import { SqliteTransferRepository } from './infrastructure/database/sqlite-transfer.repository';
import { SqliteUserRepository, SqliteSettingsRepository } from './infrastructure/database/sqlite-user.repository';
import { BankParserFactory } from './infrastructure/parsers/bank-parser.factory';
import { IngestEmailUseCase, VerifyTransferUseCase, ClaimTransferUseCase } from './application/use-cases/transfer.use-cases';
import { AuthUseCases } from './application/use-cases/auth.use-cases';
import { AdminUseCases } from './application/use-cases/admin.use-cases';
import { TransferController } from './presentation/controllers/transfer.controller';
import { AuthController } from './presentation/controllers/auth.controller';
import { AdminController } from './presentation/controllers/admin.controller';
import { createAuthMiddlewares } from './presentation/middlewares/auth.middleware';

export function createApp(dbFilePath?: string, jwtSecret?: string) {
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

  // Database Connection
  const defaultPath = path.join(__dirname, '..', 'data', 'kiosko.db');
  const finalPath = dbFilePath || defaultPath;
  if (finalPath !== ':memory:') {
    const dir = path.dirname(finalPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
  const rawDb = new DatabaseSync(finalPath);

  // Repositories & Parsers
  const transferRepository = new SqliteTransferRepository(finalPath);
  const userRepository = new SqliteUserRepository(rawDb);
  const settingsRepository = new SqliteSettingsRepository(rawDb);
  const parserFactory = new BankParserFactory();

  // Use Cases
  const ingestUseCase = new IngestEmailUseCase(transferRepository, parserFactory);
  const verifyUseCase = new VerifyTransferUseCase(transferRepository);
  const claimUseCase = new ClaimTransferUseCase(transferRepository);
  const authUseCases = new AuthUseCases(userRepository, jwtSecret);
  const adminUseCases = new AdminUseCases(userRepository, settingsRepository);

  // Seed default admin from env if table is empty
  const envAdminEmail = process.env.ADMIN_EMAIL || 'admin@kiosko.com';
  const envAdminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  authUseCases.seedDefaultAdmin(envAdminEmail, envAdminPassword, 'Administrador Dueño').catch(console.error);

  // Controllers & Middlewares
  const transferController = new TransferController(ingestUseCase, verifyUseCase, claimUseCase, transferRepository);
  const authController = new AuthController(authUseCases);
  const adminController = new AdminController(adminUseCases);
  const { authenticateJwt, requireRole } = createAuthMiddlewares(jwtSecret);

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

  // Public / Health Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'validador-transferencias-pymes', time: new Date().toISOString() });
  });

  // Auth Routes
  app.post('/api/auth/login', authController.login);
  app.get('/api/auth/me', authenticateJwt, authController.me);
  app.post('/api/auth/register', authenticateJwt, requireRole('ADMIN'), authController.register);

  // Admin Management Routes (Protected by ADMIN Role)
  app.get('/api/admin/users', authenticateJwt, requireRole('ADMIN'), adminController.getUsers);
  app.post('/api/admin/users', authenticateJwt, requireRole('ADMIN'), adminController.createUser);
  app.put('/api/admin/users/:id', authenticateJwt, requireRole('ADMIN'), adminController.updateUser);
  app.delete('/api/admin/users/:id', authenticateJwt, requireRole('ADMIN'), adminController.deleteUser);
  app.get('/api/admin/settings', authenticateJwt, requireRole('ADMIN'), adminController.getSettings);
  app.put('/api/admin/settings', authenticateJwt, requireRole('ADMIN'), adminController.updateSettings);

  // Webhook Ingestion Route (Protected by Webhook Secret)
  app.post('/api/webhook/email', webhookAuth, transferController.handleWebhook);

  // Kiosk Cashier Routes (Protected by JWT: Cashier or Admin)
  app.post('/api/transfers/verify', authenticateJwt, transferController.handleVerify);
  app.post('/api/transfers/claim', authenticateJwt, transferController.handleClaim);

  // Admin Audit Routes (Protected by Role: ADMIN)
  app.get('/api/transfers/recent', authenticateJwt, requireRole('ADMIN'), transferController.handleRecent);

  return { app, transferRepository, userRepository, settingsRepository, authUseCases, adminUseCases };
}
