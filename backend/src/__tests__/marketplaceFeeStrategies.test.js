import { describe, it, expect } from 'vitest';
import {
  AvitoFeeStrategy,
  OzonFeeStrategy,
  WildberriesFeeStrategy,
  YandexMarketFeeStrategy,
  DefaultFeeStrategy,
  resolveMarketplaceFeeStrategy,
  estimateFeeForListing,
} from '../patterns/strategy/marketplaceFeeStrategies.js';

// ─── Стратегии: marketplaceKey ────────────────────────────────────────────────

describe('AvitoFeeStrategy', () => {
  const strategy = new AvitoFeeStrategy();

  it('marketplaceKey === "avito"', () => {
    expect(strategy.marketplaceKey).toBe('avito');
  });

  it('комиссия 2.5% от цены', () => {
    expect(strategy.estimateCommission(1000)).toBe(25);
  });

  it('корректное округление до копеек', () => {
    expect(strategy.estimateCommission(333)).toBe(8.33);
  });

  it('комиссия от 0 = 0', () => {
    expect(strategy.estimateCommission(0)).toBe(0);
  });
});

describe('OzonFeeStrategy', () => {
  const strategy = new OzonFeeStrategy();

  it('marketplaceKey === "ozon"', () => {
    expect(strategy.marketplaceKey).toBe('ozon');
  });

  it('комиссия 5% от цены', () => {
    expect(strategy.estimateCommission(1000)).toBe(50);
  });

  it('корректное округление до копеек', () => {
    expect(strategy.estimateCommission(333)).toBe(16.65);
  });
});

describe('WildberriesFeeStrategy', () => {
  const strategy = new WildberriesFeeStrategy();

  it('marketplaceKey === "wildberries"', () => {
    expect(strategy.marketplaceKey).toBe('wildberries');
  });

  it('комиссия 15% от цены', () => {
    expect(strategy.estimateCommission(1000)).toBe(150);
  });

  it('корректное округление до копеек', () => {
    expect(strategy.estimateCommission(100)).toBe(15);
  });
});

describe('YandexMarketFeeStrategy', () => {
  const strategy = new YandexMarketFeeStrategy();

  it('marketplaceKey === "yandex_market"', () => {
    expect(strategy.marketplaceKey).toBe('yandex_market');
  });

  it('комиссия 3% от цены', () => {
    expect(strategy.estimateCommission(1000)).toBe(30);
  });

  it('корректное округление до копеек', () => {
    expect(strategy.estimateCommission(333)).toBe(9.99);
  });
});

describe('DefaultFeeStrategy', () => {
  const strategy = new DefaultFeeStrategy();

  it('marketplaceKey === "default"', () => {
    expect(strategy.marketplaceKey).toBe('default');
  });

  it('комиссия 5% от цены', () => {
    expect(strategy.estimateCommission(1000)).toBe(50);
  });
});

// ─── resolveMarketplaceFeeStrategy ───────────────────────────────────────────

describe('resolveMarketplaceFeeStrategy', () => {
  it('возвращает AvitoFeeStrategy для "avito"', () => {
    expect(resolveMarketplaceFeeStrategy('avito')).toBeInstanceOf(AvitoFeeStrategy);
  });

  it('возвращает OzonFeeStrategy для "ozon"', () => {
    expect(resolveMarketplaceFeeStrategy('ozon')).toBeInstanceOf(OzonFeeStrategy);
  });

  it('возвращает WildberriesFeeStrategy для "wildberries"', () => {
    expect(resolveMarketplaceFeeStrategy('wildberries')).toBeInstanceOf(WildberriesFeeStrategy);
  });

  it('возвращает YandexMarketFeeStrategy для "yandex_market"', () => {
    expect(resolveMarketplaceFeeStrategy('yandex_market')).toBeInstanceOf(YandexMarketFeeStrategy);
  });

  it('возвращает DefaultFeeStrategy для неизвестного маркетплейса', () => {
    expect(resolveMarketplaceFeeStrategy('unknown_market')).toBeInstanceOf(DefaultFeeStrategy);
  });

  it('нечувствителен к регистру: "AVITO" -> AvitoFeeStrategy', () => {
    expect(resolveMarketplaceFeeStrategy('AVITO')).toBeInstanceOf(AvitoFeeStrategy);
  });

  it('обрезает пробелы: "  ozon  " -> OzonFeeStrategy', () => {
    expect(resolveMarketplaceFeeStrategy('  ozon  ')).toBeInstanceOf(OzonFeeStrategy);
  });

  it('возвращает DefaultFeeStrategy при undefined', () => {
    expect(resolveMarketplaceFeeStrategy(undefined)).toBeInstanceOf(DefaultFeeStrategy);
  });

  it('возвращает DefaultFeeStrategy при null', () => {
    expect(resolveMarketplaceFeeStrategy(null)).toBeInstanceOf(DefaultFeeStrategy);
  });

  it('возвращает DefaultFeeStrategy при пустой строке ""', () => {
    expect(resolveMarketplaceFeeStrategy('')).toBeInstanceOf(DefaultFeeStrategy);
  });

  it('возвращает DefaultFeeStrategy при нечисловом типе (число 123)', () => {
    expect(resolveMarketplaceFeeStrategy(123)).toBeInstanceOf(DefaultFeeStrategy);
  });
});

// ─── estimateFeeForListing ────────────────────────────────────────────────────

describe('estimateFeeForListing', () => {
  it('возвращает strategyKey и estimatedCommission для avito', () => {
    const result = estimateFeeForListing('avito', 1000);
    expect(result).toEqual({ strategyKey: 'avito', estimatedCommission: 25 });
  });

  it('возвращает strategyKey и estimatedCommission для ozon', () => {
    const result = estimateFeeForListing('ozon', 2000);
    expect(result).toEqual({ strategyKey: 'ozon', estimatedCommission: 100 });
  });

  it('принимает цену в виде строки "500"', () => {
    const result = estimateFeeForListing('avito', '500');
    expect(result.estimatedCommission).toBe(12.5);
  });

  it('принимает цену null -> использует 0', () => {
    const result = estimateFeeForListing('avito', null);
    expect(result.estimatedCommission).toBe(0);
  });

  it('принимает цену undefined -> использует 0', () => {
    const result = estimateFeeForListing('avito', undefined);
    expect(result.estimatedCommission).toBe(0);
  });

  it('принимает нечисловую строку "abc" -> использует 0', () => {
    const result = estimateFeeForListing('avito', 'abc');
    expect(result.estimatedCommission).toBe(0);
  });

  it('использует DefaultFeeStrategy при неизвестном маркетплейсе', () => {
    const result = estimateFeeForListing('somemarket', 1000);
    expect(result.strategyKey).toBe('default');
    expect(result.estimatedCommission).toBe(50);
  });

  it('использует DefaultFeeStrategy при отсутствии маркетплейса', () => {
    const result = estimateFeeForListing(undefined, 1000);
    expect(result.strategyKey).toBe('default');
  });
});
