import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { errorHandler, notFound } from '../middleware/errorHandler.js';

const makeMocks = () => {
  const req = { originalUrl: '/api/nonexistent' };
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  const next = vi.fn();
  return { req, res, next };
};

describe('errorHandler middleware', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('возвращает статус из err.statusCode если он задан', () => {
    const { req, res, next } = makeMocks();
    const err = new Error('Not Found');
    err.statusCode = 404;

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, error: 'Not Found' })
    );
  });

  it('возвращает 500 если err.statusCode не задан', () => {
    const { req, res, next } = makeMocks();
    const err = new Error('Database connection failed');

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('возвращает "Internal Server Error" если err.message пустой', () => {
    const { req, res, next } = makeMocks();
    const err = {};

    errorHandler(err, req, res, next);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Internal Server Error' })
    );
  });

  it('включает stack в ответ при NODE_ENV=development', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const { req, res, next } = makeMocks();
    const err = new Error('Dev error');
    err.stack = 'Error: Dev error\n    at ...';

    errorHandler(err, req, res, next);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ stack: err.stack })
    );

    process.env.NODE_ENV = originalEnv;
  });

  it('не включает stack в ответ при NODE_ENV=production', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const { req, res, next } = makeMocks();
    const err = new Error('Prod error');

    errorHandler(err, req, res, next);

    const jsonCall = res.json.mock.calls[0][0];
    expect(jsonCall).not.toHaveProperty('stack');

    process.env.NODE_ENV = originalEnv;
  });

  it('success всегда false в ответе', () => {
    const { req, res, next } = makeMocks();
    const err = new Error('Any error');

    errorHandler(err, req, res, next);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false })
    );
  });
});

describe('notFound middleware', () => {
  it('вызывает next() с ошибкой 404 содержащей URL', () => {
    const req = { originalUrl: '/api/ghost' };
    const res = {};
    const next = vi.fn();

    notFound(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toContain('/api/ghost');
    expect(err.statusCode).toBe(404);
  });

  it('сообщение об ошибке содержит "Not Found"', () => {
    const req = { originalUrl: '/some/path' };
    const next = vi.fn();

    notFound(req, {}, next);

    const err = next.mock.calls[0][0];
    expect(err.message).toMatch(/Not Found/i);
  });
});
