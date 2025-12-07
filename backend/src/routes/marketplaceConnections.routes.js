import express from 'express';
import { body, validationResult } from 'express-validator';
import pool from '../config/database.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

// Получить все подключения
router.get('/', async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT id, marketplace, is_active, last_sync_at, created_at, updated_at FROM marketplace_connections WHERE user_id = $1 ORDER BY marketplace',
      [req.user.userId]
    );

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    next(error);
  }
});

// Получить подключение по маркетплейсу
router.get('/:marketplace', async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, marketplace, is_active, last_sync_at, settings, created_at, updated_at
       FROM marketplace_connections 
       WHERE user_id = $1 AND marketplace = $2`,
      [req.user.userId, req.params.marketplace]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Connection not found',
      });
    }

    // Не возвращаем секретные данные
    const connection = result.rows[0];
    res.json({
      success: true,
      data: connection,
    });
  } catch (error) {
    next(error);
  }
});

// Создать или обновить подключение
router.post('/', [
  body('marketplace').trim().notEmpty(),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        errors: errors.array(),
      });
    }

    const {
      marketplace,
      api_key,
      api_secret,
      client_id,
      client_secret,
      access_token,
      refresh_token,
      is_active,
      settings,
    } = req.body;

    // Проверяем существующее подключение
    const existing = await pool.query(
      'SELECT id FROM marketplace_connections WHERE user_id = $1 AND marketplace = $2',
      [req.user.userId, marketplace]
    );

    let result;
    if (existing.rows.length > 0) {
      // Обновляем существующее
      result = await pool.query(
        `UPDATE marketplace_connections 
         SET api_key = COALESCE($1, api_key),
             api_secret = COALESCE($2, api_secret),
             client_id = COALESCE($3, client_id),
             client_secret = COALESCE($4, client_secret),
             access_token = COALESCE($5, access_token),
             refresh_token = COALESCE($6, refresh_token),
             is_active = COALESCE($7, is_active),
             settings = COALESCE($8, settings),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $9 AND user_id = $10
         RETURNING id, marketplace, is_active, last_sync_at, created_at, updated_at`,
        [
          api_key || null,
          api_secret || null,
          client_id || null,
          client_secret || null,
          access_token || null,
          refresh_token || null,
          is_active !== undefined ? is_active : false,
          settings ? JSON.stringify(settings) : null,
          existing.rows[0].id,
          req.user.userId,
        ]
      );
    } else {
      // Создаем новое
      result = await pool.query(
        `INSERT INTO marketplace_connections 
         (user_id, marketplace, api_key, api_secret, client_id, client_secret, access_token, refresh_token, is_active, settings)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id, marketplace, is_active, last_sync_at, created_at, updated_at`,
        [
          req.user.userId,
          marketplace,
          api_key || null,
          api_secret || null,
          client_id || null,
          client_secret || null,
          access_token || null,
          refresh_token || null,
          is_active !== undefined ? is_active : false,
          settings ? JSON.stringify(settings) : null,
        ]
      );
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
});

// Тест подключения (синхронизация)
router.post('/:marketplace/sync', async (req, res, next) => {
  try {
    const { marketplace } = req.params;

    const connection = await pool.query(
      'SELECT * FROM marketplace_connections WHERE user_id = $1 AND marketplace = $2',
      [req.user.userId, marketplace]
    );

    if (connection.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Connection not found',
      });
    }

    const conn = connection.rows[0];

    if (!conn.is_active) {
      return res.status(400).json({
        success: false,
        error: 'Connection is not active',
      });
    }

    // Здесь будет логика синхронизации с маркетплейсом
    // Пока просто обновляем last_sync_at
    await pool.query(
      'UPDATE marketplace_connections SET last_sync_at = CURRENT_TIMESTAMP WHERE id = $1',
      [conn.id]
    );

    res.json({
      success: true,
      message: `Синхронизация с ${marketplace} запущена`,
      data: {
        marketplace,
        synced_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Удалить подключение
router.delete('/:marketplace', async (req, res, next) => {
  try {
    const result = await pool.query(
      'DELETE FROM marketplace_connections WHERE user_id = $1 AND marketplace = $2 RETURNING id',
      [req.user.userId, req.params.marketplace]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Connection not found',
      });
    }

    res.json({
      success: true,
      message: 'Connection deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

export default router;

