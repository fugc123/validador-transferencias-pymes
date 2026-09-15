import { UserRole } from '../../domain/entities/user.entity';

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  name: string;
  role?: UserRole;
}

export interface AuthResponseDto {
  token: string;
  user: {
    id?: number;
    email: string;
    name: string;
    role: UserRole;
  };
}

export interface JwtPayload {
  sub: number;
  email: string;
  name: string;
  role: UserRole;
}
