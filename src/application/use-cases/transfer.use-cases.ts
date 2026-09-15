import { ITransferRepository } from '../../domain/ports/transfer-repository.interface';
import { BankParserFactory } from '../../infrastructure/parsers/bank-parser.factory';
import { Transfer } from '../../domain/entities/transfer.entity';
import { IngestEmailDto, VerifyTransferDto, VerifyResult } from '../dto/transfer.dto';

export class IngestEmailUseCase {
  constructor(
    private repository: ITransferRepository,
    private parserFactory: BankParserFactory
  ) {}

  public async execute(dto: IngestEmailDto): Promise<{ success: boolean; duplicate?: boolean; transfer?: Transfer }> {
    const rawContent = dto.text || dto.html || dto.body;
    if (!rawContent) {
      throw new Error('Cuerpo de correo vacío');
    }

    const parsed = this.parserFactory.parse(rawContent);
    if (!parsed) {
      throw new Error('El correo no coincide con un formato de notificación de transferencia válido');
    }

    const transfer = new Transfer({
      operationId: parsed.operationId,
      receiptNumber: parsed.receiptNumber,
      operationDate: parsed.operationDate,
      payerName: parsed.payerName,
      payerAccount: parsed.payerAccount,
      payerBank: parsed.payerBank,
      currency: parsed.currency,
      amount: parsed.amount,
      creditAccount: parsed.creditAccount,
      concept: parsed.concept,
      rawBody: parsed.rawText,
      status: 'pending'
    });

    const result = await this.repository.save(transfer);
    return {
      success: result.success,
      duplicate: result.duplicate,
      transfer
    };
  }
}

export class VerifyTransferUseCase {
  constructor(private repository: ITransferRepository) {}

  public async execute(dto: VerifyTransferDto): Promise<VerifyResult> {
    const parsedAmount = parseInt(String(dto.amount).replace(/[^0-9]/g, ''), 10);
    if (!parsedAmount || !dto.name) {
      return { found: false, message: 'Monto y nombre requeridos' };
    }

    const matches = await this.repository.findByAmountAndName(
      parsedAmount,
      dto.name,
      dto.windowMinutes || 45
    );

    if (matches.length === 0) {
      return { found: false, message: 'No se encontró transferencia pendiente con ese monto y nombre' };
    }

    // Prioritize pending transfer
    const pending = matches.find(m => !m.isClaimed);
    if (pending) {
      return {
        found: true,
        status: 'pending',
        transfer: {
          id: pending.id,
          operationId: pending.operationId,
          receiptNumber: pending.receiptNumber,
          operationDate: pending.operationDate,
          payerName: pending.payerName,
          payerBank: pending.payerBank,
          amount: pending.amount,
          currency: pending.currency
        }
      };
    }

    const claimed = matches[0];
    return {
      found: true,
      status: 'already_claimed',
      message: 'Esta transferencia ya fue cobrada previamente',
      transfer: {
        id: claimed.id,
        operationId: claimed.operationId,
        receiptNumber: claimed.receiptNumber,
        operationDate: claimed.operationDate,
        payerName: claimed.payerName,
        payerBank: claimed.payerBank,
        amount: claimed.amount,
        currency: claimed.currency
      },
      claimedAt: claimed.claimedAt
    };
  }
}

export class ClaimTransferUseCase {
  constructor(private repository: ITransferRepository) {}

  public async execute(id: number): Promise<{ success: boolean; alreadyClaimed?: boolean; message: string }> {
    const result = await this.repository.claim(id);
    if (result.success) {
      return { success: true, message: 'Transferencia cobrada y bloqueada exitosamente' };
    }
    if (result.alreadyClaimed) {
      return { success: false, alreadyClaimed: true, message: 'Esta transferencia ya fue cobrada anteriormente' };
    }
    return { success: false, message: 'Transferencia no encontrada' };
  }
}
