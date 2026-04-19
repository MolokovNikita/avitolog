import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import jwt from 'jsonwebtoken';
import { authenticate } from '../middleware/auth.js';

const SECRET = 'test-secret';

// Хелпер для создания mock req/res/next
const makeMocks = (authHeader) => {
  const req = {
    headers: {
      authorization: authHeader,
    },
  };
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  const next = vi.fn();
  return { req, res, next };
};

describe('authenticate middleware', () => {
  let originalJwtSecret;

  beforeEach(() => {
    originalJwtSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = SECRET;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (originalJwtSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalJwtSecret;
  });

  it('вызывает next() при валидном JWT токене', () => {
    const token = jwt.sign({ userId: 1, email: 'test@test.com' }, SECRET);
    const { req, res, next } = makeMocks(`Bearer ${token}`);

    authenticate(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(req.user).toMatchObject({ userId: 1, email: 'test@test.com' });
    expect(res.status).not.toHaveBeenCalled();
  });

  it('возвращает 401 если заголовок Authorization отсутствует', () => {
    const { req, res, next } = makeMocks(undefined);

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Authentication required. No token provided.',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('возвращает 401 если токен в заголовке пустой (только "Bearer ")', () => {
    // split(' ')[1] вернёт undefined при "Bearer"
    const { req, res, next } = makeMocks('Bearer');

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Authentication required. No token provided.',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('возвращает 401 при невалидном токене', () => {
    const { req, res, next } = makeMocks('Bearer invalid.token.here');

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Invalid or expired token',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('возвращает 401 при просроченном токене', () => {
    const expiredToken = jwt.sign(
      { userId: 1, email: 'test@test.com' },
      SECRET,
      { expiresIn: '-1s' } // уже просрочен
    );
    const { req, res, next } = makeMocks(`Bearer ${expiredToken}`);

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Invalid or expired token',
    });
  });

  it('возвращает 401 при подписи другим секретом', () => {
    const tokenWithWrongSecret = jwt.sign({ userId: 1 }, 'wrong-secret');
    const { req, res, next } = makeMocks(`Bearer ${tokenWithWrongSecret}`);

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Invalid or expired token',
    });
  });

  it('декодированный payload попадает в req.user', () => {
    const payload = { userId: 99, email: 'admin@example.com', role: 'admin' };
    const token = jwt.sign(payload, SECRET);
    const { req, res, next } = makeMocks(`Bearer ${token}`);

    authenticate(req, res, next);

    expect(req.user.userId).toBe(99);
    expect(req.user.email).toBe('admin@example.com');
  });
});
