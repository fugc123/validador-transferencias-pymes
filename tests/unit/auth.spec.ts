import { User } from '../../src/domain/entities/user.entity';

describe('User Entity and Password Hashing Unit Test', () => {
  it('debe hashear y validar contraseñas correctamente', async () => {
    const passwordHash = await User.hashPassword('miClaveSegura123');
    const user = new User({
      email: 'cajero@kiosko.com',
      passwordHash,
      name: 'Juan Perez',
      role: 'CASHIER'
    });

    expect(user.email).toBe('cajero@kiosko.com');
    expect(user.role).toBe('CASHIER');

    const isValid = await user.validatePassword('miClaveSegura123');
    expect(isValid).toBe(true);

    const isInvalid = await user.validatePassword('claveIncorrecta');
    expect(isInvalid).toBe(false);
  });

  it('debe rechazar contraseñas de menos de 6 caracteres', async () => {
    await expect(User.hashPassword('123')).rejects.toThrow('La contraseña debe tener al menos 6 caracteres');
  });

  it('toJSON no debe exponer el passwordHash', async () => {
    const passwordHash = await User.hashPassword('supersecret123');
    const user = new User({
      email: 'admin@kiosko.com',
      passwordHash,
      name: 'Dueña',
      role: 'ADMIN'
    });

    const json = user.toJSON();
    expect(json).not.toHaveProperty('passwordHash');
    expect(json.email).toBe('admin@kiosko.com');
  });
});
