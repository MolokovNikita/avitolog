import express from 'express';
import { body, validationResult } from 'express-validator';
import pool from '../config/database.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

// Получить список постов
router.get('/', async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT * FROM content_posts WHERE user_id = $1 ORDER BY created_at DESC',
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

// Получить пост по ID
router.get('/:id', async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT * FROM content_posts WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Post not found',
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

// Создать пост
router.post('/', [
  body('content').trim().notEmpty(),
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

    const { title, content, media_urls, social_platform, status, scheduled_at } = req.body;

    const result = await pool.query(
      `INSERT INTO content_posts (user_id, title, content, media_urls, social_platform, status, scheduled_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        req.user.userId,
        title || null,
        content,
        media_urls || null,
        social_platform || null,
        status || 'draft',
        scheduled_at || null,
      ]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
});

// Обновить пост
router.put('/:id', async (req, res, next) => {
  try {
    const { title, content, media_urls, social_platform, status, scheduled_at } = req.body;

    const result = await pool.query(
      `UPDATE content_posts 
       SET title = COALESCE($1, title),
           content = COALESCE($2, content),
           media_urls = COALESCE($3, media_urls),
           social_platform = COALESCE($4, social_platform),
           status = COALESCE($5, status),
           scheduled_at = COALESCE($6, scheduled_at),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7 AND user_id = $8
       RETURNING *`,
      [title, content, media_urls, social_platform, status, scheduled_at, req.params.id, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Post not found',
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

// Удалить пост
router.delete('/:id', async (req, res, next) => {
  try {
    const result = await pool.query(
      'DELETE FROM content_posts WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Post not found',
      });
    }

    res.json({
      success: true,
      message: 'Post deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

export default router;

