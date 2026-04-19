import { describe, it, expect, vi, beforeEach } from 'vitest';

// Each test block uses dynamic import with resetModules to get a fresh singleton state
describe('AppLogger — Singleton Pattern', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('getInstance() создаёт новый экземпляр при первом вызове', async () => {
    const { AppLogger } = await import('../patterns/singleton/AppLogger.js');
    const instance = AppLogger.getInstance();
    expect(instance).toBeInstanceOf(AppLogger);
  });

  it('getInstance() возвращает тот же экземпляр при повторных вызовах', async () => {
    const { AppLogger } = await import('../patterns/singleton/AppLogger.js');
    const first = AppLogger.getInstance();
    const second = AppLogger.getInstance();
    expect(first).toBe(second);
  });

  it('прямой вызов конструктора выбрасывает ошибку после создания экземпляра', async () => {
    const { AppLogger } = await import('../patterns/singleton/AppLogger.js');
    AppLogger.getInstance(); // создаём экземпляр
    expect(() => new AppLogger()).toThrow('AppLogger: используйте AppLogger.getInstance()');
  });

  it('audit() логирует строку с типом AUDIT и userId', async () => {
    const { AppLogger } = await import('../patterns/singleton/AppLogger.js');
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    AppLogger.getInstance().audit(42, 'USER_LOGIN', { ip: '127.0.0.1' });
    expect(consoleSpy).toHaveBeenCalledWith(
      '[AUDIT]',
      expect.stringContaining('"type":"AUDIT"')
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      '[AUDIT]',
      expect.stringContaining('"userId":42')
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      '[AUDIT]',
      expect.stringContaining('"action":"USER_LOGIN"')
    );
    consoleSpy.mockRestore();
  });

  it('audit() корректно обрабатывает userId = null', async () => {
    const { AppLogger } = await import('../patterns/singleton/AppLogger.js');
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    AppLogger.getInstance().audit(null, 'ANONYMOUS_ACTION');
    expect(consoleSpy).toHaveBeenCalledWith(
      '[AUDIT]',
      expect.stringContaining('"userId":null')
    );
    consoleSpy.mockRestore();
  });

  it('audit() включает метаданные в лог', async () => {
    const { AppLogger } = await import('../patterns/singleton/AppLogger.js');
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    AppLogger.getInstance().audit(1, 'CREATE_LISTING', { listingId: 99 });
    expect(consoleSpy).toHaveBeenCalledWith(
      '[AUDIT]',
      expect.stringContaining('"listingId":99')
    );
    consoleSpy.mockRestore();
  });

  it('audit() работает без meta (используется значение по умолчанию {})', async () => {
    const { AppLogger } = await import('../patterns/singleton/AppLogger.js');
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    AppLogger.getInstance().audit(1, 'NO_META');
    expect(consoleSpy).toHaveBeenCalledWith(
      '[AUDIT]',
      expect.stringContaining('"action":"NO_META"')
    );
    consoleSpy.mockRestore();
  });

  it('info() логирует сообщение с объектом meta', async () => {
    const { AppLogger } = await import('../patterns/singleton/AppLogger.js');
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    AppLogger.getInstance().info('Сервер запущен', { port: 5001 });
    expect(consoleSpy).toHaveBeenCalledWith('[INFO]', 'Сервер запущен', { port: 5001 });
    consoleSpy.mockRestore();
  });

  it('info() логирует пустую строку вместо meta, если meta не передан', async () => {
    const { AppLogger } = await import('../patterns/singleton/AppLogger.js');
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    AppLogger.getInstance().info('Тест без meta');
    expect(consoleSpy).toHaveBeenCalledWith('[INFO]', 'Тест без meta', '');
    consoleSpy.mockRestore();
  });

  it('info() логирует пустую строку вместо meta, если передан пустой объект {}', async () => {
    const { AppLogger } = await import('../patterns/singleton/AppLogger.js');
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    AppLogger.getInstance().info('Пустой meta', {});
    expect(consoleSpy).toHaveBeenCalledWith('[INFO]', 'Пустой meta', '');
    consoleSpy.mockRestore();
  });

  it('error() логирует сообщение и объект ошибки', async () => {
    const { AppLogger } = await import('../patterns/singleton/AppLogger.js');
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const err = new Error('Тестовая ошибка');
    AppLogger.getInstance().error('Произошла ошибка', err);
    expect(consoleSpy).toHaveBeenCalledWith('[ERROR]', 'Произошла ошибка', err);
    consoleSpy.mockRestore();
  });

  it('error() логирует пустую строку если err не передан', async () => {
    const { AppLogger } = await import('../patterns/singleton/AppLogger.js');
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    AppLogger.getInstance().error('Ошибка без деталей');
    expect(consoleSpy).toHaveBeenCalledWith('[ERROR]', 'Ошибка без деталей', '');
    consoleSpy.mockRestore();
  });

  it('audit() содержит временну́ю метку ts в формате ISO', async () => {
    const { AppLogger } = await import('../patterns/singleton/AppLogger.js');
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    AppLogger.getInstance().audit(1, 'TS_CHECK');
    const logArg = consoleSpy.mock.calls[0][1];
    const parsed = JSON.parse(logArg);
    expect(parsed.ts).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    consoleSpy.mockRestore();
  });
});
