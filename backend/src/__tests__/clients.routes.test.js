import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import supertest from 'supertest';
import jwt from 'jsonwebtoken';

vi.mock('../config/database.js', () => ({
  default: { query: vi.fn() },
}));

import pool from '../config/database.js';
import clientsRouter from '../routes/clients.routes.js';

const SECRET = 'test-secret';
process.env.JWT_SECRET = SECRET;
const token = jwt.sign({ userId: 1, email: 'user@test.com' }, SECRET);
const auth = () => ({ Authorization: `Bearer ${token}` });

const makeApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/clients', clientsRouter);
  app.use((err, req, res, next) => {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  });
  return app;
};

describe('GET /clients', () => {
  beforeEach(() => vi.resetAllMocks());

  it('401 без токена', async () => {
    const res = await supertest(makeApp()).get('/clients');
    expect(res.status).toBe(401);
  });

  it('200 возвращает список клиентов с пагинацией', async () => {
    const mockClients = [{ id: 1, name: 'Клиент' }];
    pool.query
      .mockResolvedValueOnce({ rows: mockClients })
      .mockResolvedValueOnce({ rows: [{ count: '1' }] });

    const res = await supertest(makeApp()).get('/clients').set(auth());
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual(mockClients);
    expect(res.body.pagination).toMatchObject({ total: 1, limit: 20, offset: 0 });
  });

  it('200 принимает параметры limit и offset', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ count: '0' }] });

    const res = await supertest(makeApp())
      .get('/clients?limit=5&offset=10')
      .set(auth());
    expect(res.status).toBe(200);
    expect(res.body.pagination.limit).toBe(5);
    expect(res.body.pagination.offset).toBe(10);
  });

  it('500 при ошибке БД', async () => {
    pool.query.mockRejectedValueOnce(new Error('DB error'));
    const res = await supertest(makeApp()).get('/clients').set(auth());
    expect(res.status).toBe(500);
  });
});

describe('GET /clients/:id', () => {
  beforeEach(() => vi.resetAllMocks());

  it('404 если клиент не найден', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await supertest(makeApp()).get('/clients/999').set(auth());
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Client not found');
  });

  it('200 возвращает клиента', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 1, name: 'Иван' }] });
    const res = await supertest(makeApp()).get('/clients/1').set(auth());
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Иван');
  });

  it('500 при ошибке БД', async () => {
    pool.query.mockRejectedValueOnce(new Error('DB error'));
    const res = await supertest(makeApp()).get('/clients/1').set(auth());
    expect(res.status).toBe(500);
  });
});

describe('POST /clients', () => {
  beforeEach(() => vi.resetAllMocks());

  it('400 при пустом name', async () => {
    const res = await supertest(makeApp())
      .post('/clients')
      .set(auth())
      .send({ name: '' });
    expect(res.status).toBe(400);
  });

  it('400 при невалидном email', async () => {
    const res = await supertest(makeApp())
      .post('/clients')
      .set(auth())
      .send({ name: 'Test', email: 'bad-email' });
    expect(res.status).toBe(400);
  });

  it('201 создаёт клиента', async () => {
    const mockClient = { id: 1, name: 'Новый клиент', status: 'active' };
    pool.query.mockResolvedValueOnce({ rows: [mockClient] });

    const res = await supertest(makeApp())
      .post('/clients')
      .set(auth())
      .send({ name: 'Новый клиент' });
    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('Новый клиент');
  });

  it('500 при ошибке БД', async () => {
    pool.query.mockRejectedValueOnce(new Error('DB'));
    const res = await supertest(makeApp())
      .post('/clients')
      .set(auth())
      .send({ name: 'Тест' });
    expect(res.status).toBe(500);
  });
});

describe('PUT /clients/:id', () => {
  beforeEach(() => vi.resetAllMocks());

  it('400 при невалидном email в PUT', async () => {
    const res = await supertest(makeApp())
      .put('/clients/1')
      .set(auth())
      .send({ email: 'not-an-email' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  it('400 при пустом name в PUT (после trim)', async () => {
    const res = await supertest(makeApp())
      .put('/clients/1')
      .set(auth())
      .send({ name: '   ' });
    expect(res.status).toBe(400);
  });

  it('404 если клиент не найден', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await supertest(makeApp())
      .put('/clients/999')
      .set(auth())
      .send({ name: 'Upd' });
    expect(res.status).toBe(404);
  });

  it('200 обновляет клиента', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 1, name: 'Updated' }] });
    const res = await supertest(makeApp())
      .put('/clients/1')
      .set(auth())
      .send({ name: 'Updated', status: 'active' });
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Updated');
  });

  it('500 при ошибке БД', async () => {
    pool.query.mockRejectedValueOnce(new Error('DB'));
    const res = await supertest(makeApp())
      .put('/clients/1')
      .set(auth())
      .send({ name: 'X' });
    expect(res.status).toBe(500);
  });
});

describe('DELETE /clients/:id', () => {
  beforeEach(() => vi.resetAllMocks());

  it('404 если клиент не найден', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await supertest(makeApp()).delete('/clients/999').set(auth());
    expect(res.status).toBe(404);
  });

  it('200 удаляет клиента', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
    const res = await supertest(makeApp()).delete('/clients/1').set(auth());
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Client deleted successfully');
  });

  it('500 при ошибке БД', async () => {
    pool.query.mockRejectedValueOnce(new Error('DB'));
    const res = await supertest(makeApp()).delete('/clients/1').set(auth());
    expect(res.status).toBe(500);
  });
});
