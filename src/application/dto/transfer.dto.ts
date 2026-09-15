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
    // snake_case compatibility aliases
    operation_id?: string;
    receipt_number?: string;
    operation_date?: string;
    payer_name?: string;
    payer_bank?: string | null;
    [key: string]: any;
  };
  claimedAt?: string | null;
}
