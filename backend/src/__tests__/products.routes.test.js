import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import supertest from 'supertest';
import jwt from 'jsonwebtoken';

vi.mock('../config/database.js', () => ({ default: { query: vi.fn() } }));

import pool from '../config/database.js';
import productsRouter from '../routes/products.routes.js';

const SECRET = 'test-secret';
process.env.JWT_SECRET = SECRET;
const token = jwt.sign({ userId: 1, email: 'user@test.com' }, SECRET);
const auth = () => ({ Authorization: `Bearer ${token}` });

const makeApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/products', productsRouter);
  app.use((err, req, res, next) => {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  });
  return app;
};

const mockProduct = { id: 1, name: 'Товар', price: 100, stock: 10, status: 'active' };

describe('GET /products', () => {
  beforeEach(() => vi.resetAllMocks());

  it('401 без токена', async () => {
    const res = await supertest(makeApp()).get('/products');
    expect(res.status).toBe(401);
  });

  it('200 список продуктов без фильтра', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [mockProduct] })
      .mockResolvedValueOnce({ rows: [{ count: '1' }] });

    const res = await supertest(makeApp()).get('/products').set(auth());
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it('200 список продуктов с фильтром client_id', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [mockProduct] })
      .mockResolvedValueOnce({ rows: [{ count: '1' }] });

    const res = await supertest(makeApp()).get('/products?client_id=2').set(auth());
    expect(res.status).toBe(200);
  });

  it('500 при ошибке БД', async () => {
    pool.query.mockRejectedValueOnce(new Error('DB error'));
    const res = await supertest(makeApp()).get('/products').set(auth());
    expect(res.status).toBe(500);
  });
});

describe('GET /products/:id', () => {
  beforeEach(() => vi.resetAllMocks());

  it('404 если товар не найден', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await supertest(makeApp()).get('/products/999').set(auth());
    expect(res.status).toBe(404);
  });

  it('200 возвращает товар', async () => {
    pool.query.mockResolvedValueOnce({ rows: [mockProduct] });
    const res = await supertest(makeApp()).get('/products/1').set(auth());
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Товар');
  });

  it('500 при ошибке БД', async () => {
    pool.query.mockRejectedValueOnce(new Error('DB'));
    const res = await supertest(makeApp()).get('/products/1').set(auth());
    expect(res.status).toBe(500);
  });
});

describe('POST /products', () => {
  beforeEach(() => vi.resetAllMocks());

  it('400 при пустом name', async () => {
    const res = await supertest(makeApp())
      .post('/products').set(auth()).send({ name: '' });
    expect(res.status).toBe(400);
  });

  it('400 при отрицательной цене', async () => {
    const res = await supertest(makeApp())
      .post('/products').set(auth()).send({ name: 'Товар', price: -1 });
    expect(res.status).toBe(400);
  });

  it('201 создаёт товар', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 1 }] })  // client check
      .mockResolvedValueOnce({ rows: [mockProduct] }); // insert
    const res = await supertest(makeApp())
      .post('/products').set(auth())
      .send({ name: 'Новый', client_id: 1, stock: 5 });
    expect(res.status).toBe(201);
  });

  it('201 создаёт товар со всеми опциональными полями', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // client check
      .mockResolvedValueOnce({ rows: [mockProduct] }); // insert
    const res = await supertest(makeApp())
      .post('/products')
      .set(auth())
      .send({
        name: 'Полный',
        client_id: 1,
        description: 'desc',
        price: 10,
        stock: 0,
        sku: 'SKU1',
        category: 'cat',
        status: 'inactive',
      });
    expect(res.status).toBe(201);
  });

  it('404 если клиент не найден при создании товара', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] }); // client not found
    const res = await supertest(makeApp())
      .post('/products').set(auth())
      .send({ name: 'Товар', client_id: 999 });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Client not found');
  });

  it('500 при ошибке БД', async () => {
    pool.query.mockRejectedValueOnce(new Error('DB'));
    const res = await supertest(makeApp())
      .post('/products').set(auth()).send({ name: 'Тест', client_id: 1 });
    expect(res.status).toBe(500);
  });
});

describe('PUT /products/:id', () => {
  beforeEach(() => vi.resetAllMocks());

  it('404 если товар не найден', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await supertest(makeApp())
      .put('/products/999').set(auth()).send({ name: 'X' });
    expect(res.status).toBe(404);
  });

  it('200 обновляет товар', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ ...mockProduct, name: 'Updated' }] });
    const res = await supertest(makeApp())
      .put('/products/1').set(auth()).send({ name: 'Updated' });
    expect(res.status).toBe(200);
  });

  it('500 при ошибке БД', async () => {
    pool.query.mockRejectedValueOnce(new Error('DB'));
    const res = await supertest(makeApp())
      .put('/products/1').set(auth()).send({ name: 'X' });
    expect(res.status).toBe(500);
  });
});

describe('DELETE /products/:id', () => {
  beforeEach(() => vi.resetAllMocks());

  it('404 если товар не найден', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await supertest(makeApp()).delete('/products/999').set(auth());
    expect(res.status).toBe(404);
  });

  it('200 удаляет товар', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
    const res = await supertest(makeApp()).delete('/products/1').set(auth());
    expect(res.status).toBe(200);
  });

  it('500 при ошибке БД', async () => {
    pool.query.mockRejectedValueOnce(new Error('DB'));
    const res = await supertest(makeApp()).delete('/products/1').set(auth());
    expect(res.status).toBe(500);
  });
});
