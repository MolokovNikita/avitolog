import express from 'express';
import pool from '../config/database.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

// Общая статистика для дашборда
router.get('/dashboard', async (req, res, next) => {
  try {
    const userId = req.user.userId;

    // Активные клиенты
    const activeClientsResult = await pool.query(
      `SELECT COUNT(*) as count FROM clients WHERE user_id = $1 AND status = 'active'`,
      [userId]
    );

    // Активные объявления
    const activeListingsResult = await pool.query(
      `SELECT COUNT(*) as count 
       FROM listings l
       JOIN products p ON l.product_id = p.id
       JOIN clients c ON p.client_id = c.id
       WHERE c.user_id = $1 AND l.status = 'active'`,
      [userId]
    );

    // Общее количество просмотров за месяц
    const viewsResult = await pool.query(
      `SELECT COALESCE(SUM(la.views), 0) as total_views
       FROM listing_analytics la
       JOIN listings l ON la.listing_id = l.id
       JOIN products p ON l.product_id = p.id
       JOIN clients c ON p.client_id = c.id
       WHERE c.user_id = $1 
       AND la.date >= DATE_TRUNC('month', CURRENT_DATE)`,
      [userId]
    );

    // Доход за месяц (из оплаченных счетов)
    const revenueResult = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as total_revenue
       FROM invoices
       WHERE user_id = $1 
       AND status = 'paid'
       AND paid_at >= DATE_TRUNC('month', CURRENT_DATE)`,
      [userId]
    );

    // График просмотров за последние 30 дней
    const chartDataResult = await pool.query(
      `SELECT la.date, SUM(la.views) as views
       FROM listing_analytics la
       JOIN listings l ON la.listing_id = l.id
       JOIN products p ON l.product_id = p.id
       JOIN clients c ON p.client_id = c.id
       WHERE c.user_id = $1 
       AND la.date >= CURRENT_DATE - INTERVAL '30 days'
       GROUP BY la.date
       ORDER BY la.date ASC`,
      [userId]
    );

    // Топ-5 товаров по просмотрам
    const topProductsResult = await pool.query(
      `SELECT p.id, p.name, SUM(la.views) as total_views
       FROM listing_analytics la
       JOIN listings l ON la.listing_id = l.id
       JOIN products p ON l.product_id = p.id
       JOIN clients c ON p.client_id = c.id
       WHERE c.user_id = $1
       AND la.date >= DATE_TRUNC('month', CURRENT_DATE)
       GROUP BY p.id, p.name
       ORDER BY total_views DESC
       LIMIT 5`,
      [userId]
    );

    res.json({
      success: true,
      data: {
        activeClients: parseInt(activeClientsResult.rows[0].count),
        activeListings: parseInt(activeListingsResult.rows[0].count),
        totalViews: parseInt(viewsResult.rows[0].total_views),
        totalRevenue: parseFloat(revenueResult.rows[0].total_revenue),
        chartData: chartDataResult.rows.map(row => ({
          date: row.date,
          views: parseInt(row.views),
        })),
        topProducts: topProductsResult.rows.map(row => ({
          id: row.id,
          name: row.name,
          views: parseInt(row.total_views),
        })),
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;

