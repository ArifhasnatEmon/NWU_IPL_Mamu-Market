import React from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Product } from '../../types';

import ProductCard from '../../components/product/ProductCard';
import SkeletonCard from '../../components/ui/SkeletonCard';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import PageTitle from '../../components/PageTitle';
import { useApp } from '../../context/AppContext';
import { useSharedProducts } from '../../context/DataContext';

const DealsListingView: React.FC<{
  dealType: 'daily' | 'weekly' | 'monthly' | 'flash'
}> = ({ dealType }) => {
  const navigate = useNavigate();
  const { handleAddToCart } = useCart();
  const { wishlist, handleToggleWishlist, handleSelectProduct } = useApp();
  const { products: dynamicProducts } = useSharedProducts();
  const [timeLeft, setTimeLeft] = React.useState({ d: 0, h: 0, m: 0, s: 0, expired: true });

  const [isLoading, setIsLoading] = React.useState(true);
  React.useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(t);
  }, []);

  React.useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      let endTime = new Date();
      if (dealType === 'weekly') {
        const daysUntilSunday = 7 - now.getDay();
        endTime = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysUntilSunday, 23, 59, 59, 999);
      } else if (dealType === 'monthly') {
        endTime = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      } else {
        endTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      }
      
      const diff = endTime.getTime() - new Date().getTime();
      if (diff <= 0) { setTimeLeft({ d: 0, h: 0, m: 0, s: 0, expired: true }); return; }
      setTimeLeft({
        d: Math.floor(diff / (1000 * 60 * 60 * 24)),
        h: Math.floor((diff / (1000 * 60 * 60)) % 24),
        m: Math.floor((diff / (1000 * 60)) % 60),
        s: Math.floor((diff / 1000) % 60),
        expired: false
      });
    };
    
    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [dealType]);

  const getTitle = () => {
    switch (dealType) {
      case 'daily':
      case 'flash': return 'Flash & Daily Deals';
      case 'weekly': return 'Weekly Mega Deals';
      case 'monthly': return 'Monthly Super Sale';
      default: return 'Special Deals';
    }
  };

  const getSubtitle = () => {
    switch (dealType) {
      case 'daily':
      case 'flash': return 'Extreme discounts for a limited time. Blink and you will miss it!';
      case 'weekly': return 'Our biggest weekly savings on top-rated products.';
      case 'monthly': return 'The ultimate monthly clearance event. Unbeatable prices.';
      default: return 'Handpicked offers just for you.';
    }
  };

  const getIcon = () => {
    switch (dealType) {
      case 'daily': return 'fa-bolt';
      case 'weekly': return 'fa-calendar-week';
      case 'monthly': return 'fa-calendar-alt';
      case 'flash': return 'fa-fire';
      default: return 'fa-tag';
    }
  };

  const getColor = () => {
    switch (dealType) {
      case 'daily':
      case 'flash': return 'text-amber-600 bg-amber-50';
      case 'weekly': return 'text-indigo-600 bg-indigo-50';
      case 'monthly': return 'text-emerald-600 bg-emerald-50';
      default: return 'text-brand-600 bg-brand-50';
    }
  };

  // Filter deals and deduplicate
  const allProductsMap = new Map();
  dynamicProducts.forEach(p => {
    if (!allProductsMap.has(p.id)) {
      const price = parseFloat(p.price as any) || 0;
      const originalPrice = parseFloat(p.originalPrice as any) || Math.round(price * 1.2);
      const isSale = p.isSale === true || p.isSale === ('true' as any);
      const rating = typeof p.rating === 'number' ? p.rating : (parseFloat(p.rating as any) || 0);
      allProductsMap.set(p.id, {
        ...p,
        price,
        originalPrice,
        isSale,
        dealType: p.dealType || (isSale ? 'flash' : 'none'),
        rating,
        reviewsCount: p.reviewsCount || 0,
        image: p.image || p.mainImage || '',
        name: p.productName || p.name || '',
      });
    }
  });
  
  // Convert map to array and filter out out-of-stock items
  const allProducts = Array.from(allProductsMap.values()).filter(p => {
    const isOutOfStock = (p.inStock as any) === false || (p.inStock as any) === 'false' || p.stockStatus === 'out_of_stock' || p.stockStatus === 'discontinued';
    return !isOutOfStock;
  });
  let displayProducts: Product[] = [];

  if (dealType === 'daily' || dealType === 'flash') {
    // Flash/Daily rules
    displayProducts = allProducts.filter(p => {
      const dt = p.dealType;
      if (dt === 'flash' || dt === 'daily') return true;
      // Backwards compat
      if ((p.isSale === true) && (!dt || dt === 'none' || dt === undefined)) return true;
      return false;
    });
  } else if (dealType === 'weekly') {
    // Weekly rules
    displayProducts = allProducts.filter(p => (p as any).dealType === 'weekly');
  } else if (dealType === 'monthly') {
    // Monthly rules
    displayProducts = allProducts.filter(p => (p as any).dealType === 'monthly');
  } else {
    displayProducts = allProducts.filter(p => p.isSale === true);
  }

  // Inject sponsors
  // Sponsor keys
  displayProducts = [
    ...displayProducts
  ];

  return (
    <div className="container mx-auto px-4 py-12">
      <PageTitle title={getTitle()} />
      {/* Header */}
      <div className="mb-12">
        <button
          onClick={() => navigate('/deals')}
          className="flex items-center gap-2 text-gray-400 hover:text-brand-600 transition-colors mb-6 group"
        >
          <i className="fas fa-arrow-left text-xs group-hover:-translate-x-1 transition-transform"></i>
          <span className="text-[10px] font-black uppercase tracking-widest">Back to All Deals</span>
        </button>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="max-w-xl">
            <div className={`inline-flex items-center gap-3 ${getColor()} px-5 py-1.5 rounded-full mb-4 border border-current/10`}>
              <i className={`fas ${getIcon()} text-xs`}></i>
              <span className="text-[9px] font-black uppercase tracking-[0.2em]">
                {dealType === 'flash' || dealType === 'daily' ? 'Limited' : dealType} Offer
              </span>
            </div>
            <h1 className="text-4xl lg:text-5xl font-black text-gray-900 mb-4 tracking-tighter leading-tight">{getTitle()}</h1>
            <p className="text-base text-gray-500 font-medium leading-relaxed">{getSubtitle()}</p>
          </div>

          {/* Simple Timer */}
          <div className="flex items-center gap-6">
            {timeLeft.expired ? (
              <span className="text-sm font-black text-red-500">No Active Deal</span>
            ) : (
              <>
                {timeLeft.d > 0 && (
                  <>
                    <div className="text-center">
                      <div className="text-2xl font-black tabular-nums text-gray-900">{String(timeLeft.d).padStart(2, '0')}</div>
                      <div className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter">Days</div>
                    </div>
                    <div className="text-gray-300 text-xl font-black mb-4">:</div>
                  </>
                )}
                <div className="text-center">
                  <div className="text-2xl font-black tabular-nums text-gray-900">{String(timeLeft.h).padStart(2, '0')}</div>
                  <div className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter">Hrs</div>
                </div>
                <div className="text-gray-300 text-xl font-black mb-4">:</div>
                <div className="text-center">
                  <div className="text-2xl font-black tabular-nums text-gray-900">{String(timeLeft.m).padStart(2, '0')}</div>
                  <div className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter">Min</div>
                </div>
                <div className="text-gray-300 text-xl font-black mb-4">:</div>
                <div className="text-center">
                  <div className="text-2xl font-black tabular-nums text-gray-900">{String(timeLeft.s).padStart(2, '0')}</div>
                  <div className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter">Sec</div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Products Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-8">
          {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : displayProducts.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-8">
          {displayProducts.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              onAddToCart={handleAddToCart}
              onSelect={() => handleSelectProduct(p)}
              onToggleWishlist={handleToggleWishlist}
              isWishlisted={wishlist.includes(p.id)}
            />
          ))}
        </div>
      ) : (
        <div className="py-32 text-center bg-gray-50 rounded-[4rem] border-2 border-dashed border-gray-100">
          <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-8 shadow-sm">
            <i className="fas fa-box-open text-4xl text-gray-200"></i>
          </div>
          <h3 className="text-2xl font-black text-gray-900 mb-3">No deals available right now</h3>
          <p className="text-gray-500 font-medium max-w-xs mx-auto">Check back soon for fresh discounts and limited time offers!</p>
        </div>
      )}
    </div>
  );
};

export default DealsListingView;
