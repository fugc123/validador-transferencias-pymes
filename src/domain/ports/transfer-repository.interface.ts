import { Transfer } from '../entities/transfer.entity';

export interface ParsedTransferData {
  operationId: string;
  receiptNumber: string;
  operationDate: string;
  payerName: string;
  payerAccount?: string | null;
  payerBank?: string | null;
  currency: string;
  amount: number;
  creditAccount?: string | null;
  concept?: string | null;
  state?: string;
  rawText: string;
}

export interface IBankParser {
  bankName: string;
  canParse(content: string): boolean;
  parse(content: string): ParsedTransferData | null;
}

export interface ITransferRepository {
  save(transfer: Transfer): Promise<{ success: boolean; insertedId?: number; duplicate?: boolean }>;
  findByAmountAndName(amount: number, nameQuery: string, windowMinutes?: number): Promise<Transfer[]>;
  findById(id: number): Promise<Transfer | null>;
  claim(id: number): Promise<{ success: boolean; alreadyClaimed?: boolean; claimedAt?: string | null }>;
  purgeOlderThan(days: number): Promise<number>;
  getRecent(limit?: number): Promise<Transfer[]>;
}
