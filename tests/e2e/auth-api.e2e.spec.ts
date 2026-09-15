import request from 'supertest';
import { createApp } from '../../src/app';

describe('Auth & Guarded Routes E2E Flow', () => {
  let app: any;
  let cashierToken: string;
  let adminToken: string;

  beforeAll(async () => {
    const instance = createApp(':memory:', 'test-secret-key-1234');
    app = instance.app;

    // Seed admin
    await instance.authUseCases.seedDefaultAdmin('admin@test.com', 'admin123', 'Admin Test');

    // Login as Admin
    const adminLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'admin123' });
    adminToken = adminLoginRes.body.token;

    // Admin creates Cashier
    const cashierRegisterRes = await request(app)
      .post('/api/auth/register')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email: 'cajero@test.com', password: 'cajero123', name: 'Cajero 1', role: 'CASHIER' });
    cashierToken = cashierRegisterRes.body.token;
  });

  it('1. GET /api/auth/me - debe retornar datos del usuario autenticado', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${cashierToken}`);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('cajero@test.com');
    expect(res.body.user.role).toBe('CASHIER');
  });

  it('2. POST /api/transfers/verify - debe rechazar peticiones sin token (401)', async () => {
    const res = await request(app)
      .post('/api/transfers/verify')
      .send({ amount: 45000, name: 'Gimenez' });

    expect(res.status).toBe(401);
  });

  it('3. POST /api/transfers/verify - debe permitir peticiones con token de cajero (200)', async () => {
    const res = await request(app)
      .post('/api/transfers/verify')
      .set('Authorization', `Bearer ${cashierToken}`)
      .send({ amount: 45000, name: 'Gimenez' });

    expect(res.status).toBe(200);
  });

  it('4. GET /api/transfers/recent - debe denegar acceso a rol CASHIER (403)', async () => {
    const res = await request(app)
      .get('/api/transfers/recent')
      .set('Authorization', `Bearer ${cashierToken}`);

    expect(res.status).toBe(403);
  });

  it('5. GET /api/transfers/recent - debe permitir acceso a rol ADMIN (200)', async () => {
    const res = await request(app)
      .get('/api/transfers/recent')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.transfers).toBeDefined();
  });
});
