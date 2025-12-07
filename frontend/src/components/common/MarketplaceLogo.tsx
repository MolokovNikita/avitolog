import React from 'react';

interface MarketplaceLogoProps {
  marketplace: string;
  className?: string;
}

const MarketplaceLogo: React.FC<MarketplaceLogoProps> = ({ marketplace, className = '' }) => {
  const getLogoPath = (marketplace: string): string => {
    const marketplaceLower = marketplace.toLowerCase();
    
    if (marketplaceLower.includes('avito')) {
      return '/assets/avito.png';
    } else if (marketplaceLower.includes('ozon')) {
      return '/assets/ozon.png';
    } else if (marketplaceLower.includes('wildberries') || marketplaceLower.includes('wb')) {
      return '/assets/wb.png';
    } else if (marketplaceLower.includes('yandex') || marketplaceLower.includes('market') || marketplaceLower.includes('ym')) {
      return '/assets/ym.png';
    }
    
    return '/assets/avito.png'; // default
  };

  return (
    <img
      src={getLogoPath(marketplace)}
      alt={marketplace}
      className={`${className} object-contain`}
      onError={(e) => {
        // Fallback если изображение не загрузилось
        (e.target as HTMLImageElement).style.display = 'none';
      }}
    />
  );
};

export default MarketplaceLogo;

