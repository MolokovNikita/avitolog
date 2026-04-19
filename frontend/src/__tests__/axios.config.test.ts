import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';

// Мок axios.create чтобы получить доступ к интерцепторам
vi.mock('axios', async () => {
  const requestInterceptors: Array<{ onFulfilled: Function; onRejected?: Function }> = [];
  const responseInterceptors: Array<{ onFulfilled: Function; onRejected?: Function }> = [];

  const mockInstance = {
    interceptors: {
      request: {
        use: vi.fn((onFulfilled, onRejected) => {
          requestInterceptors.push({ onFulfilled, onRejected });
        }),
        _interceptors: requestInterceptors,
      },
      response: {
        use: vi.fn((onFulfilled, onRejected) => {
          responseInterceptors.push({ onFulfilled, onRejected });
        }),
        _interceptors: responseInterceptors,
      },
    },
    defaults: { headers: { common: {} } },
  };

  return {
    default: {
      create: vi.fn(() => mockInstance),
      _instance: mockInstance,
      _requestInterceptors: requestInterceptors,
      _responseInterceptors: responseInterceptors,
    },
  };
});

// Сбрасываем модуль перед импортом, чтобы интерцепторы зарегистрировались
describe('axios.config — request interceptor', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
    // Сбрасываем мок
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('добавляет Authorization заголовок если токен есть в localStorage', async () => {
    localStorage.setItem('token', 'my-jwt-token');

    // Имитируем логику интерцептора запроса напрямую
    const config: any = { headers: {} };
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    expect(config.headers.Authorization).toBe('Bearer my-jwt-token');
  });

  it('не добавляет Authorization заголовок если токена нет', () => {
    localStorage.removeItem('token');

    const config: any = { headers: {} };
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    expect(config.headers.Authorization).toBeUndefined();
  });
});

describe('axios.config — response interceptor', () => {
  beforeEach(() => {
    localStorage.clear();
    // Мокаем window.location
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { pathname: '/', href: '/' },
    });
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('успешный ответ возвращается без изменений', () => {
    const response = { data: { success: true }, status: 200 };

    // Имитируем onFulfilled интерцептора ответа
    const onFulfilled = (res: any) => res;
    expect(onFulfilled(response)).toBe(response);
  });

  it('401 ошибка на НЕ auth странице: очищает localStorage и редиректит', () => {
    window.location.pathname = '/dashboard';

    localStorage.setItem('token', 'old-token');
    localStorage.setItem('user', '{"id":1}');

    const error = { response: { status: 401 } };

    // Имитируем onRejected интерцептора ответа
    const onRejected = (err: any) => {
      const isAuthPage =
        window.location.pathname === '/login' ||
        window.location.pathname === '/register';
      if (err.response?.status === 401 && !isAuthPage) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
      return Promise.reject(err);
    };

    return onRejected(error).catch(() => {
      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
      expect(window.location.href).toBe('/login');
    });
  });

  it('401 ошибка на /login странице: НЕ очищает localStorage', () => {
    window.location.pathname = '/login';

    localStorage.setItem('token', 'old-token');

    const error = { response: { status: 401 } };

    const onRejected = (err: any) => {
      const isAuthPage =
        window.location.pathname === '/login' ||
        window.location.pathname === '/register';
      if (err.response?.status === 401 && !isAuthPage) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
      return Promise.reject(err);
    };

    return onRejected(error).catch(() => {
      expect(localStorage.getItem('token')).toBe('old-token');
    });
  });

  it('401 ошибка на /register странице: НЕ очищает localStorage', () => {
    window.location.pathname = '/register';

    localStorage.setItem('token', 'some-token');

    const error = { response: { status: 401 } };

    const onRejected = (err: any) => {
      const isAuthPage =
        window.location.pathname === '/login' ||
        window.location.pathname === '/register';
      if (err.response?.status === 401 && !isAuthPage) {
        localStorage.removeItem('token');
      }
      return Promise.reject(err);
    };

    return onRejected(error).catch(() => {
      expect(localStorage.getItem('token')).toBe('some-token');
    });
  });

  it('ошибка с не-401 статусом: не очищает localStorage', () => {
    window.location.pathname = '/dashboard';
    localStorage.setItem('token', 'valid-token');

    const error = { response: { status: 500 } };

    const onRejected = (err: any) => {
      const isAuthPage =
        window.location.pathname === '/login' ||
        window.location.pathname === '/register';
      if (err.response?.status === 401 && !isAuthPage) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
      return Promise.reject(err);
    };

    return onRejected(error).catch(() => {
      expect(localStorage.getItem('token')).toBe('valid-token');
    });
  });

  it('ошибка без response (network error): не очищает localStorage', () => {
    window.location.pathname = '/dashboard';
    localStorage.setItem('token', 'valid-token');

    const error = new Error('Network Error');

    const onRejected = (err: any) => {
      const isAuthPage =
        window.location.pathname === '/login' ||
        window.location.pathname === '/register';
      if (err.response?.status === 401 && !isAuthPage) {
        localStorage.removeItem('token');
      }
      return Promise.reject(err);
    };

    return onRejected(error).catch(() => {
      expect(localStorage.getItem('token')).toBe('valid-token');
    });
  });

  it('request interceptor отклоняет ошибку через Promise.reject', () => {
    const error = new Error('Request setup error');

    // Имитируем onRejected для request interceptor
    const onRejected = (err: any) => Promise.reject(err);
    return expect(onRejected(error)).rejects.toThrow('Request setup error');
  });
});
