import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import React from 'react';
import { AuthProvider, useAuth } from '../context/AuthContext';

// Мокаем axios инстанс
vi.mock('../api/axios.config', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  },
}));

import api from '../api/axios.config';

// Компонент-потребитель для тестирования контекста
const TestConsumer: React.FC = () => {
  const { user, isAuthenticated, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  return (
    <div>
      <span data-testid="authenticated">{String(isAuthenticated)}</span>
      <span data-testid="user">{user ? user.email : 'null'}</span>
    </div>
  );
};

const mockUser = {
  id: 1,
  email: 'test@example.com',
  full_name: 'Test User',
  role: 'user',
};

describe('AuthProvider', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('начальное состояние: loading=true, затем false, isAuthenticated=false без токена', async () => {
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { success: false },
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    // Ожидаем завершения загрузки
    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
    });
    expect(screen.getByTestId('user')).toHaveTextContent('null');
  });

  it('восстанавливает сессию из localStorage при наличии токена и данных пользователя', async () => {
    localStorage.setItem('token', 'valid-token');
    localStorage.setItem('user', JSON.stringify(mockUser));

    (api.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { success: true, data: mockUser },
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
    });
    expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
  });

  it('очищает localStorage при ошибке checkAuth (токен невалиден)', async () => {
    localStorage.setItem('token', 'bad-token');
    localStorage.setItem('user', JSON.stringify(mockUser));

    (api.get as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('401'));

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
    });
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('очищает localStorage при повреждённом JSON пользователя', async () => {
    localStorage.setItem('token', 'valid-token');
    localStorage.setItem('user', 'NOT_VALID_JSON');

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
    });
    expect(localStorage.getItem('token')).toBeNull();
  });
});

describe('useAuth — login()', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetAllMocks();
  });

  const LoginTest: React.FC<{ email: string; password: string }> = ({ email, password }) => {
    const { login, user, isAuthenticated } = useAuth();
    const [error, setError] = React.useState('');

    const handleLogin = async () => {
      try {
        await login(email, password);
      } catch (e: any) {
        setError(e.message);
      }
    };

    return (
      <div>
        <button onClick={handleLogin}>Login</button>
        <span data-testid="auth">{String(isAuthenticated)}</span>
        <span data-testid="email">{user?.email ?? ''}</span>
        <span data-testid="error">{error}</span>
      </div>
    );
  };

  it('успешный login сохраняет токен, пользователя в localStorage и обновляет состояние', async () => {
    (api.get as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('no token'));
    (api.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: {
        success: true,
        data: { user: mockUser, token: 'jwt-token-123' },
      },
    });

    render(
      <AuthProvider>
        <LoginTest email="test@example.com" password="pass123" />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId('auth')).toHaveTextContent('false'));

    await act(async () => {
      screen.getByRole('button').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('auth')).toHaveTextContent('true');
      expect(screen.getByTestId('email')).toHaveTextContent('test@example.com');
    });
    expect(localStorage.getItem('token')).toBe('jwt-token-123');
  });

  it('login при success=false бросает ошибку', async () => {
    (api.get as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('no token'));
    (api.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { success: false, error: 'Wrong credentials' },
    });

    render(
      <AuthProvider>
        <LoginTest email="bad@example.com" password="wrong" />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId('auth')).toHaveTextContent('false'));

    await act(async () => {
      screen.getByRole('button').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('Wrong credentials');
    });
  });

  it('login при success=false и без error использует "Login failed"', async () => {
    (api.get as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('no token'));
    (api.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { success: false },
    });

    render(
      <AuthProvider>
        <LoginTest email="bad@example.com" password="wrong" />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId('auth')).toHaveTextContent('false'));

    await act(async () => {
      screen.getByRole('button').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('Login failed');
    });
  });

  it('login при network ошибке бросает читаемое сообщение', async () => {
    (api.get as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('no token'));
    (api.post as ReturnType<typeof vi.fn>).mockRejectedValueOnce({
      response: { data: { error: 'Server unavailable' } },
    });

    render(
      <AuthProvider>
        <LoginTest email="t@t.com" password="p" />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId('auth')).toHaveTextContent('false'));

    await act(async () => {
      screen.getByRole('button').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('Server unavailable');
    });
  });

  it('login при неизвестной ошибке использует "Ошибка входа"', async () => {
    (api.get as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('no token'));
    (api.post as ReturnType<typeof vi.fn>).mockRejectedValueOnce({});

    render(
      <AuthProvider>
        <LoginTest email="t@t.com" password="p" />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId('auth')).toHaveTextContent('false'));

    await act(async () => {
      screen.getByRole('button').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('Ошибка входа');
    });
  });
});

describe('useAuth — register()', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetAllMocks();
  });

  const RegisterTest: React.FC = () => {
    const { register, isAuthenticated } = useAuth();
    const [error, setError] = React.useState('');

    const handleRegister = async () => {
      try {
        await register('new@example.com', 'password123', 'New User');
      } catch (e: any) {
        setError(e.message);
      }
    };

    return (
      <div>
        <button onClick={handleRegister}>Register</button>
        <span data-testid="auth">{String(isAuthenticated)}</span>
        <span data-testid="error">{error}</span>
      </div>
    );
  };

  it('успешная регистрация обновляет состояние и сохраняет данные', async () => {
    (api.get as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('no token'));
    (api.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: {
        success: true,
        data: { user: mockUser, token: 'reg-token' },
      },
    });

    render(
      <AuthProvider>
        <RegisterTest />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId('auth')).toHaveTextContent('false'));

    await act(async () => {
      screen.getByRole('button').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('auth')).toHaveTextContent('true');
    });
    expect(localStorage.getItem('token')).toBe('reg-token');
  });

  it('регистрация при success=false бросает ошибку', async () => {
    (api.get as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('no token'));
    (api.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { success: false },
    });

    render(
      <AuthProvider>
        <RegisterTest />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId('auth')).toHaveTextContent('false'));

    await act(async () => {
      screen.getByRole('button').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('Registration failed');
    });
  });
});

describe('useAuth — logout()', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetAllMocks();
  });

  const LogoutTest: React.FC = () => {
    const { logout, isAuthenticated } = useAuth();
    return (
      <div>
        <button onClick={logout}>Logout</button>
        <span data-testid="auth">{String(isAuthenticated)}</span>
      </div>
    );
  };

  it('logout очищает localStorage и сбрасывает состояние', async () => {
    localStorage.setItem('token', 'some-token');
    localStorage.setItem('user', JSON.stringify(mockUser));

    (api.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { success: true, data: mockUser },
    });

    render(
      <AuthProvider>
        <LogoutTest />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId('auth')).toHaveTextContent('true'));

    await act(async () => {
      screen.getByRole('button').click();
    });

    expect(screen.getByTestId('auth')).toHaveTextContent('false');
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });
});

describe('useAuth — вне провайдера', () => {
  it('useAuth бросает ошибку если используется вне AuthProvider', () => {
    const BadComponent: React.FC = () => {
      useAuth();
      return null;
    };

    // Подавляем console.error для этого теста
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<BadComponent />)).toThrow(
      'useAuth must be used within an AuthProvider'
    );
    spy.mockRestore();
  });
});
