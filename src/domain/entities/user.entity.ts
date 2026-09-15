import bcrypt from 'bcryptjs';

export type UserRole = 'ADMIN' | 'CASHIER';

export interface UserProps {
  id?: number;
  email: string;
  passwordHash: string;
  name: string;
  role: UserRole;
  createdAt?: string;
}

export class User {
  public readonly id?: number;
  public readonly email: string;
  private _passwordHash: string;
  public readonly name: string;
  public readonly role: UserRole;
  public readonly createdAt?: string;

  constructor(props: UserProps) {
    if (!props.email || !props.email.includes('@')) {
      throw new Error('Email inválido');
    }
    if (!props.name || props.name.trim().length === 0) {
      throw new Error('El nombre de usuario es requerido');
    }
    if (!props.passwordHash) {
      throw new Error('El hash de contraseña es requerido');
    }

    this.id = props.id;
    this.email = props.email.toLowerCase().trim();
    this._passwordHash = props.passwordHash;
    this.name = props.name.trim();
    this.role = props.role || 'CASHIER';
    this.createdAt = props.createdAt;
  }

  get passwordHash(): string {
    return this._passwordHash;
  }

  public async validatePassword(plainPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, this._passwordHash);
  }

  public static async hashPassword(plainPassword: string): Promise<string> {
    if (!plainPassword || plainPassword.length < 6) {
      throw new Error('La contraseña debe tener al menos 6 caracteres');
    }
    return bcrypt.hash(plainPassword, 10);
  }

  public toJSON() {
    return {
      id: this.id,
      email: this.email,
      name: this.name,
      role: this.role,
      createdAt: this.createdAt
    };
  }
}
