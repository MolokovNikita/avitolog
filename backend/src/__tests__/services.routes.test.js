import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import supertest from 'supertest';
import jwt from 'jsonwebtoken';

vi.mock('../config/database.js', () => ({ default: { query: vi.fn() } }));

import pool from '../config/database.js';
import servicesRouter from '../routes/services.routes.js';

const SECRET = 'test-secret';
process.env.JWT_SECRET = SECRET;
const token = jwt.sign({ userId: 1, email: 'user@test.com' }, SECRET);
const auth = () => ({ Authorization: `Bearer ${token}` });

const makeApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/services', servicesRouter);
  app.use((err, req, res, next) => {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  });
  return app;
};

const mockService = { id: 1, name: 'Услуга', price: 1000, status: 'active' };

describe('GET /services', () => {
  beforeEach(() => vi.resetAllMocks());

  it('401 без токена', async () => {
    const res = await supertest(makeApp()).get('/services');
    expect(res.status).toBe(401);
  });

  it('200 список услуг', async () => {
    pool.query.mockResolvedValueOnce({ rows: [mockService] });
    const res = await supertest(makeApp()).get('/services').set(auth());
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it('500 при ошибке БД', async () => {
    pool.query.mockRejectedValueOnce(new Error('DB'));
    const res = await supertest(makeApp()).get('/services').set(auth());
    expect(res.status).toBe(500);
  });
});

describe('GET /services/:id', () => {
  beforeEach(() => vi.resetAllMocks());

  it('404 если услуга не найдена', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await supertest(makeApp()).get('/services/999').set(auth());
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Service not found');
  });

  it('200 возвращает услугу', async () => {
    pool.query.mockResolvedValueOnce({ rows: [mockService] });
    const res = await supertest(makeApp()).get('/services/1').set(auth());
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Услуга');
  });

  it('500 при ошибке БД', async () => {
    pool.query.mockRejectedValueOnce(new Error('DB'));
    const res = await supertest(makeApp()).get('/services/1').set(auth());
    expect(res.status).toBe(500);
  });
});

describe('POST /services', () => {
  beforeEach(() => vi.resetAllMocks());

  it('400 при пустом name', async () => {
    const res = await supertest(makeApp())
      .post('/services').set(auth()).send({ price: 100 });
    expect(res.status).toBe(400);
  });

  it('400 при отрицательной цене', async () => {
    const res = await supertest(makeApp())
      .post('/services').set(auth()).send({ name: 'Услуга', price: -5 });
    expect(res.status).toBe(400);
  });

  it('201 создаёт услугу', async () => {
    pool.query.mockResolvedValueOnce({ rows: [mockService] });
    const res = await supertest(makeApp())
      .post('/services').set(auth()).send({ name: 'Новая услуга', price: 500 });
    expect(res.status).toBe(201);
  });

  it('500 при ошибке БД', async () => {
    pool.query.mockRejectedValueOnce(new Error('DB'));
    const res = await supertest(makeApp())
      .post('/services').set(auth()).send({ name: 'Услуга', price: 100 });
    expect(res.status).toBe(500);
  });
});

describe('PUT /services/:id', () => {
  beforeEach(() => vi.resetAllMocks());

  it('404 если услуга не найдена', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await supertest(makeApp())
      .put('/services/999').set(auth()).send({ name: 'X' });
    expect(res.status).toBe(404);
  });

  it('200 обновляет услугу', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ ...mockService, name: 'Updated' }] });
    const res = await supertest(makeApp())
      .put('/services/1').set(auth()).send({ name: 'Updated', price: 200 });
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Updated');
  });

  it('500 при ошибке БД', async () => {
    pool.query.mockRejectedValueOnce(new Error('DB'));
    const res = await supertest(makeApp())
      .put('/services/1').set(auth()).send({ name: 'X' });
    expect(res.status).toBe(500);
  });
});

describe('DELETE /services/:id', () => {
  beforeEach(() => vi.resetAllMocks());

  it('404 если услуга не найдена', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await supertest(makeApp()).delete('/services/999').set(auth());
    expect(res.status).toBe(404);
  });

  it('200 удаляет услугу', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
    const res = await supertest(makeApp()).delete('/services/1').set(auth());
    expect(res.status).toBe(200);
  });

  it('500 при ошибке БД', async () => {
    pool.query.mockRejectedValueOnce(new Error('DB'));
    const res = await supertest(makeApp()).delete('/services/1').set(auth());
    expect(res.status).toBe(500);
  });
});
