import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import { ITransferRepository } from '../../domain/ports/transfer-repository.interface';
import { Transfer } from '../../domain/entities/transfer.entity';

export class SqliteTransferRepository implements ITransferRepository {
  private db: DatabaseSync;

  constructor(dbFilePath?: string) {
    const defaultPath = path.join(__dirname, '..', '..', '..', 'data', 'kiosko.db');
    const finalPath = dbFilePath || defaultPath;

    const dir = path.dirname(finalPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new DatabaseSync(finalPath);
    this.initSchema();
  }

  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS transfers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        operation_id TEXT UNIQUE,
        receipt_number TEXT,
        operation_date TEXT,
        payer_name TEXT,
        payer_account TEXT,
        payer_bank TEXT,
        currency TEXT DEFAULT 'PYG',
        amount INTEGER NOT NULL,
        credit_account TEXT,
        concept TEXT,
        raw_body TEXT,
        status TEXT DEFAULT 'pending',
        claimed_at TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_transfers_search ON transfers(amount, status, created_at);
      CREATE INDEX IF NOT EXISTS idx_transfers_op ON transfers(operation_id);
      CREATE INDEX IF NOT EXISTS idx_transfers_receipt ON transfers(receipt_number);
    `);
  }

  private normalize(str: string): string {
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  public async save(transfer: Transfer): Promise<{ success: boolean; insertedId?: number; duplicate?: boolean }> {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO transfers (
          operation_id, receipt_number, operation_date, payer_name,
          payer_account, payer_bank, currency, amount, credit_account,
          concept, raw_body, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `);

      const res = stmt.run(
        transfer.operationId,
        transfer.receiptNumber,
        transfer.operationDate,
        transfer.payerName,
        transfer.payerAccount,
        transfer.payerBank,
        transfer.currency,
        transfer.amount,
        transfer.creditAccount,
        transfer.concept,
        transfer.rawBody,
        transfer.status
      );

      return { success: true, insertedId: Number(res.lastInsertRowid) };
    } catch (err: any) {
      if (err.message && err.message.includes('UNIQUE constraint failed')) {
        return { success: false, duplicate: true };
      }
      throw err;
    }
  }

  public async findByAmountAndName(amount: number, nameQuery: string, windowMinutes: number = 45): Promise<Transfer[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM transfers
      WHERE amount = ? 
        AND datetime(created_at) >= datetime('now', '-' || ? || ' minutes')
      ORDER BY created_at DESC
    `);

    const rows = stmt.all(amount, windowMinutes) as any[];
    const searchNorm = this.normalize(nameQuery);
    const tokens = searchNorm.split(/\s+/).filter(Boolean);

    const matches = rows.filter(r => {
      const payerNorm = this.normalize(r.payer_name);
      if (payerNorm.includes(searchNorm)) return true;
      return tokens.every(t => payerNorm.includes(t));
    });

    return matches.map(this.mapRowToEntity);
  }

  public async findById(id: number): Promise<Transfer | null> {
    const stmt = this.db.prepare('SELECT * FROM transfers WHERE id = ?');
    const row = stmt.get(id) as any;
    return row ? this.mapRowToEntity(row) : null;
  }

  public async claim(id: number): Promise<{ success: boolean; alreadyClaimed?: boolean; claimedAt?: string | null }> {
    const stmt = this.db.prepare(`
      UPDATE transfers
      SET status = 'claimed', claimed_at = datetime('now')
      WHERE id = ? AND status = 'pending'
    `);

    const res = stmt.run(id);
    if (res.changes > 0) {
      return { success: true };
    }

    const existing = await this.findById(id);
    if (existing && existing.isClaimed) {
      return { success: false, alreadyClaimed: true, claimedAt: existing.claimedAt };
    }

    return { success: false };
  }

  public async purgeOlderThan(days: number = 30): Promise<number> {
    const stmt = this.db.prepare(`
      DELETE FROM transfers
      WHERE datetime(created_at) < datetime('now', '-' || ? || ' days')
    `);
    const res = stmt.run(days);
    return Number(res.changes);
  }

  public async getRecent(limit: number = 10): Promise<Transfer[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM transfers
      ORDER BY created_at DESC
      LIMIT ?
    `);
    const rows = stmt.all(limit) as any[];
    return rows.map(this.mapRowToEntity);
  }

  private mapRowToEntity(row: any): Transfer {
    return new Transfer({
      id: row.id,
      operationId: row.operation_id,
      receiptNumber: row.receipt_number,
      operationDate: row.operation_date,
      payerName: row.payer_name,
      payerAccount: row.payer_account,
      payerBank: row.payer_bank,
      currency: row.currency,
      amount: row.amount,
      creditAccount: row.credit_account,
      concept: row.concept,
      rawBody: row.raw_body,
      status: row.status,
      claimedAt: row.claimed_at,
      createdAt: row.created_at
    });
  }
}
