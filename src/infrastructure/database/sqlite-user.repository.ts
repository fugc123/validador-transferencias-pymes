import { DatabaseSync } from 'node:sqlite';
import { IUserRepository } from '../../domain/ports/user-repository.interface';
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
