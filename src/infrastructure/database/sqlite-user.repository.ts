import { DatabaseSync } from 'node:sqlite';
import { IUserRepository, ISettingsRepository, UpdateUserData } from '../../domain/ports/user-repository.interface';
import { User, UserRole } from '../../domain/entities/user.entity';

export class SqliteUserRepository implements IUserRepository {
  constructor(private db: DatabaseSync) {
    this.initSchema();
  }

  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'CASHIER',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    `);
  }

  public async save(user: User): Promise<User> {
    const stmt = this.db.prepare(`
      INSERT INTO users (email, password_hash, name, role, created_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);

    const result = stmt.run(
      user.email,
      user.passwordHash,
      user.name,
      user.role
    );

    return new User({
      id: Number(result.lastInsertRowid),
      email: user.email,
      passwordHash: user.passwordHash,
      name: user.name,
      role: user.role
    });
  }

  public async findByEmail(email: string): Promise<User | null> {
    const stmt = this.db.prepare('SELECT * FROM users WHERE lower(email) = lower(?)');
    const row = stmt.get(email.trim()) as any;
    return row ? this.mapRowToUser(row) : null;
  }

  public async findById(id: number): Promise<User | null> {
    const stmt = this.db.prepare('SELECT * FROM users WHERE id = ?');
    const row = stmt.get(id) as any;
    return row ? this.mapRowToUser(row) : null;
  }

  public async listAll(): Promise<User[]> {
    const stmt = this.db.prepare('SELECT * FROM users ORDER BY id ASC');
    const rows = stmt.all() as any[];
    return rows.map(this.mapRowToUser);
  }

  public async update(id: number, data: UpdateUserData): Promise<User> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error('Usuario no encontrado');
    }

    const email = data.email ? data.email.toLowerCase().trim() : existing.email;
    const name = data.name ? data.name.trim() : existing.name;
    const passwordHash = data.passwordHash || existing.passwordHash;
    const role = data.role || existing.role;

    const stmt = this.db.prepare(`
      UPDATE users 
      SET email = ?, name = ?, password_hash = ?, role = ?
      WHERE id = ?
    `);

    stmt.run(email, name, passwordHash, role, id);

    return new User({
      id,
      email,
      passwordHash,
      name,
      role,
      createdAt: existing.createdAt
    });
  }

  public async delete(id: number): Promise<boolean> {
    const stmt = this.db.prepare('DELETE FROM users WHERE id = ?');
    const res = stmt.run(id);
    return res.changes > 0;
  }

  public async count(): Promise<number> {
    const stmt = this.db.prepare('SELECT COUNT(*) as count FROM users');
    const row = stmt.get() as any;
    return Number(row?.count || 0);
  }

  private mapRowToUser(row: any): User {
    return new User({
      id: row.id,
      email: row.email,
      passwordHash: row.password_hash,
      name: row.name,
      role: row.role as UserRole,
      createdAt: row.created_at
    });
  }
}

export class SqliteSettingsRepository implements ISettingsRepository {
  constructor(private db: DatabaseSync) {
    this.initSchema();
  }

  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }

  public async get(key: string, defaultValue: string = ''): Promise<string> {
    const stmt = this.db.prepare('SELECT value FROM settings WHERE key = ?');
    const row = stmt.get(key) as any;
    return row ? String(row.value) : defaultValue;
  }

  public async set(key: string, value: string): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO settings (key, value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
    `);
    stmt.run(key, value);
  }

  public async getAll(): Promise<Record<string, string>> {
    const stmt = this.db.prepare('SELECT key, value FROM settings');
    const rows = stmt.all() as any[];
    const result: Record<string, string> = {};
    for (const r of rows) {
      result[r.key] = r.value;
    }
    return result;
  }
}
