import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Product } from '../../types';

import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useApp } from '../../context/AppContext';
import { useSharedProducts } from '../../context/DataContext';
import { useGlobalSettings } from '../../hooks/useMarketing';

const FlashSaleSection: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { handleAddToCart } = useCart();
  const { setSelectedFilter, handleSelectProduct } = useApp();
  const { products: approvedProducts, loading: productsLoading } = useSharedProducts();
  const userRole = user?.role;
  const { setting: flashPinned } = useGlobalSettings('flash_pinned_products');
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: true });

  useEffect(() => {
    // Auto-resetting timer (e.g. daily at midnight)
    const updateTimer = () => {
      const now = new Date();
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      const diff = endOfDay.getTime() - now.getTime();
      
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: true });
        return;
      }
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
        expired: false
      });
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, []);

  const dynamicProducts = approvedProducts;
  // Use a Map to deduplicate products by ID
  const allProductsMap = new Map();
  dynamicProducts.forEach(p => {
    if (!allProductsMap.has(p.id)) {
      const price = Number(p.price) || 0;
      const originalPrice = Number(p.originalPrice) || Math.round(price * 1.2);
      const isSale = p.isSale === true || (p.isSale as unknown as string) === 'true';
      const rating = typeof p.rating === 'number' ? p.rating : (Number(p.rating) || 0);
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
  const allProducts = Array.from(allProductsMap.values());
  
  const nowTime = Date.now();
  type PinnedItem = string | { id: string; pinnedAt: string };
  const rawPinned: PinnedItem[] = (flashPinned as PinnedItem[]) || [];
  const pinnedIds: string[] = rawPinned.map((x: PinnedItem) =>
    typeof x === 'string' ? x : x.id
  ).filter((id: string) => {
    const item = rawPinned.find((x: PinnedItem) => (typeof x === 'string' ? x : x.id) === id);
    if (!item || typeof item === 'string') return true;
    return (nowTime - new Date(item.pinnedAt).getTime()) < 3 * 24 * 60 * 60 * 1000;
  });

  const pinnedProducts = pinnedIds.map(id => allProducts.find(p => p.id === id)).filter(Boolean) as typeof allProducts;

  const automatedFlash = allProducts
    .filter(p => (p as unknown as { dealType?: string }).dealType === 'flash')
    .filter(p => !pinnedIds.includes(p.id)) // Prevent duplicates if a pinned product is also automated
    .filter(p => {
      const isOutOfStock = (p.inStock as any) === false || (p.inStock as any) === 'false' || p.stockStatus === 'out_of_stock' || p.stockStatus === 'discontinued';
      return !isOutOfStock;
    })
    .sort((a, b) => {
      // Automated Deal Ranking: Highest discount % and highest reviews
      const discountA = (a.originalPrice - a.price) / a.originalPrice;
      const discountB = (b.originalPrice - b.price) / b.originalPrice;
      const scoreA = (discountA * 100) + ((a.reviewsCount || 0) * 0.1);
      const scoreB = (discountB * 100) + ((b.reviewsCount || 0) * 0.1);
      return scoreB - scoreA;
    });

  const flashProducts = [...automatedFlash, ...pinnedProducts]
    .filter((p, i, arr) => arr.findIndex(x => x.id === p.id) === i) // deduplicate
    .slice(0, 3);



  return (
    <section className="container mx-auto px-4">
      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-[3rem] p-8 lg:p-12 overflow-hidden relative group shadow-2xl">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-brand-600/10 blur-[120px] pointer-events-none"></div>

        <div className="relative z-10 flex flex-col lg:flex-row gap-8 items-center">
          <div className="lg:w-1/3 space-y-8">
            <div>
              <div
                className="inline-flex items-center gap-2 text-white text-[10px] font-black uppercase tracking-[0.3em] px-5 py-2 rounded-full mb-4"
                style={{ background: 'linear-gradient(135deg, #D97706 0%, #F59E0B 100%)' }}
              >
                <i className="fas fa-bolt"></i> Flash Deal
              </div>
              <h2 className="text-5xl font-black text-white tracking-tighter leading-tight mb-4">Flash Deals</h2>
              <p className="text-gray-300 font-medium text-base leading-relaxed">Limited-time offers — grab them before they're gone.</p>
            </div>

            <div className="flex items-center gap-4">
              {timeLeft.expired || flashProducts.length === 0 ? (
                <span className="text-white/60 font-black text-sm uppercase tracking-widest">No Active Deal</span>
              ) : (
                [
                  ...(timeLeft.days > 0 ? [{ label: 'Days', val: timeLeft.days }] : []),
                  { label: 'Hrs', val: timeLeft.hours },
                  { label: 'Min', val: timeLeft.minutes },
                  { label: 'Sec', val: timeLeft.seconds }
                ].map((t, i) => (
                  <div key={i} className="flex flex-col items-center bg-white/5 rounded-xl p-3 min-w-[60px]">
                    <div className="text-2xl font-black text-white mb-0.5">
                      {String(t.val).padStart(2, '0')}
                    </div>
                    <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">{t.label}</span>
                  </div>
                ))
              )}
            </div>

            {flashProducts.length > 0 && (
              <button onClick={() => navigate('/deals/flash')} className="w-full py-4 bg-white text-gray-900 rounded-xl font-black text-sm uppercase tracking-widest hover:bg-gray-100 transition-all shadow-lg">
                View All Deals
              </button>
            )}
          </div>

          <div className="lg:w-2/3">
            {productsLoading ? (
               <div className="h-full flex items-center justify-center py-12">
                 <div className="w-8 h-8 border-4 border-brand-400 border-t-transparent rounded-full animate-spin"></div>
               </div>
            ) : flashProducts.length === 0 ? (
              <div className="h-full flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="fas fa-bolt text-2xl text-white/20"></i>
                  </div>
                  <p className="text-white/40 font-black text-xs uppercase tracking-widest">No active flash deals</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {flashProducts.map((p) => {
                  const discount = Math.round((1 - p.price / p.originalPrice) * 100);
                  return (
                    <motion.div
                      key={p.id}
                      whileHover={{ y: -5 }}
                      className="bg-white/10 border border-white/10 rounded-[1.5rem] p-3 flex flex-col group/card shadow-lg hover:shadow-2xl transition-all duration-300"
                    >
                      <div className="relative aspect-square rounded-xl overflow-hidden bg-white/5 mb-3 cursor-pointer" onClick={() => handleSelectProduct(p)}>
                        <img src={p.image || 'https://via.placeholder.com/400x400?text=Product'} referrerPolicy="no-referrer" className="w-full h-full object-cover group-hover/card:scale-110 transition-transform duration-700" alt={p.name} />
                        <div className="absolute top-2 left-2 bg-red-600 text-white text-[8px] font-black uppercase px-2 py-0.5 rounded-full z-20 shadow-md">
                          -{discount}%
                        </div>
                      </div>
                      <h3 className="font-bold text-white mb-1 text-xs truncate cursor-pointer hover:text-brand-400 transition-colors" onClick={() => handleSelectProduct(p)}>{p.name}</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-white">৳{p.price.toLocaleString()}</span>
                        <span className="text-[10px] text-gray-400 line-through font-bold">৳{p.originalPrice.toLocaleString()}</span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default FlashSaleSection;
