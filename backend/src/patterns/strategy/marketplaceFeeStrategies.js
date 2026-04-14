/**
 * Strategy — семейство алгоритмов оценки комиссии маркетплейса;
 * конкретная стратегия выбирается по полю marketplace объявления.
 * Упрощённые коэффициенты для демонстрации (не оферты площадок).
 */

/** @typedef {{ marketplaceKey: string }} MarketplaceFeeStrategy */

export class AvitoFeeStrategy {
  get marketplaceKey() {
    return 'avito';
  }

  /**
   * @param {number} salePrice
   * @returns {number}
   */
  estimateCommission(salePrice) {
    return Math.round(salePrice * 0.025 * 100) / 100;
  }
}

export class OzonFeeStrategy {
  get marketplaceKey() {
    return 'ozon';
  }

  estimateCommission(salePrice) {
    return Math.round(salePrice * 0.05 * 100) / 100;
  }
}

export class WildberriesFeeStrategy {
  get marketplaceKey() {
    return 'wildberries';
  }

  estimateCommission(salePrice) {
    return Math.round(salePrice * 0.15 * 100) / 100;
  }
}

export class YandexMarketFeeStrategy {
  get marketplaceKey() {
    return 'yandex_market';
  }

  estimateCommission(salePrice) {
    return Math.round(salePrice * 0.03 * 100) / 100;
  }
}

export class DefaultFeeStrategy {
  get marketplaceKey() {
    return 'default';
  }

  estimateCommission(salePrice) {
    return Math.round(salePrice * 0.05 * 100) / 100;
  }
}

const strategies = [
  new AvitoFeeStrategy(),
  new OzonFeeStrategy(),
  new WildberriesFeeStrategy(),
  new YandexMarketFeeStrategy(),
];

const byKey = new Map(strategies.map((s) => [s.marketplaceKey, s]));

const defaultStrategy = new DefaultFeeStrategy();

/**
 * Выбор стратегии по строке marketplace из БД.
 * @param {string} [marketplace]
 * @returns {AvitoFeeStrategy | OzonFeeStrategy | WildberriesFeeStrategy | YandexMarketFeeStrategy | DefaultFeeStrategy}
 */
export function resolveMarketplaceFeeStrategy(marketplace) {
  if (!marketplace || typeof marketplace !== 'string') {
    return defaultStrategy;
  }
  const key = marketplace.trim().toLowerCase();
  return byKey.get(key) ?? defaultStrategy;
}

/**
 * @param {string} [marketplace]
 * @param {number|string|null|undefined} salePrice
 */
export function estimateFeeForListing(marketplace, salePrice) {
  const price = typeof salePrice === 'number' ? salePrice : parseFloat(String(salePrice ?? 0));
  const safe = Number.isFinite(price) ? price : 0;
  const strategy = resolveMarketplaceFeeStrategy(marketplace);
  return {
    strategyKey: strategy.marketplaceKey,
    estimatedCommission: strategy.estimateCommission(safe),
  };
}
