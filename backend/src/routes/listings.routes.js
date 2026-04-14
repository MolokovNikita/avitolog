import express from 'express';
import { body, validationResult, query } from 'express-validator';
import pool from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { AppLogger } from '../patterns/singleton/AppLogger.js';
import { estimateFeeForListing } from '../patterns/strategy/marketplaceFeeStrategies.js';
import { uploadListingImages } from '../middleware/upload.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

router.use(authenticate);

// Получить список объявлений
router.get('/', [
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('offset').optional().isInt({ min: 0 }),
  query('marketplace').optional().trim(),
  query('status').optional().trim(),
], async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;
    const { marketplace, status } = req.query;

    let query = `
      SELECT l.*, p.name as product_name, p.price as product_price, c.name as client_name
      FROM listings l
      JOIN products p ON l.product_id = p.id
      JOIN clients c ON p.client_id = c.id
      WHERE c.user_id = $1
    `;
    const params = [req.user.userId];
    let paramIndex = 2;

    if (marketplace) {
      query += ` AND l.marketplace = $${paramIndex}`;
      params.push(marketplace);
      paramIndex++;
    }

    if (status) {
      query += ` AND l.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    query += ` ORDER BY l.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Получаем фотографии для каждого объявления
    const listingIds = result.rows.map((r) => r.id);
    let listingsWithMedia = result.rows;

    if (listingIds.length > 0) {
      const mediaResult = await pool.query(
        `SELECT listing_id, id, file_path, file_type, is_primary, sort_order 
         FROM listing_media 
         WHERE listing_id = ANY($1::int[]) 
         ORDER BY listing_id, sort_order, id`,
        [listingIds]
      );

      // Группируем фотографии по listing_id
      const mediaByListing = {};
      mediaResult.rows.forEach((media) => {
        if (!mediaByListing[media.listing_id]) {
          mediaByListing[media.listing_id] = [];
        }
        mediaByListing[media.listing_id].push(media);
      });

      // Добавляем фотографии к объявлениям
      listingsWithMedia = result.rows.map((listing) => ({
        ...listing,
        media: mediaByListing[listing.id] || [],
      }));
    }

    listingsWithMedia = listingsWithMedia.map((listing) => {
      const fee = estimateFeeForListing(listing.marketplace, listing.product_price ?? listing.price);
      return {
        ...listing,
        estimated_marketplace_fee: fee.estimatedCommission,
        fee_strategy: fee.strategyKey,
      };
    });

    AppLogger.getInstance().audit(req.user.userId, 'listings.list', {
      count: listingsWithMedia.length,
    });

    const countQuery = `
      SELECT COUNT(*) 
      FROM listings l
      JOIN products p ON l.product_id = p.id
      JOIN clients c ON p.client_id = c.id
      WHERE c.user_id = $1
      ${marketplace ? `AND l.marketplace = $2` : ''}
      ${status ? `AND l.status = ${marketplace ? '$3' : '$2'}` : ''}
    `;
    const countParams = marketplace && status 
      ? [req.user.userId, marketplace, status]
      : marketplace || status 
        ? [req.user.userId, marketplace || status]
        : [req.user.userId];
    
    const countResult = await pool.query(countQuery, countParams);

    res.json({
      success: true,
      data: listingsWithMedia,
      pagination: {
        total: parseInt(countResult.rows[0].count),
        limit,
        offset,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Получить объявление по ID
router.get('/:id', async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT l.*, p.name as product_name, p.description as product_description,
              p.price as product_price, c.name as client_name, c.id as client_id
       FROM listings l
       JOIN products p ON l.product_id = p.id
       JOIN clients c ON p.client_id = c.id
       WHERE l.id = $1 AND c.user_id = $2`,
      [req.params.id, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Listing not found',
      });
    }

    // Получаем фотографии объявления
    const mediaResult = await pool.query(
      'SELECT id, file_path, file_type, is_primary, sort_order FROM listing_media WHERE listing_id = $1 ORDER BY sort_order, id',
      [req.params.id]
    );

    const listing = result.rows[0];
    listing.media = mediaResult.rows;

    const fee = estimateFeeForListing(listing.marketplace, listing.product_price ?? listing.price);
    listing.estimated_marketplace_fee = fee.estimatedCommission;
    listing.fee_strategy = fee.strategyKey;

    AppLogger.getInstance().audit(req.user.userId, 'listings.view', { listingId: listing.id });

    res.json({
      success: true,
      data: listing,
    });
  } catch (error) {
    next(error);
  }
});

// Создать объявление
router.post('/', [
  body('product_id').isInt(),
  body('marketplace').trim().notEmpty(),
  body('title').optional().trim(),
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

    const { product_id, marketplace, external_id, title, description, price, status } = req.body;

    // Проверка что товар принадлежит пользователю
    const productCheck = await pool.query(
      `SELECT p.id FROM products p
       JOIN clients c ON p.client_id = c.id
       WHERE p.id = $1 AND c.user_id = $2`,
      [product_id, req.user.userId]
    );

    if (productCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Product not found',
      });
    }

    const result = await pool.query(
      `INSERT INTO listings (product_id, marketplace, external_id, title, description, price, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [product_id, marketplace, external_id || null, title || null, description || null, price || null, status || 'draft']
    );

    const row = result.rows[0];
    const fee = estimateFeeForListing(row.marketplace, row.price);
    const data = {
      ...row,
      estimated_marketplace_fee: fee.estimatedCommission,
      fee_strategy: fee.strategyKey,
    };

    AppLogger.getInstance().audit(req.user.userId, 'listings.create', {
      listingId: row.id,
      marketplace: row.marketplace,
    });

    res.status(201).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
});

// Обновить объявление
router.put('/:id', async (req, res, next) => {
  try {
    const { title, description, price, status } = req.body;

    const result = await pool.query(
      `UPDATE listings l
       SET title = COALESCE($1, l.title),
           description = COALESCE($2, l.description),
           price = COALESCE($3, l.price),
           status = COALESCE($4, l.status),
           updated_at = CURRENT_TIMESTAMP
       FROM products p
       JOIN clients c ON p.client_id = c.id
       WHERE l.id = $5 AND l.product_id = p.id AND c.user_id = $6
       RETURNING l.*`,
      [title, description, price, status, req.params.id, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Listing not found',
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

// Изменить статус объявления
router.patch('/:id/status', [
  body('status').trim().notEmpty(),
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

    const { status } = req.body;

    const result = await pool.query(
      `UPDATE listings l
       SET status = $1, updated_at = CURRENT_TIMESTAMP
       FROM products p
       JOIN clients c ON p.client_id = c.id
       WHERE l.id = $2 AND l.product_id = p.id AND c.user_id = $3
       RETURNING l.*`,
      [status, req.params.id, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Listing not found',
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

// Удалить объявление
router.delete('/:id', async (req, res, next) => {
  try {
    const result = await pool.query(
      `DELETE FROM listings l
       USING products p
       JOIN clients c ON p.client_id = c.id
       WHERE l.id = $1 AND l.product_id = p.id AND c.user_id = $2
       RETURNING l.id`,
      [req.params.id, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Listing not found',
      });
    }

    res.json({
      success: true,
      message: 'Listing deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

// Загрузить фотографии для объявления
router.post('/:id/media', uploadListingImages.array('images', 10), async (req, res, next) => {
  try {
    const listingId = req.params.id;

    // Проверяем что объявление принадлежит пользователю
    const listingCheck = await pool.query(
      `SELECT l.id FROM listings l
       JOIN products p ON l.product_id = p.id
       JOIN clients c ON p.client_id = c.id
       WHERE l.id = $1 AND c.user_id = $2`,
      [listingId, req.user.userId]
    );

    if (listingCheck.rows.length === 0) {
      // Удаляем загруженные файлы если объявление не найдено
      if (req.files) {
        req.files.forEach((file) => {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        });
      }
      return res.status(404).json({
        success: false,
        error: 'Listing not found',
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files uploaded',
      });
    }

    // Получаем текущее количество фотографий
    const currentMedia = await pool.query(
      'SELECT COUNT(*) as count FROM listing_media WHERE listing_id = $1',
      [listingId]
    );
    const currentCount = parseInt(currentMedia.rows[0].count);

    // Сохраняем информацию о файлах в БД
    const mediaRecords = [];
    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      const filePath = `/uploads/listings/${path.basename(file.filename)}`;
      const isPrimary = currentCount === 0 && i === 0; // Первая фотография - основная

      const result = await pool.query(
        `INSERT INTO listing_media (listing_id, file_path, file_type, file_size, is_primary, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, file_path, file_type, is_primary, sort_order`,
        [
          listingId,
          filePath,
          file.mimetype,
          file.size,
          isPrimary,
          currentCount + i,
        ]
      );
      mediaRecords.push(result.rows[0]);
    }

    res.json({
      success: true,
      data: mediaRecords,
      message: `Загружено ${req.files.length} фотографий`,
    });
  } catch (error) {
    // Удаляем загруженные файлы при ошибке
    if (req.files) {
      req.files.forEach((file) => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }
    next(error);
  }
});

// Удалить фотографию объявления
router.delete('/:id/media/:mediaId', async (req, res, next) => {
  try {
    const { id: listingId, mediaId } = req.params;

    // Проверяем что объявление принадлежит пользователю
    const listingCheck = await pool.query(
      `SELECT l.id FROM listings l
       JOIN products p ON l.product_id = p.id
       JOIN clients c ON p.client_id = c.id
       WHERE l.id = $1 AND c.user_id = $2`,
      [listingId, req.user.userId]
    );

    if (listingCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Listing not found',
      });
    }

    // Получаем информацию о файле
    const mediaResult = await pool.query(
      'SELECT file_path, is_primary FROM listing_media WHERE id = $1 AND listing_id = $2',
      [mediaId, listingId]
    );

    if (mediaResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Media not found',
      });
    }

    const filePath = mediaResult.rows[0].file_path;
    const isPrimary = mediaResult.rows[0].is_primary;

    // Удаляем запись из БД
    await pool.query('DELETE FROM listing_media WHERE id = $1', [mediaId]);

    // Удаляем файл с диска
    const fullPath = path.join(__dirname, '../../', filePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }

    // Если удалили основную фотографию, делаем первую оставшуюся основной
    if (isPrimary) {
      const firstMedia = await pool.query(
        'SELECT id FROM listing_media WHERE listing_id = $1 ORDER BY sort_order, id LIMIT 1',
        [listingId]
      );
      if (firstMedia.rows.length > 0) {
        await pool.query(
          'UPDATE listing_media SET is_primary = true WHERE id = $1',
          [firstMedia.rows[0].id]
        );
      }
    }

    res.json({
      success: true,
      message: 'Фотография удалена',
    });
  } catch (error) {
    next(error);
  }
});

// Установить основную фотографию
router.patch('/:id/media/:mediaId/primary', async (req, res, next) => {
  try {
    const { id: listingId, mediaId } = req.params;

    // Проверяем что объявление принадлежит пользователю
    const listingCheck = await pool.query(
      `SELECT l.id FROM listings l
       JOIN products p ON l.product_id = p.id
       JOIN clients c ON p.client_id = c.id
       WHERE l.id = $1 AND c.user_id = $2`,
      [listingId, req.user.userId]
    );

    if (listingCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Listing not found',
      });
    }

    // Снимаем флаг is_primary со всех фотографий объявления
    await pool.query(
      'UPDATE listing_media SET is_primary = false WHERE listing_id = $1',
      [listingId]
    );

    // Устанавливаем новую основную фотографию
    const result = await pool.query(
      'UPDATE listing_media SET is_primary = true WHERE id = $1 AND listing_id = $2 RETURNING id, file_path, is_primary',
      [mediaId, listingId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Media not found',
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Основная фотография обновлена',
    });
  } catch (error) {
    next(error);
  }
});

export default router;

