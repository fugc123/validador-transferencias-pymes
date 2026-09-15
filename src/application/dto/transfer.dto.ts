export interface IngestEmailDto {
  text?: string;
  html?: string;
  body?: string;
  subject?: string;
  secret?: string;
}

export interface VerifyTransferDto {
  amount: number | string;
  name: string;
  windowMinutes?: number;
}

export interface VerifyResult {
  found: boolean;
  status?: 'pending' | 'already_claimed';
  message?: string;
  transfer?: {
    id?: number;
    operationId: string;
    receiptNumber: string;
    operationDate: string;
    payerName: string;
    payerBank: string | null;
    amount: number;
    currency: string;
  };
  claimedAt?: string | null;
}
