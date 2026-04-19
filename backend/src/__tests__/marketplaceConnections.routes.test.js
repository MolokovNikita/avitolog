import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import supertest from 'supertest';
import jwt from 'jsonwebtoken';

vi.mock('../config/database.js', () => ({ default: { query: vi.fn() } }));

import pool from '../config/database.js';
import connectionsRouter from '../routes/marketplaceConnections.routes.js';

const SECRET = 'test-secret';
process.env.JWT_SECRET = SECRET;
const token = jwt.sign({ userId: 1, email: 'user@test.com' }, SECRET);
const auth = () => ({ Authorization: `Bearer ${token}` });

const makeApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/connections', connectionsRouter);
  app.use((err, req, res, next) => {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  });
  return app;
};

const mockConn = { id: 1, marketplace: 'avito', is_active: true };

describe('GET /connections', () => {
  beforeEach(() => vi.resetAllMocks());

  it('401 без токена', async () => {
    const res = await supertest(makeApp()).get('/connections');
    expect(res.status).toBe(401);
  });

  it('200 список подключений', async () => {
    pool.query.mockResolvedValueOnce({ rows: [mockConn] });
    const res = await supertest(makeApp()).get('/connections').set(auth());
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it('500 при ошибке БД', async () => {
    pool.query.mockRejectedValueOnce(new Error('DB'));
    const res = await supertest(makeApp()).get('/connections').set(auth());
    expect(res.status).toBe(500);
  });
});

describe('GET /connections/:marketplace', () => {
  beforeEach(() => vi.resetAllMocks());

  it('404 если подключение не найдено', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await supertest(makeApp()).get('/connections/ozon').set(auth());
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Connection not found');
  });

  it('200 возвращает подключение', async () => {
    pool.query.mockResolvedValueOnce({ rows: [mockConn] });
    const res = await supertest(makeApp()).get('/connections/avito').set(auth());
    expect(res.status).toBe(200);
    expect(res.body.data.marketplace).toBe('avito');
  });

  it('500 при ошибке БД', async () => {
    pool.query.mockRejectedValueOnce(new Error('DB'));
    const res = await supertest(makeApp()).get('/connections/avito').set(auth());
    expect(res.status).toBe(500);
  });
});

describe('POST /connections — создание нового', () => {
  beforeEach(() => vi.resetAllMocks());

  it('400 при пустом marketplace', async () => {
    const res = await supertest(makeApp())
      .post('/connections').set(auth()).send({ marketplace: '' });
    expect(res.status).toBe(400);
  });

  it('200 создаёт новое подключение', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [] }) // no existing
      .mockResolvedValueOnce({ rows: [mockConn] }); // insert result
    const res = await supertest(makeApp())
      .post('/connections').set(auth())
      .send({ marketplace: 'avito', api_key: 'key123' });
    expect(res.status).toBe(200);
    expect(res.body.data.marketplace).toBe('avito');
  });

  it('200 создаёт новое подключение со всеми полями и settings', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [] }) // no existing
      .mockResolvedValueOnce({ rows: [mockConn] }); // insert result
    const res = await supertest(makeApp())
      .post('/connections')
      .set(auth())
      .send({
        marketplace: 'avito',
        api_key: 'key123',
        api_secret: 'sec',
        client_id: 'cid',
        client_secret: 'csec',
        access_token: 'at',
        refresh_token: 'rt',
        is_active: true,
        settings: { foo: 'bar' },
      });
    expect(res.status).toBe(200);
  });

  it('200 обновляет существующее подключение', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 5 }] }) // existing found
      .mockResolvedValueOnce({ rows: [{ ...mockConn, api_key: 'new-key' }] }); // update result
    const res = await supertest(makeApp())
      .post('/connections').set(auth())
      .send({ marketplace: 'avito', api_key: 'new-key', is_active: true });
    expect(res.status).toBe(200);
  });

  it('200 обновляет существующее подключение с settings', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 5 }] }) // existing found
      .mockResolvedValueOnce({ rows: [{ ...mockConn, settings: { foo: 'bar' } }] }); // update result
    const res = await supertest(makeApp())
      .post('/connections')
      .set(auth())
      .send({ marketplace: 'avito', settings: { foo: 'bar' } });
    expect(res.status).toBe(200);
  });

  it('200 создаёт новое подключение без api_key (api_key=null)', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [] }) // no existing
      .mockResolvedValueOnce({ rows: [mockConn] }); // insert result
    const res = await supertest(makeApp())
      .post('/connections')
      .set(auth())
      .send({ marketplace: 'avito' });
    expect(res.status).toBe(200);
  });

  it('500 при ошибке БД', async () => {
    pool.query.mockRejectedValueOnce(new Error('DB'));
    const res = await supertest(makeApp())
      .post('/connections').set(auth()).send({ marketplace: 'avito' });
    expect(res.status).toBe(500);
  });
});

describe('POST /connections/:marketplace/sync', () => {
  beforeEach(() => vi.resetAllMocks());

  it('404 если подключение не найдено', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await supertest(makeApp())
      .post('/connections/ozon/sync').set(auth());
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Connection not found');
  });

  it('400 если подключение не активно', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 1, marketplace: 'ozon', is_active: false }] });
    const res = await supertest(makeApp())
      .post('/connections/ozon/sync').set(auth());
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Connection is not active');
  });

  it('200 запускает синхронизацию', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 1, marketplace: 'avito', is_active: true }] })
      .mockResolvedValueOnce({ rows: [] }); // update last_sync_at
    const res = await supertest(makeApp())
      .post('/connections/avito/sync').set(auth());
    expect(res.status).toBe(200);
    expect(res.body.message).toContain('avito');
  });

  it('500 при ошибке БД', async () => {
    pool.query.mockRejectedValueOnce(new Error('DB'));
    const res = await supertest(makeApp())
      .post('/connections/avito/sync').set(auth());
    expect(res.status).toBe(500);
  });
});

describe('DELETE /connections/:marketplace', () => {
  beforeEach(() => vi.resetAllMocks());

  it('404 если подключение не найдено', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await supertest(makeApp()).delete('/connections/ozon').set(auth());
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Connection not found');
  });

  it('200 удаляет подключение', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
    const res = await supertest(makeApp()).delete('/connections/avito').set(auth());
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Connection deleted successfully');
  });

  it('500 при ошибке БД', async () => {
    pool.query.mockRejectedValueOnce(new Error('DB'));
    const res = await supertest(makeApp()).delete('/connections/avito').set(auth());
    expect(res.status).toBe(500);
  });
});
