import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MarketplaceLogo from '../components/common/MarketplaceLogo';

describe('MarketplaceLogo', () => {
  it('отображает изображение с корректным alt атрибутом', () => {
    render(<MarketplaceLogo marketplace="avito" />);
    expect(screen.getByRole('img')).toHaveAttribute('alt', 'avito');
  });

  it('использует logo Avito для "avito"', () => {
    render(<MarketplaceLogo marketplace="avito" />);
    expect(screen.getByRole('img')).toHaveAttribute('src', '/assets/avito.png');
  });

  it('использует logo Avito для "AVITO" (case-insensitive)', () => {
    render(<MarketplaceLogo marketplace="AVITO" />);
    expect(screen.getByRole('img')).toHaveAttribute('src', '/assets/avito.png');
  });

  it('использует logo Avito для строки содержащей "avito"', () => {
    render(<MarketplaceLogo marketplace="my-avito-shop" />);
    expect(screen.getByRole('img')).toHaveAttribute('src', '/assets/avito.png');
  });

  it('использует logo Ozon для "ozon"', () => {
    render(<MarketplaceLogo marketplace="ozon" />);
    expect(screen.getByRole('img')).toHaveAttribute('src', '/assets/ozon.png');
  });

  it('использует logo Ozon для "OZON"', () => {
    render(<MarketplaceLogo marketplace="OZON" />);
    expect(screen.getByRole('img')).toHaveAttribute('src', '/assets/ozon.png');
  });

  it('использует logo Wildberries для "wildberries"', () => {
    render(<MarketplaceLogo marketplace="wildberries" />);
    expect(screen.getByRole('img')).toHaveAttribute('src', '/assets/wb.png');
  });

  it('использует logo Wildberries для алиаса "wb"', () => {
    render(<MarketplaceLogo marketplace="wb" />);
    expect(screen.getByRole('img')).toHaveAttribute('src', '/assets/wb.png');
  });

  it('использует logo Wildberries для "WB" (case-insensitive)', () => {
    render(<MarketplaceLogo marketplace="WB" />);
    expect(screen.getByRole('img')).toHaveAttribute('src', '/assets/wb.png');
  });

  it('использует logo Yandex Market для "yandex"', () => {
    render(<MarketplaceLogo marketplace="yandex" />);
    expect(screen.getByRole('img')).toHaveAttribute('src', '/assets/ym.png');
  });

  it('использует logo Yandex Market для "market"', () => {
    render(<MarketplaceLogo marketplace="market" />);
    expect(screen.getByRole('img')).toHaveAttribute('src', '/assets/ym.png');
  });

  it('использует logo Yandex Market для "ym"', () => {
    render(<MarketplaceLogo marketplace="ym" />);
    expect(screen.getByRole('img')).toHaveAttribute('src', '/assets/ym.png');
  });

  it('использует Avito по умолчанию для неизвестного маркетплейса', () => {
    render(<MarketplaceLogo marketplace="unknown-platform" />);
    expect(screen.getByRole('img')).toHaveAttribute('src', '/assets/avito.png');
  });

  it('применяет переданный className', () => {
    render(<MarketplaceLogo marketplace="avito" className="w-10 h-10" />);
    const img = screen.getByRole('img');
    expect(img.className).toContain('w-10');
    expect(img.className).toContain('object-contain');
  });

  it('применяет className по умолчанию (пустая строка) + object-contain', () => {
    render(<MarketplaceLogo marketplace="avito" />);
    const img = screen.getByRole('img');
    expect(img.className).toContain('object-contain');
  });

  it('скрывает изображение при ошибке загрузки (onError)', () => {
    render(<MarketplaceLogo marketplace="avito" />);
    const img = screen.getByRole('img') as HTMLImageElement;
    fireEvent.error(img);
    expect(img.style.display).toBe('none');
  });
});
