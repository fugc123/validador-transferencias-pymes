import request from 'supertest';
import { createApp } from '../../src/app';

describe('Admin Panel API E2E Flow', () => {
  let app: any;
  let adminToken: string;
  let cashierToken: string;

  beforeAll(async () => {
    const instance = createApp(':memory:', 'admin-test-secret');
    app = instance.app;

    // Login as Admin
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@kiosko.com', password: 'admin123' });
    adminToken = adminLogin.body.token;

    // Create Cashier
    const cashierCreate = await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email: 'cajero.turno1@kiosko.com', name: 'Pedro Cajero', password: 'password123', role: 'CASHIER' });
    
    // Login as Cashier
    const cashierLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'cajero.turno1@kiosko.com', password: 'password123' });
    cashierToken = cashierLogin.body.token;
  });

  it('1. GET /api/admin/users - debe rechazar acceso a rol CASHIER (403)', async () => {
    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${cashierToken}`);
    expect(res.status).toBe(403);
  });

  it('2. GET /api/admin/users - debe permitir listar usuarios al ADMIN (200)', async () => {
    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.users.length).toBeGreaterThanOrEqual(2);
  });

  it('3. PUT /api/admin/users/:id - debe permitir al ADMIN editar nombre y contraseña de un cajero', async () => {
    const usersRes = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`);
    const cashier = usersRes.body.users.find((u: any) => u.role === 'CASHIER');

    const updateRes = await request(app)
      .put(`/api/admin/users/${cashier.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Pedro Modificado', password: 'newpassword123' });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.user.name).toBe('Pedro Modificado');

    // Verify cashier can login with new password
    const loginTest = await request(app)
      .post('/api/auth/login')
      .send({ email: cashier.email, password: 'newpassword123' });
    expect(loginTest.status).toBe(200);
  });

  it('4. PUT /api/admin/settings & GET - debe permitir guardar y leer el banco activo', async () => {
    const putRes = await request(app)
      .put('/api/admin/settings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ key: 'active_bank', value: 'ITAU' });
    expect(putRes.status).toBe(200);

    const getRes = await request(app)
      .get('/api/admin/settings')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.settings.active_bank).toBe('ITAU');
  });

  it('5. DELETE /api/admin/users/:id - debe eliminar cajero correctamente', async () => {
    const usersRes = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`);
    const cashier = usersRes.body.users.find((u: any) => u.role === 'CASHIER');

    const delRes = await request(app)
      .delete(`/api/admin/users/${cashier.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(delRes.status).toBe(200);

    const afterRes = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(afterRes.body.users.find((u: any) => u.id === cashier.id)).toBeUndefined();
  });
});
