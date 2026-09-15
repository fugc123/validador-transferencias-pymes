import { IUserRepository, ISettingsRepository } from '../../domain/ports/user-repository.interface';
import { User, UserRole } from '../../domain/entities/user.entity';

export interface CreateCashierDto {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
}

export interface UpdateCashierDto {
  name?: string;
  email?: string;
  password?: string;
  role?: UserRole;
}

export class AdminUseCases {
  constructor(
    private userRepository: IUserRepository,
    private settingsRepository: ISettingsRepository
  ) {}

  public async listUsers(): Promise<any[]> {
    const users = await this.userRepository.listAll();
    return users.map(u => u.toJSON());
  }

  public async createUser(dto: CreateCashierDto): Promise<any> {
    const existing = await this.userRepository.findByEmail(dto.email);
    if (existing) {
      throw new Error('El correo electrónico ya está registrado');
    }

    const passwordHash = await User.hashPassword(dto.password);
    const user = new User({
      email: dto.email,
      name: dto.name,
      passwordHash,
      role: dto.role || 'CASHIER'
    });

    const saved = await this.userRepository.save(user);
    return saved.toJSON();
  }

  public async updateUser(id: number, dto: UpdateCashierDto): Promise<any> {
    const updateData: any = {};
    if (dto.name) updateData.name = dto.name;
    if (dto.email) updateData.email = dto.email;
    if (dto.role) updateData.role = dto.role;
    if (dto.password) {
      updateData.passwordHash = await User.hashPassword(dto.password);
    }

    const updated = await this.userRepository.update(id, updateData);
    return updated.toJSON();
  }

  public async deleteUser(id: number, currentUserId?: number): Promise<boolean> {
    if (currentUserId && id === currentUserId) {
      throw new Error('No podés eliminar tu propia cuenta de administrador');
    }

    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    // Check if it's the last admin
    if (user.role === 'ADMIN') {
      const all = await this.userRepository.listAll();
      const adminCount = all.filter(u => u.role === 'ADMIN').length;
      if (adminCount <= 1) {
        throw new Error('No se puede eliminar el único administrador del sistema');
      }
    }

    return this.userRepository.delete(id);
  }

  public async getSettings(): Promise<Record<string, string>> {
    const settings = await this.settingsRepository.getAll();
    return {
      active_bank: settings.active_bank || 'ALL',
      ...settings
    };
  }

  public async updateSettings(key: string, value: string): Promise<void> {
    await this.settingsRepository.set(key, value);
  }
}
