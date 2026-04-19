import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import supertest from 'supertest';
import jwt from 'jsonwebtoken';

vi.mock('../config/database.js', () => ({
  default: { query: vi.fn() },
}));

import pool from '../config/database.js';
import analyticsRouter from '../routes/analytics.routes.js';

const SECRET = 'test-secret';
process.env.JWT_SECRET = SECRET;
const token = jwt.sign({ userId: 1, email: 'user@test.com' }, SECRET);

const makeApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/analytics', analyticsRouter);
  app.use((err, req, res, next) => {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  });
  return app;
};

const mockDashboardQueries = () => {
  pool.query
    .mockResolvedValueOnce({ rows: [{ count: '5' }] })           // active clients
    .mockResolvedValueOnce({ rows: [{ count: '12' }] })           // active listings
    .mockResolvedValueOnce({ rows: [{ total_views: '1500' }] })   // views
    .mockResolvedValueOnce({ rows: [{ total_revenue: '45000.50' }] }) // revenue
    .mockResolvedValueOnce({                                       // chart data
      rows: [
        { date: '2024-01-01', views: '100' },
        { date: '2024-01-02', views: '200' },
      ],
    })
    .mockResolvedValueOnce({                                       // top products
      rows: [
        { id: 1, name: 'Товар А', total_views: '500' },
        { id: 2, name: 'Товар Б', total_views: '300' },
      ],
    });
};

describe('GET /analytics/dashboard', () => {
  beforeEach(() => vi.resetAllMocks());

  it('401 без токена', async () => {
    const res = await supertest(makeApp()).get('/analytics/dashboard');
    expect(res.status).toBe(401);
  });

  it('200 возвращает статистику дашборда', async () => {
    mockDashboardQueries();

    const res = await supertest(makeApp())
      .get('/analytics/dashboard')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const data = res.body.data;
    expect(data.activeClients).toBe(5);
    expect(data.activeListings).toBe(12);
    expect(data.totalViews).toBe(1500);
    expect(data.totalRevenue).toBeCloseTo(45000.5);
    expect(data.chartData).toHaveLength(2);
    expect(data.chartData[0]).toMatchObject({ views: 100 });
    expect(data.topProducts).toHaveLength(2);
    expect(data.topProducts[0]).toMatchObject({ name: 'Товар А', views: 500 });
  });

  it('500 при ошибке БД (первый запрос)', async () => {
    pool.query.mockRejectedValueOnce(new Error('DB error'));
    const res = await supertest(makeApp())
      .get('/analytics/dashboard')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(500);
  });
});
