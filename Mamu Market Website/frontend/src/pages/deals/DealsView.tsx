import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Product } from '../../types';

import ProductCard from '../../components/product/ProductCard';
import { useCart } from '../../context/CartContext';
import { useApp } from '../../context/AppContext';
import { useSharedProducts } from '../../context/DataContext';
import PageTitle from '../../components/PageTitle';


const DealsView: React.FC = () => {
  const navigate = useNavigate();
  const { handleAddToCart } = useCart();
  const { wishlist, handleToggleWishlist, handleSelectProduct } = useApp();
  const { products: approvedProducts, loading: productsLoading } = useSharedProducts();

  const onSelectDealType = (type: string) => {
    navigate(`/deals/${type}`);
    window.scrollTo(0, 0);
  };

  const [dailyTime, setDailyTime] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: true });
  const [weeklyTime, setWeeklyTime] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: true });
  const [monthlyTime, setMonthlyTime] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: true });

  useEffect(() => {
    const updateTimers = () => {
      const calcTime = (endTime: Date) => {
        const diff = endTime.getTime() - Date.now();
        if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
        return {
          days: Math.floor(diff / (1000 * 60 * 60 * 24)),
          hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((diff % (1000 * 60)) / 1000),
          expired: false
        };
      };

      const now = new Date();
      
      const endOfDaily = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      
      const daysUntilSunday = 7 - now.getDay();
      const endOfWeekly = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysUntilSunday, 23, 59, 59, 999);
      
      const endOfMonthly = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

      setDailyTime(calcTime(endOfDaily));
      setWeeklyTime(calcTime(endOfWeekly));
      setMonthlyTime(calcTime(endOfMonthly));
    };

    updateTimers();
    const timer = setInterval(updateTimers, 1000);
    return () => clearInterval(timer);
  }, []);

  const quickDeals = [
    { id: 'flash', label: 'Flash Deals', icon: 'fa-bolt', color: 'text-amber-500', bg: 'bg-amber-50', sectionId: 'daily' },
    { id: 'weekly', label: 'Weekly Deals', icon: 'fa-calendar-week', color: 'text-indigo-500', bg: 'bg-indigo-50', sectionId: 'weekly' },
    { id: 'monthly', label: 'Monthly Sale', icon: 'fa-calendar-alt', color: 'text-emerald-500', bg: 'bg-emerald-50', sectionId: 'monthly' },
    { id: 'all', label: 'All Deals', icon: 'fa-tags', color: 'text-rose-500', bg: 'bg-rose-50', path: '/products?filter=deals' }
  ];

  const dealSections = [
    {
      id: 'daily',
      name: 'Daily Flash Deals',
      duration: dailyTime.expired ? 'No Active Deal' : `${dailyTime.hours}h ${dailyTime.minutes}m ${dailyTime.seconds}s`,
      color: 'bg-rose-500',
      icon: 'fa-bolt',
      timer: dailyTime,
      type: 'daily' as const
    },
    {
      id: 'weekly',
      name: 'Weekly Mega Deals',
      duration: weeklyTime.expired ? 'No Active Deal' : `${weeklyTime.days}d ${weeklyTime.hours}h ${weeklyTime.minutes}m`,
      color: 'bg-indigo-500',
      icon: 'fa-calendar-week',
      timer: weeklyTime,
      type: 'weekly' as const
    },
    {
      id: 'monthly',
      name: 'Monthly Super Sale',
      duration: monthlyTime.expired ? 'No Active Deal' : `${monthlyTime.days}d ${monthlyTime.hours}h ${monthlyTime.minutes}m`,
      color: 'bg-emerald-500',
      icon: 'fa-calendar-alt',
      timer: monthlyTime,
      type: 'monthly' as const
    }
  ];

  const now = Date.now();
  const dynamicApproved = approvedProducts.map((p: Product) => ({
    ...p,
    name: p.productName || p.name || '',
    image: p.image || p.mainImage || '',
    price: parseFloat(p.price as any) || 0,
    originalPrice: parseFloat(p.originalPrice as any) || parseFloat(p.price as any) || 0,
    isSale: p.isSale === true || p.isSale === ('true' as any),
    dealType: (p as any).dealType || 'none',
    rating: typeof p.rating === 'number' ? p.rating : (parseFloat(p.rating as any) || 0),
    reviewsCount: p.reviewsCount || 0,
  }));
  const allProducts = dynamicApproved.filter((p: Product) => {
    const isOutOfStock = (p.inStock as any) === false || (p.inStock as any) === 'false' || p.stockStatus === 'out_of_stock' || p.stockStatus === 'discontinued';
    return !isOutOfStock;
  });

  const getDealProducts = (type: 'daily' | 'weekly' | 'monthly') => {
    const regular = allProducts.filter((p: Product) => {
      if (type === 'daily') return p.dealType === 'flash' || p.dealType === 'daily' || (p.isSale && (!p.dealType || p.dealType === 'none'));
      return (p as any).dealType === type;
    });
    return [...regular].slice(0, 5);
  };
  return (
    <div className="container mx-auto px-4 py-20">
      <PageTitle title="Deals Hub" />
      {/* Hero Section */}
      <div className="text-center max-w-3xl mx-auto mb-20">
        <div className="inline-flex items-center gap-3 bg-rose-50 text-rose-600 px-6 py-2 rounded-full mb-8 border border-rose-100">
          <i className="fas fa-fire text-sm"></i>
          <span className="text-[10px] font-black uppercase tracking-[0.3em]">Hottest Deals of the Week</span>
        </div>
        <h1 className="text-6xl lg:text-7xl font-black text-gray-900 mb-8 tracking-tighter leading-tight">Unbeatable Savings</h1>
        <p className="text-xl text-gray-500 font-medium leading-relaxed">Don't miss out on our limited-time offers. Premium products at prices you'll love.</p>
      </div>

      {/* Quick Deal Types */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-24">
        {quickDeals.map((type, i) => (
          <motion.div
            key={type.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            onClick={() => {
              if (type.sectionId) {
                document.getElementById(type.sectionId)?.scrollIntoView({ behavior: 'smooth' });
              } else if (type.path) {
                navigate(type.path);
                window.scrollTo(0, 0);
              }
            }}
            className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col items-center justify-center gap-3 cursor-pointer hover:shadow-md hover:-translate-y-1 transition-all"
          >
            <div className={`w-14 h-14 rounded-2xl ${type.bg} ${type.color} flex items-center justify-center`}>
              <i className={`fas ${type.icon} text-xl`}></i>
            </div>
            <span className="text-xs font-black text-gray-600 uppercase tracking-widest">{type.label}</span>
          </motion.div>
        ))}
      </div>

      {/* Main Countdown Banner */}
      <div className="bg-gray-900 rounded-[3rem] p-12 lg:p-16 mb-24 relative overflow-hidden">
        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-12">
          <div className="text-center lg:text-left">
            <h2 className="text-3xl lg:text-4xl font-black text-white mb-4 tracking-tight whitespace-nowrap">Flash Sale Ends In:</h2>
            <p className="text-gray-400 font-medium text-lg">Limited time offers on premium products.</p>
          </div>

          <div className="flex items-center gap-6 lg:gap-10">
            {dailyTime.expired ? (
              <span className="text-sm font-black text-red-500">No Active Deal</span>
            ) : (
              <>
                {[
                  { label: 'Hours', val: dailyTime.hours },
                  { label: 'Minutes', val: dailyTime.minutes },
                  { label: 'Seconds', val: dailyTime.seconds }
                ].map((t, i) => (
                  <React.Fragment key={i}>
                    <div className="flex flex-col items-center">
                      <div className="text-5xl lg:text-7xl font-black text-white tabular-nums tracking-tighter mb-2">
                        {String(t.val).padStart(2, '0')}
                      </div>
                      <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{t.label}</span>
                    </div>
                    {i < 2 && (
                      <div className="text-gray-700 text-3xl lg:text-5xl font-black mb-6">:</div>
                    )}
                  </React.Fragment>
                ))}
              </>
            )}
          </div>

          <div className="w-full lg:w-auto">
            <button
              onClick={() => onSelectDealType('flash')}
              className="w-full lg:w-auto px-12 py-5 bg-white text-gray-900 rounded-2xl font-black text-lg uppercase tracking-widest hover:bg-gray-100 transition-all"
            >
              Shop Now
            </button>
          </div>
        </div>
      </div>

      {/* Sectioned Deals (Combined Design) */}
      <div className="space-y-32">
        {dealSections.map((section, idx) => {
          const products = getDealProducts(section.type);
          const hasProducts = products.length > 0;
          return (
          <section key={section.id} id={section.id} className="scroll-mt-48">
            <div className="flex items-center justify-between mb-12">
              <div className="flex items-center gap-6">
                <div className={`w-16 h-16 rounded-[2rem] ${section.timer.expired ? 'bg-gray-300' : section.color} flex items-center justify-center text-white text-2xl shadow-xl shadow-brand-500/10`}>
                  <i className={`fas ${section.timer.expired ? 'fa-clock' : section.icon}`}></i>
                </div>
                <div>
                  <h2 className={`text-3xl font-black tracking-tight ${section.timer.expired ? 'text-gray-400' : 'text-gray-900'}`}>{section.name}</h2>
                  {hasProducts && (
                    <div className="flex items-center gap-3 mt-2">
                      {section.timer.expired ? (
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 bg-gray-100 px-3 py-1 rounded-lg">⏰ Deal Ended</span>
                      ) : (
                        <>
                          <span className="text-gray-400 font-black uppercase text-[9px] tracking-[0.2em]">Ends in:</span>
                          <div className="px-3 py-1 bg-brand-50 rounded-lg border border-brand-100 animate-pulse">
                            <span className="text-brand-600 font-black text-xs tabular-nums tracking-tight">{section.duration}</span>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
              {!section.timer.expired && hasProducts && (
                <button
                  onClick={() => onSelectDealType(section.type)}
                  className="text-xs font-black uppercase tracking-widest text-brand-600 hover:translate-x-2 transition-transform flex items-center gap-2"
                >
                  View All <i className="fas fa-arrow-right"></i>
                </button>
              )}
            </div>

            {section.timer.expired ? (
              <div className="py-20 text-center bg-gray-50 rounded-[3rem] border border-dashed border-gray-200">
                <i className="fas fa-clock text-4xl text-gray-300 mb-4 block"></i>
                <p className="text-gray-500 font-black text-lg mb-2">This deal has ended</p>
                <p className="text-gray-400 font-medium text-sm">Check back soon for the next {section.name}!</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-8">
                {(() => {
                  if (!hasProducts) return (
                    <div className="col-span-full py-20 text-center bg-gray-50 rounded-[3rem] border border-dashed border-gray-200">
                      <p className="text-gray-400 font-bold">More deals coming soon for this category!</p>
                    </div>
                  );
                  return products.map((p: Product) => (
                    <ProductCard
                      key={p.id}
                      product={p}
                      onAddToCart={handleAddToCart}
                      onSelect={(id) => navigate(`/products/${id}`)}
                      onToggleWishlist={handleToggleWishlist}
                      isWishlisted={wishlist.includes(p.id)}
                    />
                  ));
                })()}
              </div>
            )}
          </section>
          );
        })}
      </div>
    </div>
  );
};

export default DealsView;
