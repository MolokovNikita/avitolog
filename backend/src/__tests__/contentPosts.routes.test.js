import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import supertest from 'supertest';
import jwt from 'jsonwebtoken';

vi.mock('../config/database.js', () => ({ default: { query: vi.fn() } }));

import pool from '../config/database.js';
import contentPostsRouter from '../routes/contentPosts.routes.js';

const SECRET = 'test-secret';
process.env.JWT_SECRET = SECRET;
const token = jwt.sign({ userId: 1, email: 'user@test.com' }, SECRET);
const auth = () => ({ Authorization: `Bearer ${token}` });

const makeApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/posts', contentPostsRouter);
  app.use((err, req, res, next) => {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  });
  return app;
};

const mockPost = {
  id: 1,
  content: 'Тестовый пост',
  status: 'draft',
  views: 0,
  likes: 0,
};

describe('GET /posts', () => {
  beforeEach(() => vi.resetAllMocks());

  it('401 без токена', async () => {
    const res = await supertest(makeApp()).get('/posts');
    expect(res.status).toBe(401);
  });

  it('200 список постов', async () => {
    pool.query.mockResolvedValueOnce({ rows: [mockPost] });
    const res = await supertest(makeApp()).get('/posts').set(auth());
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it('500 при ошибке БД', async () => {
    pool.query.mockRejectedValueOnce(new Error('DB'));
    const res = await supertest(makeApp()).get('/posts').set(auth());
    expect(res.status).toBe(500);
  });
});

describe('GET /posts/:id', () => {
  beforeEach(() => vi.resetAllMocks());

  it('404 если пост не найден', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await supertest(makeApp()).get('/posts/999').set(auth());
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Post not found');
  });

  it('200 возвращает пост', async () => {
    pool.query.mockResolvedValueOnce({ rows: [mockPost] });
    const res = await supertest(makeApp()).get('/posts/1').set(auth());
    expect(res.status).toBe(200);
    expect(res.body.data.content).toBe('Тестовый пост');
  });

  it('500 при ошибке БД', async () => {
    pool.query.mockRejectedValueOnce(new Error('DB'));
    const res = await supertest(makeApp()).get('/posts/1').set(auth());
    expect(res.status).toBe(500);
  });
});

describe('POST /posts', () => {
  beforeEach(() => vi.resetAllMocks());

  it('400 при пустом content', async () => {
    const res = await supertest(makeApp())
      .post('/posts').set(auth()).send({ content: '' });
    expect(res.status).toBe(400);
  });

  it('201 создаёт пост', async () => {
    pool.query.mockResolvedValueOnce({ rows: [mockPost] });
    const res = await supertest(makeApp())
      .post('/posts').set(auth()).send({ content: 'Новый пост' });
    expect(res.status).toBe(201);
  });

  it('500 при ошибке БД', async () => {
    pool.query.mockRejectedValueOnce(new Error('DB'));
    const res = await supertest(makeApp())
      .post('/posts').set(auth()).send({ content: 'Пост' });
    expect(res.status).toBe(500);
  });
});

describe('PUT /posts/:id', () => {
  beforeEach(() => vi.resetAllMocks());

  it('404 если пост не найден', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await supertest(makeApp())
      .put('/posts/999').set(auth()).send({ content: 'X' });
    expect(res.status).toBe(404);
  });

  it('200 обновляет пост', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ ...mockPost, content: 'Updated' }] });
    const res = await supertest(makeApp())
      .put('/posts/1').set(auth()).send({ content: 'Updated' });
    expect(res.status).toBe(200);
    expect(res.body.data.content).toBe('Updated');
  });

  it('500 при ошибке БД', async () => {
    pool.query.mockRejectedValueOnce(new Error('DB'));
    const res = await supertest(makeApp())
      .put('/posts/1').set(auth()).send({ content: 'X' });
    expect(res.status).toBe(500);
  });
});

describe('DELETE /posts/:id', () => {
  beforeEach(() => vi.resetAllMocks());

  it('404 если пост не найден', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await supertest(makeApp()).delete('/posts/999').set(auth());
    expect(res.status).toBe(404);
  });

  it('200 удаляет пост', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
    const res = await supertest(makeApp()).delete('/posts/1').set(auth());
    expect(res.status).toBe(200);
  });

  it('500 при ошибке БД', async () => {
    pool.query.mockRejectedValueOnce(new Error('DB'));
    const res = await supertest(makeApp()).delete('/posts/1').set(auth());
    expect(res.status).toBe(500);
  });
});
