import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

// Мокаем BrowserRouter чтобы избежать двойного Router при тестировании
// (App сам оборачивает в BrowserRouter, а мы передаём MemoryRouter снаружи)
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom') as Record<string, unknown>;
  return {
    ...actual,
    // Заменяем BrowserRouter пустым контейнером
    BrowserRouter: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

// Мокаем AuthContext
vi.mock('../context/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: vi.fn(),
}));

// Мокаем все страницы
vi.mock('../pages/auth/Login', () => ({
  default: () => <div data-testid="login-page">Login Page</div>,
}));
vi.mock('../pages/auth/Register', () => ({
  default: () => <div data-testid="register-page">Register Page</div>,
}));
vi.mock('../pages/dashboard/Dashboard', () => ({
  default: () => <div data-testid="dashboard-page">Dashboard</div>,
}));
vi.mock('../pages/listings/ListingsList', () => ({
  default: () => <div data-testid="listings-page">Listings</div>,
}));
vi.mock('../pages/clients/ClientsList', () => ({
  default: () => <div data-testid="clients-page">Clients</div>,
}));
vi.mock('../pages/products/ProductsList', () => ({
  default: () => <div data-testid="products-page">Products</div>,
}));
vi.mock('../pages/services/ServicesList', () => ({
  default: () => <div data-testid="services-page">Services</div>,
}));
vi.mock('../pages/content/PostsList', () => ({
  default: () => <div data-testid="posts-page">Posts</div>,
}));
vi.mock('../pages/settings/MarketplaceSettings', () => ({
  default: () => <div data-testid="settings-page">Settings</div>,
}));
vi.mock('../components/layout/Layout', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="layout">{children}</div>
  ),
}));

import { useAuth } from '../context/AuthContext';
import App from '../App';

const renderAtPath = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>
  );

describe('App — ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('показывает "Загрузка..." пока loading=true (защищённый маршрут "/")', async () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      isAuthenticated: false,
      loading: true,
    });

    renderAtPath('/');

    await waitFor(() => {
      expect(screen.getAllByText('Загрузка...').length).toBeGreaterThan(0);
    });
  });

  it('неаутентифицированный пользователь редиректится с "/" на "/login"', async () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      isAuthenticated: false,
      loading: false,
    });

    renderAtPath('/');

    await waitFor(() => {
      expect(screen.getByTestId('login-page')).toBeInTheDocument();
    });
  });

  it('аутентифицированный пользователь видит Dashboard на "/"', async () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      isAuthenticated: true,
      loading: false,
    });

    renderAtPath('/');

    await waitFor(() => {
      expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
    });
  });

  it('аутентифицированный пользователь видит listings на "/listings"', async () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      isAuthenticated: true,
      loading: false,
    });

    renderAtPath('/listings');

    await waitFor(() => {
      expect(screen.getByTestId('listings-page')).toBeInTheDocument();
    });
  });

  it('аутентифицированный пользователь видит clients на "/clients"', async () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      isAuthenticated: true,
      loading: false,
    });

    renderAtPath('/clients');

    await waitFor(() => {
      expect(screen.getByTestId('clients-page')).toBeInTheDocument();
    });
  });

  it('аутентифицированный пользователь видит products на "/products"', async () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      isAuthenticated: true,
      loading: false,
    });

    renderAtPath('/products');

    await waitFor(() => {
      expect(screen.getByTestId('products-page')).toBeInTheDocument();
    });
  });

  it('аутентифицированный пользователь видит services на "/services"', async () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      isAuthenticated: true,
      loading: false,
    });

    renderAtPath('/services');

    await waitFor(() => {
      expect(screen.getByTestId('services-page')).toBeInTheDocument();
    });
  });

  it('аутентифицированный пользователь видит content на "/content"', async () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      isAuthenticated: true,
      loading: false,
    });

    renderAtPath('/content');

    await waitFor(() => {
      expect(screen.getByTestId('posts-page')).toBeInTheDocument();
    });
  });

  it('аутентифицированный пользователь видит settings на "/settings"', async () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      isAuthenticated: true,
      loading: false,
    });

    renderAtPath('/settings');

    await waitFor(() => {
      expect(screen.getByTestId('settings-page')).toBeInTheDocument();
    });
  });
});

describe('App — PublicRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('показывает "Загрузка..." пока loading=true (публичный маршрут "/login")', async () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      isAuthenticated: false,
      loading: true,
    });

    renderAtPath('/login');

    await waitFor(() => {
      expect(screen.getAllByText('Загрузка...').length).toBeGreaterThan(0);
    });
  });

  it('неаутентифицированный пользователь видит Login на "/login"', async () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      isAuthenticated: false,
      loading: false,
    });

    renderAtPath('/login');

    await waitFor(() => {
      expect(screen.getByTestId('login-page')).toBeInTheDocument();
    });
  });

  it('аутентифицированный пользователь редиректится с "/login" на "/"', async () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      isAuthenticated: true,
      loading: false,
    });

    renderAtPath('/login');

    await waitFor(() => {
      expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
    });
  });

  it('неаутентифицированный пользователь видит Register на "/register"', async () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      isAuthenticated: false,
      loading: false,
    });

    renderAtPath('/register');

    await waitFor(() => {
      expect(screen.getByTestId('register-page')).toBeInTheDocument();
    });
  });

  it('аутентифицированный пользователь редиректится с "/register" на "/"', async () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      isAuthenticated: true,
      loading: false,
    });

    renderAtPath('/register');

    await waitFor(() => {
      expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
    });
  });

  it('неизвестный маршрут редиректится на "/" (и далее зависит от auth)', async () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      isAuthenticated: true,
      loading: false,
    });

    renderAtPath('/nonexistent-route');

    await waitFor(() => {
      expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
    });
  });

  it('загрузка на /register показывает "Загрузка..."', async () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      isAuthenticated: false,
      loading: true,
    });

    renderAtPath('/register');

    await waitFor(() => {
      expect(screen.getAllByText('Загрузка...').length).toBeGreaterThan(0);
    });
  });
});
