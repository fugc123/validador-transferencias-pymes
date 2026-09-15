import { Request, Response } from 'express';
import { IngestEmailUseCase, VerifyTransferUseCase, ClaimTransferUseCase } from '../../application/use-cases/transfer.use-cases';
import { ITransferRepository } from '../../domain/ports/transfer-repository.interface';

export class TransferController {
  constructor(
    private ingestEmailUseCase: IngestEmailUseCase,
    private verifyTransferUseCase: VerifyTransferUseCase,
    private claimTransferUseCase: ClaimTransferUseCase,
    private repository: ITransferRepository
  ) {}

  public handleWebhook = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.ingestEmailUseCase.execute(req.body);
      if (result.duplicate) {
        res.status(200).json({ status: 'already_exists', message: 'Transferencia ya registrada previamente' });
        return;
      }
      res.status(201).json({
        status: 'created',
        operationId: result.transfer?.operationId,
        amount: result.transfer?.amount,
        payerName: result.transfer?.payerName
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Error procesando webhook' });
    }
  };

  public handleVerify = async (req: Request, res: Response): Promise<void> => {
    try {
      const { amount, name, windowMinutes } = req.body;
      const result = await this.verifyTransferUseCase.execute({ amount, name, windowMinutes });
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Error verificando transferencia' });
    }
  };

  public handleClaim = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.body;
      if (!id) {
        res.status(400).json({ error: 'ID de transferencia requerido' });
        return;
      }
      const result = await this.claimTransferUseCase.execute(Number(id));
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Error confirmando cobro' });
    }
  };

  public handleRecent = async (req: Request, res: Response): Promise<void> => {
    try {
      const limit = parseInt(String(req.query.limit || 10), 10);
      const transfers = await this.repository.getRecent(limit);
      res.json({ transfers });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  };
}
