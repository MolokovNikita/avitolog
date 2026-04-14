/**
 * Singleton — один экземпляр логгера на процесс, глобальная точка доступа.
 * Используется для централизованного логирования и аудита действий пользователей.
 */
export class AppLogger {
  static #instance;

  constructor() {
    if (AppLogger.#instance) {
      throw new Error('AppLogger: используйте AppLogger.getInstance()');
    }
    AppLogger.#instance = this;
  }

  /**
   * @returns {AppLogger}
   */
  static getInstance() {
    if (!AppLogger.#instance) {
      new AppLogger();
    }
    return AppLogger.#instance;
  }

  /**
   * Аудит бизнес-действий (кто что сделал).
   * @param {number|string|null} userId
   * @param {string} action
   * @param {Record<string, unknown>} [meta]
   */
  audit(userId, action, meta = {}) {
    const line = {
      type: 'AUDIT',
      ts: new Date().toISOString(),
      userId: userId ?? null,
      action,
      ...meta,
    };
    // eslint-disable-next-line no-console
    console.log('[AUDIT]', JSON.stringify(line));
  }

  /**
   * @param {string} message
   * @param {Record<string, unknown>} [meta]
   */
  info(message, meta = {}) {
    // eslint-disable-next-line no-console
    console.log('[INFO]', message, Object.keys(meta).length ? meta : '');
  }

  /**
   * @param {string} message
   * @param {unknown} [err]
   */
  error(message, err) {
    // eslint-disable-next-line no-console
    console.error('[ERROR]', message, err !== undefined ? err : '');
  }
}
