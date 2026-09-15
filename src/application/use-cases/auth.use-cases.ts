import jwt from 'jsonwebtoken';
import { IUserRepository } from '../../domain/ports/user-repository.interface';
import { User, UserRole } from '../../domain/entities/user.entity';
import { LoginDto, RegisterDto, AuthResponseDto, JwtPayload } from '../dto/auth.dto';

export class AuthUseCases {
  private jwtSecret: string;

  constructor(private userRepository: IUserRepository, jwtSecret?: string) {
    this.jwtSecret = jwtSecret || process.env.JWT_SECRET || 'kiosko-jwt-secret-key-2026';
  }

  public async login(dto: LoginDto): Promise<AuthResponseDto> {
    if (!dto.email || !dto.password) {
      throw new Error('Email y contraseña requeridos');
    }

    const user = await this.userRepository.findByEmail(dto.email);
    if (!user) {
      throw new Error('Credenciales inválidas');
    }

    const isMatch = await user.validatePassword(dto.password);
    if (!isMatch) {
      throw new Error('Credenciales inválidas');
    }

    const payload: JwtPayload = {
      sub: user.id!,
      email: user.email,
      name: user.name,
      role: user.role
    };

    const token = jwt.sign(payload, this.jwtSecret, { expiresIn: '7d' });

    return {
      token,
      user: user.toJSON()
    };
  }

  public async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const existing = await this.userRepository.findByEmail(dto.email);
    if (existing) {
      throw new Error('El correo ya se encuentra registrado');
    }

    const passwordHash = await User.hashPassword(dto.password);
    const user = new User({
      email: dto.email,
      passwordHash,
      name: dto.name,
      role: dto.role || 'CASHIER'
    });

    const savedUser = await this.userRepository.save(user);

    const payload: JwtPayload = {
      sub: savedUser.id!,
      email: savedUser.email,
      name: savedUser.name,
      role: savedUser.role
    };

    const token = jwt.sign(payload, this.jwtSecret, { expiresIn: '7d' });

    return {
      token,
      user: savedUser.toJSON()
    };
  }

  public async seedDefaultAdmin(email = 'admin@kiosko.com', password = 'admin123', name = 'Administrador Dueño'): Promise<void> {
    const count = await this.userRepository.count();
    if (count === 0) {
      await this.register({
        email,
        password,
        name,
        role: 'ADMIN'
      });
      console.log(`[Seed] Usuario inicial creado: ${email} / ${password} (Rol: ADMIN)`);
    }
  }
}
