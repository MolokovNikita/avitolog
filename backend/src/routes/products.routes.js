import express from 'express';
import { body, validationResult, query } from 'express-validator';
import pool from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { AppLogger } from '../patterns/singleton/AppLogger.js';

const router = express.Router();

router.use(authenticate);

// Получить список товаров
router.get('/', [
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('offset').optional().isInt({ min: 0 }),
  query('client_id').optional().isInt(),
], async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;
    const clientId = req.query.client_id;

    let query = `
      SELECT p.*, c.name as client_name
      FROM products p
      JOIN clients c ON p.client_id = c.id
      WHERE c.user_id = $1
    `;
    const params = [req.user.userId];
    let paramIndex = 2;

    if (clientId) {
      query += ` AND p.client_id = $${paramIndex}`;
      params.push(clientId);
      paramIndex++;
    }

    query += ` ORDER BY p.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    let countQuery = `
      SELECT COUNT(*) 
      FROM products p
      JOIN clients c ON p.client_id = c.id
      WHERE c.user_id = $1
    `;
    const countParams = [req.user.userId];
    if (clientId) {
      countQuery += ` AND p.client_id = $2`;
      countParams.push(clientId);
    }
    const countResult = await pool.query(countQuery, countParams);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].count),
        limit,
        offset,
      },
    });

    AppLogger.getInstance().audit(req.user.userId, 'products.list', {
      count: result.rows.length,
    });
  } catch (error) {
    next(error);
  }
});

// Получить товар по ID
router.get('/:id', async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT p.*, c.name as client_name, c.id as client_id
       FROM products p
       JOIN clients c ON p.client_id = c.id
       WHERE p.id = $1 AND c.user_id = $2`,
      [req.params.id, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Product not found',
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
});

// Создать товар
router.post('/', [
  body('name').trim().notEmpty(),
  body('client_id').isInt(),
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

    const { client_id, name, description, price, stock, sku, category, status } = req.body;

    // Проверка что клиент принадлежит пользователю
    const clientCheck = await pool.query(
      'SELECT id FROM clients WHERE id = $1 AND user_id = $2',
      [client_id, req.user.userId]
    );

    if (clientCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Client not found',
      });
    }

    const result = await pool.query(
      `INSERT INTO products (client_id, name, description, price, stock, sku, category, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [client_id, name, description || null, price || null, stock || 0, sku || null, category || null, status || 'active']
    );

    res.status(201).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
});

// Обновить товар
router.put('/:id', async (req, res, next) => {
  try {
    const { name, description, price, stock, sku, category, status } = req.body;

    const result = await pool.query(
      `UPDATE products p
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           price = COALESCE($3, price),
           stock = COALESCE($4, stock),
           sku = COALESCE($5, sku),
           category = COALESCE($6, category),
           status = COALESCE($7, status),
           updated_at = CURRENT_TIMESTAMP
       FROM clients c
       WHERE p.id = $8 AND p.client_id = c.id AND c.user_id = $9
       RETURNING p.*`,
      [name, description, price, stock, sku, category, status, req.params.id, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Product not found',
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
});

// Удалить товар
router.delete('/:id', async (req, res, next) => {
  try {
    const result = await pool.query(
      `DELETE FROM products p
       USING clients c
       WHERE p.id = $1 AND p.client_id = c.id AND c.user_id = $2
       RETURNING p.id`,
      [req.params.id, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Product not found',
      });
    }

    res.json({
      success: true,
      message: 'Product deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

export default router;

