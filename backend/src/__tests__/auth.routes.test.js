import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import supertest from 'supertest';
import jwt from 'jsonwebtoken';

// ── Мокируем зависимости ────────────────────────────────────────────────────
vi.mock('../config/database.js', () => ({
  default: { query: vi.fn() },
}));
vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn(),
    compare: vi.fn(),
  },
}));

import pool from '../config/database.js';
import bcrypt from 'bcryptjs';
import authRouter from '../routes/auth.routes.js';

const SECRET = 'test-secret';
const makeApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/auth', authRouter);
  app.use((err, req, res, next) => {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  });
  return app;
};

const validToken = jwt.sign({ userId: 1, email: 'test@test.com' }, SECRET);

describe('POST /auth/register', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = SECRET;
    vi.resetAllMocks();
  });

  it('400 при невалидном email', async () => {
    const app = makeApp();
    const res = await supertest(app).post('/auth/register').send({
      email: 'not-an-email',
      password: 'pass123',
      full_name: 'Test User',
    });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Validation failed');
  });

  it('400 при пароле короче 6 символов', async () => {
    const app = makeApp();
    const res = await supertest(app).post('/auth/register').send({
      email: 'test@test.com',
      password: '123',
      full_name: 'Test',
    });
    expect(res.status).toBe(400);
  });

  it('400 при пустом full_name', async () => {
    const app = makeApp();
    const res = await supertest(app).post('/auth/register').send({
      email: 'test@test.com',
      password: 'pass123',
      full_name: '',
    });
    expect(res.status).toBe(400);
  });

  it('400 если пользователь с таким email уже существует', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // user exists
    const app = makeApp();
    const res = await supertest(app).post('/auth/register').send({
      email: 'exists@test.com',
      password: 'pass123',
      full_name: 'Test User',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('User with this email already exists');
  });

  it('201 при успешной регистрации', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [] }) // no existing user
      .mockResolvedValueOnce({
        rows: [{ id: 1, email: 'new@test.com', full_name: 'New User', role: 'user' }],
      });
    bcrypt.hash.mockResolvedValueOnce('hashed_password');

    const app = makeApp();
    const res = await supertest(app).post('/auth/register').send({
      email: 'new@test.com',
      password: 'pass123',
      full_name: 'New User',
    });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('token');
    expect(res.body.data.user.email).toBe('new@test.com');
  });

  it('500 при ошибке базы данных', async () => {
    pool.query.mockRejectedValueOnce(new Error('DB connection failed'));
    const app = makeApp();
    const res = await supertest(app).post('/auth/register').send({
      email: 'error@test.com',
      password: 'pass123',
      full_name: 'Error User',
    });
    expect(res.status).toBe(500);
  });
});

describe('POST /auth/login', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = SECRET;
    vi.resetAllMocks();
  });

  it('400 при невалидном email', async () => {
    const app = makeApp();
    const res = await supertest(app).post('/auth/login').send({
      email: 'bad-email',
      password: 'pass123',
    });
    expect(res.status).toBe(400);
  });

  it('400 при пустом пароле', async () => {
    const app = makeApp();
    const res = await supertest(app).post('/auth/login').send({
      email: 'test@test.com',
      password: '',
    });
    expect(res.status).toBe(400);
  });

  it('401 если пользователь не найден', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const app = makeApp();
    const res = await supertest(app).post('/auth/login').send({
      email: 'notfound@test.com',
      password: 'pass123',
    });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid email or password');
  });

  it('401 если пароль неверный', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 1, email: 'test@test.com', password_hash: 'hash', full_name: 'User', role: 'user' }],
    });
    bcrypt.compare.mockResolvedValueOnce(false);
    const app = makeApp();
    const res = await supertest(app).post('/auth/login').send({
      email: 'test@test.com',
      password: 'wrong',
    });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid email or password');
  });

  it('200 при успешном входе', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 1, email: 'test@test.com', password_hash: 'hash', full_name: 'User', role: 'user' }],
    });
    bcrypt.compare.mockResolvedValueOnce(true);
    const app = makeApp();
    const res = await supertest(app).post('/auth/login').send({
      email: 'test@test.com',
      password: 'pass123',
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('token');
  });

  it('500 при ошибке базы данных', async () => {
    pool.query.mockRejectedValueOnce(new Error('DB error'));
    const app = makeApp();
    const res = await supertest(app).post('/auth/login').send({
      email: 'test@test.com',
      password: 'pass123',
    });
    expect(res.status).toBe(500);
  });
});

describe('GET /auth/me', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = SECRET;
    vi.resetAllMocks();
  });

  it('401 без токена', async () => {
    const app = makeApp();
    const res = await supertest(app).get('/auth/me');
    expect(res.status).toBe(401);
  });

  it('404 если пользователь не найден', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const app = makeApp();
    const res = await supertest(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${validToken}`);
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('User not found');
  });

  it('200 при успешном запросе', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 1, email: 'test@test.com', full_name: 'User', role: 'user', created_at: '2024-01-01' }],
    });
    const app = makeApp();
    const res = await supertest(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${validToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe('test@test.com');
  });

  it('500 при ошибке базы данных', async () => {
    pool.query.mockRejectedValueOnce(new Error('DB error'));
    const app = makeApp();
    const res = await supertest(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${validToken}`);
    expect(res.status).toBe(500);
  });
});
