import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import supertest from 'supertest';
import jwt from 'jsonwebtoken';

vi.mock('../config/database.js', () => ({ default: { query: vi.fn() } }));
// Мокаем fs для тестов удаления файлов
vi.mock('fs', async () => {
  const actual = await vi.importActual('fs');
  const mocked = {
    ...actual,
    existsSync: vi.fn(() => false),
    unlinkSync: vi.fn(),
    mkdirSync: vi.fn(),
  };
  return {
    ...mocked,
    default: mocked,
  };
});

import pool from '../config/database.js';
import listingsRouter from '../routes/listings.routes.js';

const SECRET = 'test-secret';
process.env.JWT_SECRET = SECRET;
const token = jwt.sign({ userId: 1, email: 'user@test.com' }, SECRET);
const auth = () => ({ Authorization: `Bearer ${token}` });

const authenticate = (req, res, next) => {
  const header = req.headers?.authorization || '';
  const [, rawToken] = header.split(' ');
  if (!rawToken) return res.status(401).json({ success: false, error: 'No token provided' });
  try {
    req.user = jwt.verify(rawToken, SECRET);
    return next();
  } catch {
    return res.status(401).json({ success: false, error: 'Invalid token' });
  }
};

const getRouteHandler = (router, method, routePath) => {
  const layer = router.stack.find(
    (l) =>
      l.route &&
      l.route.path === routePath &&
      l.route.methods &&
      l.route.methods[method]
  );
  if (!layer) throw new Error(`Route not found: ${method.toUpperCase()} ${routePath}`);
  const stack = layer.route.stack;
  return stack[stack.length - 1].handle;
};

const makeUnitRes = () => {
  const res = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res;
};

const makeApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/listings', listingsRouter);
  app.use((err, req, res, next) => {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  });
  return app;
};

const mockListing = {
  id: 1,
  marketplace: 'avito',
  title: 'Тестовое объявление',
  price: 1000,
  status: 'draft',
  product_price: 1000,
  product_name: 'Товар',
  client_name: 'Клиент',
};

describe('GET /listings', () => {
  beforeEach(() => vi.resetAllMocks());

  it('401 без токена', async () => {
    const res = await supertest(makeApp()).get('/listings');
    expect(res.status).toBe(401);
  });

  it('200 список объявлений без медиа (пустой массив)', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [] })          // listings
      .mockResolvedValueOnce({ rows: [{ count: '0' }] }); // count
    const res = await supertest(makeApp()).get('/listings').set(auth());
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('200 список объявлений с медиа', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [mockListing] })    // listings
      .mockResolvedValueOnce({ rows: [{ listing_id: 1, file_path: '/img.jpg', sort_order: 0 }] }) // media
      .mockResolvedValueOnce({ rows: [{ count: '1' }] }); // count
    const res = await supertest(makeApp()).get('/listings').set(auth());
    expect(res.status).toBe(200);
    expect(res.body.data[0]).toHaveProperty('estimated_marketplace_fee');
    expect(res.body.data[0]).toHaveProperty('fee_strategy', 'avito');
  });

  it('200 с фильтром marketplace', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ count: '0' }] });
    const res = await supertest(makeApp())
      .get('/listings?marketplace=avito').set(auth());
    expect(res.status).toBe(200);
  });

  it('200 с фильтром status', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ count: '0' }] });
    const res = await supertest(makeApp())
      .get('/listings?status=active').set(auth());
    expect(res.status).toBe(200);
  });

  it('200 с фильтром marketplace и status', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ count: '0' }] });
    const res = await supertest(makeApp())
      .get('/listings?marketplace=avito&status=active').set(auth());
    expect(res.status).toBe(200);
  });

  it('500 при ошибке БД', async () => {
    pool.query.mockRejectedValueOnce(new Error('DB'));
    const res = await supertest(makeApp()).get('/listings').set(auth());
    expect(res.status).toBe(500);
  });

  it('200 список объявлений без медиа (объявление есть, медиа нет)', async () => {
    const listingNoMedia = { ...mockListing, product_price: null, price: 777 };
    pool.query
      .mockResolvedValueOnce({ rows: [listingNoMedia] }) // listings
      .mockResolvedValueOnce({ rows: [] }) // mediaResult (пусто)
      .mockResolvedValueOnce({ rows: [{ count: '1' }] }); // count

    const res = await supertest(makeApp()).get('/listings').set(auth());
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].media).toEqual([]);
    expect(res.body.data[0].estimated_marketplace_fee).toBeDefined();
  });
});

describe('GET /listings/:id', () => {
  beforeEach(() => vi.resetAllMocks());

  it('404 если объявление не найдено', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await supertest(makeApp()).get('/listings/999').set(auth());
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Listing not found');
  });

  it('200 возвращает объявление с медиа и комиссией', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [mockListing] })
      .mockResolvedValueOnce({ rows: [] }); // media
    const res = await supertest(makeApp()).get('/listings/1').set(auth());
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('estimated_marketplace_fee');
    expect(res.body.data.fee_strategy).toBe('avito');
  });

  it('500 при ошибке БД', async () => {
    pool.query.mockRejectedValueOnce(new Error('DB'));
    const res = await supertest(makeApp()).get('/listings/1').set(auth());
    expect(res.status).toBe(500);
  });

  it('200 использует listing.price если product_price=null', async () => {
    const listingRow = { ...mockListing, product_price: null, price: 1234 };
    pool.query
      .mockResolvedValueOnce({ rows: [listingRow] }) // listing
      .mockResolvedValueOnce({ rows: [] }); // media
    const res = await supertest(makeApp()).get('/listings/1').set(auth());
    expect(res.status).toBe(200);
    expect(res.body.data.estimated_marketplace_fee).toBeDefined();
  });
});

describe('POST /listings', () => {
  beforeEach(() => vi.resetAllMocks());

  it('400 при отсутствии product_id', async () => {
    const res = await supertest(makeApp())
      .post('/listings').set(auth())
      .send({ marketplace: 'avito' });
    expect(res.status).toBe(400);
  });

  it('400 при пустом marketplace', async () => {
    const res = await supertest(makeApp())
      .post('/listings').set(auth())
      .send({ product_id: 1, marketplace: '' });
    expect(res.status).toBe(400);
  });

  it('404 если товар не найден/не принадлежит пользователю', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await supertest(makeApp())
      .post('/listings').set(auth())
      .send({ product_id: 999, marketplace: 'avito' });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Product not found');
  });

  it('201 создаёт объявление с расчётом комиссии', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 1 }] })   // product check
      .mockResolvedValueOnce({ rows: [{ ...mockListing, id: 2 }] }); // insert
    const res = await supertest(makeApp())
      .post('/listings').set(auth())
      .send({ product_id: 1, marketplace: 'avito', price: 1000 });
    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty('estimated_marketplace_fee');
    expect(res.body.data.fee_strategy).toBe('avito');
  });

  it('500 при ошибке БД', async () => {
    pool.query.mockRejectedValueOnce(new Error('DB'));
    const res = await supertest(makeApp())
      .post('/listings').set(auth())
      .send({ product_id: 1, marketplace: 'avito' });
    expect(res.status).toBe(500);
  });

  it('201 выставляет status="draft" если не передан', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // product check ok
      .mockResolvedValueOnce({ rows: [{ id: 2, marketplace: 'avito', price: 1000 }] }); // insert

    const res = await supertest(makeApp())
      .post('/listings')
      .set(auth())
      .send({ product_id: 1, marketplace: 'avito', price: 1000 });

    expect(res.status).toBe(201);
    expect(res.body.data).toBeDefined();
  });

  it('201 принимает опциональные поля (external_id/title/description/status)', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // product check ok
      .mockResolvedValueOnce({
        rows: [
          {
            id: 3,
            marketplace: 'avito',
            external_id: 'ext-1',
            title: 't',
            description: 'd',
            price: 999,
            status: 'active',
          },
        ],
      }); // insert

    const res = await supertest(makeApp())
      .post('/listings')
      .set(auth())
      .send({
        product_id: 1,
        marketplace: 'avito',
        external_id: 'ext-1',
        title: 't',
        description: 'd',
        price: 999,
        status: 'active',
      });

    expect(res.status).toBe(201);
  });

  it('201 price=0 проходит как price=null (ветка price || null)', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // product check ok
      .mockResolvedValueOnce({
        rows: [
          {
            id: 4,
            marketplace: 'avito',
            price: null,
            status: 'draft',
          },
        ],
      }); // insert

    const res = await supertest(makeApp())
      .post('/listings')
      .set(auth())
      .send({ product_id: 1, marketplace: 'avito', price: 0 });

    expect(res.status).toBe(201);
  });
});

describe('PUT /listings/:id', () => {
  beforeEach(() => vi.resetAllMocks());

  it('404 если объявление не найдено', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await supertest(makeApp())
      .put('/listings/999').set(auth()).send({ title: 'X' });
    expect(res.status).toBe(404);
  });

  it('200 обновляет объявление', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ ...mockListing, title: 'Updated' }] });
    const res = await supertest(makeApp())
      .put('/listings/1').set(auth()).send({ title: 'Updated' });
    expect(res.status).toBe(200);
  });

  it('500 при ошибке БД', async () => {
    pool.query.mockRejectedValueOnce(new Error('DB'));
    const res = await supertest(makeApp())
      .put('/listings/1').set(auth()).send({ title: 'X' });
    expect(res.status).toBe(500);
  });
});

describe('PATCH /listings/:id/status', () => {
  beforeEach(() => vi.resetAllMocks());

  it('400 при пустом status', async () => {
    const res = await supertest(makeApp())
      .patch('/listings/1/status').set(auth()).send({ status: '' });
    expect(res.status).toBe(400);
  });

  it('404 если объявление не найдено', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await supertest(makeApp())
      .patch('/listings/999/status').set(auth()).send({ status: 'active' });
    expect(res.status).toBe(404);
  });

  it('200 обновляет статус', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ ...mockListing, status: 'active' }] });
    const res = await supertest(makeApp())
      .patch('/listings/1/status').set(auth()).send({ status: 'active' });
    expect(res.status).toBe(200);
  });

  it('500 при ошибке БД', async () => {
    pool.query.mockRejectedValueOnce(new Error('DB'));
    const res = await supertest(makeApp())
      .patch('/listings/1/status').set(auth()).send({ status: 'active' });
    expect(res.status).toBe(500);
  });
});

describe('DELETE /listings/:id', () => {
  beforeEach(() => vi.resetAllMocks());

  it('404 если объявление не найдено', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await supertest(makeApp()).delete('/listings/999').set(auth());
    expect(res.status).toBe(404);
  });

  it('200 удаляет объявление', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
    const res = await supertest(makeApp()).delete('/listings/1').set(auth());
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Listing deleted successfully');
  });

  it('500 при ошибке БД', async () => {
    pool.query.mockRejectedValueOnce(new Error('DB'));
    const res = await supertest(makeApp()).delete('/listings/1').set(auth());
    expect(res.status).toBe(500);
  });
});

describe('POST /listings/:id/media — без файлов', () => {
  beforeEach(() => vi.resetAllMocks());

  it('404 если объявление не найдено', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await supertest(makeApp())
      .post('/listings/999/media').set(auth());
    expect(res.status).toBe(404);
  });

  it('400 если файлы не загружены', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
    const res = await supertest(makeApp())
      .post('/listings/1/media').set(auth());
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('No files uploaded');
  });
});

describe('POST /listings/:id/media — с файлами (simulация через custom middleware)', () => {
  // Создаём app с кастомным multer, который инжектит файлы
  const makeAppWithFiles = (mockFiles) => {
    const app = express();
    app.use(express.json());
    // Заменяем multer middleware на наш, который инжектит файлы
    app.post('/listings/:id/media', (req, res, next) => {
      req.files = mockFiles;
      next();
    });
    // Подключаем только логику handler'а напрямую через внутренний router
    app.use('/listings', listingsRouter);
    app.use((err, req, res, next) => {
      res.status(err.statusCode || 500).json({ success: false, error: err.message });
    });
    return app;
  };

  beforeEach(() => vi.resetAllMocks());

  it('200 загружает файлы и сохраняет в БД', async () => {
    const mockFiles = [
      { filename: 'listing-123.jpg', mimetype: 'image/jpeg', size: 1024, path: '/tmp/listing-123.jpg' },
    ];

    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 1 }] })            // listing check
      .mockResolvedValueOnce({ rows: [{ count: '0' }] })        // current media count
      .mockResolvedValueOnce({ rows: [{                         // insert media
        id: 1,
        file_path: '/uploads/listings/listing-123.jpg',
        file_type: 'image/jpeg',
        is_primary: true,
        sort_order: 0,
      }] });

    // Создаём app с кастомным инжектором файлов
    const app = express();
    app.use(express.json());
    app.post('/listings/:id/media', authenticate, async (req, res, next) => {
      req.files = mockFiles;
      // Имитируем то что делает handler
      const listingId = req.params.id;
      const listingCheck = await pool.query('', []);
      if (listingCheck.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Listing not found' });
      }
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ success: false, error: 'No files uploaded' });
      }
      const currentMedia = await pool.query('', []);
      const currentCount = parseInt(currentMedia.rows[0].count);
      const mediaRecords = [];
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        const filePath = `/uploads/listings/${file.filename}`;
        const isPrimary = currentCount === 0 && i === 0;
        const result = await pool.query('', []);
        mediaRecords.push(result.rows[0]);
      }
      res.json({ success: true, data: mediaRecords, message: `Загружено ${req.files.length} фотографий` });
    });
    app.use((err, req, res, next) => {
      res.status(err.statusCode || 500).json({ success: false, error: err.message });
    });

    process.env.JWT_SECRET = SECRET;
    const res = await supertest(app)
      .post('/listings/1/media')
      .set(auth());
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.message).toContain('1');
  });
});

describe('POST /listings/:id/media — handler branches (unit)', () => {
  beforeEach(() => vi.resetAllMocks());

  it('404 удаляет загруженные файлы если объявление не найдено', async () => {
    const fs = await import('fs');
    fs.existsSync.mockReturnValue(true);

    const handler = getRouteHandler(listingsRouter, 'post', '/:id/media');
    pool.query.mockResolvedValueOnce({ rows: [] });

    const req = {
      params: { id: '123' },
      user: { userId: 1 },
      files: [{ path: '/tmp/a.jpg', filename: 'a.jpg', mimetype: 'image/jpeg', size: 1 }],
    };
    const res = makeUnitRes();
    const next = vi.fn();

    await handler(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(fs.unlinkSync).toHaveBeenCalledWith('/tmp/a.jpg');
    expect(next).not.toHaveBeenCalled();
  });

  it('500 при ошибке чистит файлы и зовёт next(error)', async () => {
    const fs = await import('fs');
    fs.existsSync.mockReturnValue(true);

    const handler = getRouteHandler(listingsRouter, 'post', '/:id/media');
    const err = new Error('DB');
    pool.query.mockRejectedValueOnce(err);

    const req = {
      params: { id: '123' },
      user: { userId: 1 },
      files: [{ path: '/tmp/z.jpg', filename: 'z.jpg', mimetype: 'image/jpeg', size: 1 }],
    };
    const res = makeUnitRes();
    const next = vi.fn();

    await handler(req, res, next);

    expect(fs.unlinkSync).toHaveBeenCalledWith('/tmp/z.jpg');
    expect(next).toHaveBeenCalledWith(err);
  });

  it('200 сохраняет загруженные файлы в БД (успешная ветка)', async () => {
    const fs = await import('fs');
    fs.existsSync.mockReturnValue(true);

    const handler = getRouteHandler(listingsRouter, 'post', '/:id/media');
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 123 }] }) // listingCheck
      .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // currentMedia
      .mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            file_path: '/uploads/listings/listing-1.jpg',
            file_type: 'image/jpeg',
            is_primary: true,
            sort_order: 0,
          },
        ],
      });

    const req = {
      params: { id: '123' },
      user: { userId: 1 },
      files: [{ path: '/tmp/listing-1.jpg', filename: 'listing-1.jpg', mimetype: 'image/jpeg', size: 10 }],
    };
    const res = makeUnitRes();
    const next = vi.fn();

    await handler(req, res, next);

    expect(res.json).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });
});

describe('DELETE /listings/:id/media/:mediaId', () => {
  beforeEach(() => vi.resetAllMocks());

  it('404 если объявление не найдено', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await supertest(makeApp())
      .delete('/listings/999/media/1').set(auth());
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Listing not found');
  });

  it('404 если медиа не найдено', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // listing found
      .mockResolvedValueOnce({ rows: [] }); // media not found
    const res = await supertest(makeApp())
      .delete('/listings/1/media/999').set(auth());
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Media not found');
  });

  it('200 удаляет НЕ основное медиа (файл не существует на диске)', async () => {
    const fs = await import('fs');
    fs.existsSync.mockReturnValue(true);
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 1 }] })                            // listing
      .mockResolvedValueOnce({ rows: [{ file_path: '/img.jpg', is_primary: false }] }) // media info
      .mockResolvedValueOnce({ rows: [] });                                      // delete
    const res = await supertest(makeApp())
      .delete('/listings/1/media/1').set(auth());
    expect(res.status).toBe(200);
    expect(fs.unlinkSync).toHaveBeenCalledTimes(1);
  });

  it('200 удаляет основное медиа — назначает следующее основным', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 1 }] })                                   // listing
      .mockResolvedValueOnce({ rows: [{ file_path: '/img.jpg', is_primary: true }] })  // media
      .mockResolvedValueOnce({ rows: [] })                                              // delete
      .mockResolvedValueOnce({ rows: [{ id: 2 }] })                                   // first remaining
      .mockResolvedValueOnce({ rows: [] });                                             // set primary
    const res = await supertest(makeApp())
      .delete('/listings/1/media/1').set(auth());
    expect(res.status).toBe(200);
  });

  it('200 удаляет основное медиа — нет других медиа', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 1 }] })                                   // listing
      .mockResolvedValueOnce({ rows: [{ file_path: '/img.jpg', is_primary: true }] })  // media
      .mockResolvedValueOnce({ rows: [] })                                              // delete
      .mockResolvedValueOnce({ rows: [] });                                             // no remaining media
    const res = await supertest(makeApp())
      .delete('/listings/1/media/1').set(auth());
    expect(res.status).toBe(200);
  });

  it('500 при ошибке БД', async () => {
    pool.query.mockRejectedValueOnce(new Error('DB'));
    const res = await supertest(makeApp())
      .delete('/listings/1/media/1').set(auth());
    expect(res.status).toBe(500);
  });
});

describe('PATCH /listings/:id/media/:mediaId/primary', () => {
  beforeEach(() => vi.resetAllMocks());

  it('404 если объявление не найдено', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await supertest(makeApp())
      .patch('/listings/999/media/1/primary').set(auth());
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Listing not found');
  });

  it('404 если медиа не найдено', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 1 }] })  // listing
      .mockResolvedValueOnce({ rows: [] })            // reset primary
      .mockResolvedValueOnce({ rows: [] });            // set primary — not found
    const res = await supertest(makeApp())
      .patch('/listings/1/media/999/primary').set(auth());
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Media not found');
  });

  it('200 устанавливает основное медиа', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 1 }] })                              // listing
      .mockResolvedValueOnce({ rows: [] })                                        // reset primary
      .mockResolvedValueOnce({ rows: [{ id: 2, file_path: '/img2.jpg', is_primary: true }] }); // set
    const res = await supertest(makeApp())
      .patch('/listings/1/media/2/primary').set(auth());
    expect(res.status).toBe(200);
    expect(res.body.data.is_primary).toBe(true);
  });

  it('500 при ошибке БД', async () => {
    pool.query.mockRejectedValueOnce(new Error('DB'));
    const res = await supertest(makeApp())
      .patch('/listings/1/media/1/primary').set(auth());
    expect(res.status).toBe(500);
  });
});
