import { User, UserRole } from '../entities/user.entity';

export interface UpdateUserData {
  name?: string;
  email?: string;
  passwordHash?: string;
  role?: UserRole;
}

export interface IUserRepository {
  save(user: User): Promise<User>;
  findByEmail(email: string): Promise<User | null>;
  findById(id: number): Promise<User | null>;
  listAll(): Promise<User[]>;
  update(id: number, data: UpdateUserData): Promise<User>;
  delete(id: number): Promise<boolean>;
  count(): Promise<number>;
}

export interface ISettingsRepository {
  get(key: string, defaultValue?: string): Promise<string>;
  set(key: string, value: string): Promise<void>;
  getAll(): Promise<Record<string, string>>;
}
