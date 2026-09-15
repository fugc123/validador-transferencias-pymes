import request from 'supertest';
import { createApp } from '../../src/app';

describe('Transfer API E2E Flow with Auth', () => {
  let app: any;
  let token: string;

  beforeAll(async () => {
    const instance = createApp(':memory:', 'test-secret-e2e');
    app = instance.app;

    await instance.authUseCases.seedDefaultAdmin('admin@e2e.com', 'admin123', 'Admin E2E');
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@e2e.com', password: 'admin123' });
    token = loginRes.body.token;
  });

  const sampleEmail = `A continuación el detalle de la operación:
Nro. de operación: \tCOMAPYPAARES260914370460000640061
Fecha y hora de operación: \t14/09/2026 10:17:26
Cliente Pagador: \tMIA FIORELLA GIMENEZ AQUINO
Nro. de cuenta del pagador: \t0000000619411905
Entidad pagadora: \tUENO BANK S.A.
Moneda y Monto: \tPYG 45,000
Nro. de cuenta crédito: \t720805917
Nro. comprobante: \t8351454
Concepto de la Transferencia: \t/BNF/
Estado: \tTransferencia acreditada en cuenta`;

  it('1. POST /api/webhook/email - debe rechazar peticiones sin token secreto', async () => {
    const res = await request(app)
      .post('/api/webhook/email')
      .send({ text: sampleEmail });
    expect(res.status).toBe(401);
  });

  it('2. POST /api/webhook/email - debe ingerir correo correctamente con token secreto', async () => {
    const res = await request(app)
      .post('/api/webhook/email')
      .set('X-Webhook-Secret', 'kiosko-secreto-2026')
      .send({ text: sampleEmail });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('created');
    expect(res.body.amount).toBe(45000);
    expect(res.body.payerName).toBe('MIA FIORELLA GIMENEZ AQUINO');
  });

  it('3. POST /api/transfers/verify - debe encontrar transferencia pendiente por Monto y Apellido', async () => {
    const res = await request(app)
      .post('/api/transfers/verify')
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: '45000', name: 'gimenez' });

    expect(res.status).toBe(200);
    expect(res.body.found).toBe(true);
    expect(res.body.status).toBe('pending');
    expect(res.body.transfer.amount).toBe(45000);
    expect(res.body.transfer.id).toBeDefined();
  });

  it('4. POST /api/transfers/claim - debe cobrar y bloquear la transferencia', async () => {
    const verifyRes = await request(app)
      .post('/api/transfers/verify')
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: '45000', name: 'mia' });

    const transferId = verifyRes.body.transfer.id;

    const claimRes = await request(app)
      .post('/api/transfers/claim')
      .set('Authorization', `Bearer ${token}`)
      .send({ id: transferId });

    expect(claimRes.status).toBe(200);
    expect(claimRes.body.success).toBe(true);
  });

  it('5. POST /api/transfers/verify - debe detectar intento de reuso y alertar already_claimed (Anti-Replay)', async () => {
    const res = await request(app)
      .post('/api/transfers/verify')
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: '45000', name: 'gimenez' });

    expect(res.status).toBe(200);
    expect(res.body.found).toBe(true);
    expect(res.body.status).toBe('already_claimed');
    expect(res.body.claimedAt).toBeDefined();
  });
});
