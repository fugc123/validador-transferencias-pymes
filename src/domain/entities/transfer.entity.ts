export type TransferStatus = 'pending' | 'claimed';

export interface TransferProps {
  id?: number;
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
  rawBody?: string | null;
  status: TransferStatus;
  claimedAt?: string | null;
  createdAt?: string;
}

export class Transfer {
  public readonly id?: number;
  public readonly operationId: string;
  public readonly receiptNumber: string;
  public readonly operationDate: string;
  public readonly payerName: string;
  public readonly payerAccount: string | null;
  public readonly payerBank: string | null;
  public readonly currency: string;
  public readonly amount: number;
  public readonly creditAccount: string | null;
  public readonly concept: string | null;
  public readonly rawBody: string | null;
  private _status: TransferStatus;
  private _claimedAt: string | null;
  public readonly createdAt?: string;

  constructor(props: TransferProps) {
    if (!props.operationId && !props.receiptNumber) {
      throw new Error('La transferencia debe contener al menos un identificador (operación o comprobante)');
    }
    if (props.amount <= 0) {
      throw new Error('El monto de la transferencia debe ser mayor a 0');
    }

    this.id = props.id;
    this.operationId = props.operationId;
    this.receiptNumber = props.receiptNumber;
    this.operationDate = props.operationDate;
    this.payerName = props.payerName.trim();
    this.payerAccount = props.payerAccount || null;
    this.payerBank = props.payerBank || null;
    this.currency = props.currency || 'PYG';
    this.amount = props.amount;
    this.creditAccount = props.creditAccount || null;
    this.concept = props.concept || null;
    this.rawBody = props.rawBody || null;
    this._status = props.status || 'pending';
    this._claimedAt = props.claimedAt || null;
    this.createdAt = props.createdAt;
  }

  get status(): TransferStatus {
    return this._status;
  }

  get claimedAt(): string | null {
    return this._claimedAt;
  }

  get isClaimed(): boolean {
    return this._status === 'claimed';
  }

  public claim(timestamp?: string): void {
    if (this._status === 'claimed') {
      throw new Error('La transferencia ya fue cobrada previamente');
    }
    this._status = 'claimed';
    this._claimedAt = timestamp || new Date().toISOString();
  }

  public toJSON() {
    return {
      id: this.id,
      operationId: this.operationId,
      receiptNumber: this.receiptNumber,
      operationDate: this.operationDate,
      payerName: this.payerName,
      payerAccount: this.payerAccount,
      payerBank: this.payerBank,
      currency: this.currency,
      amount: this.amount,
      creditAccount: this.creditAccount,
      concept: this.concept,
      rawBody: this.rawBody,
      status: this.status,
      claimedAt: this.claimedAt,
      createdAt: this.createdAt,
      // Compatibility aliases (snake_case)
      operation_id: this.operationId,
      receipt_number: this.receiptNumber,
      operation_date: this.operationDate,
      payer_name: this.payerName,
      payer_account: this.payerAccount,
      payer_bank: this.payerBank,
      credit_account: this.creditAccount,
      claimed_at: this.claimedAt,
      created_at: this.createdAt
    };
  }
}
