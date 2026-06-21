import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Product } from '../../types';
import FlashSaleSection from './FlashSaleSection';
import ProductCard from '../../components/product/ProductCard';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useApp } from '../../context/AppContext';
import { useSharedProducts, useSharedVendors, useSharedCategories } from '../../context/DataContext';
import { useGlobalSettings } from '../../hooks/useMarketing';
import { isExpired } from '../../utils/expiry';
import PageTitle from '../../components/PageTitle';

const HomeView: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { handleAddToCart } = useCart();
  const { 
    wishlist, handleToggleWishlist, setSelectedCategory, 
    setSelectedFilter, handleSelectProduct, recentlyViewed 
  } = useApp();
  const { products: approvedProducts, loading: productsLoading } = useSharedProducts();
  const { vendors: fetchedVendors } = useSharedVendors();
  const userRole = user?.role;
  const { setting: heroBanners } = useGlobalSettings('hero_banners');
  const { categories: dbCategories } = useSharedCategories();
  const [slide, setSlide] = useState(0);

  const defaultSlides: any[] = [];

  // Filter out expired slides
  const rawSlides = (heroBanners && heroBanners.slides && heroBanners.slides.length > 0) ? heroBanners.slides : defaultSlides;
  const activeSlides = rawSlides.filter((s: any) => !isExpired(s.expiresAt));
  const slides = activeSlides;

  useEffect(() => {
    setSlide(0); // Reset to first slide when slides change
    if (slides.length === 0) return;
    const timer = setInterval(() => setSlide(s => (s + 1) % slides.length), 8000);
    return () => clearInterval(timer);
  }, [slides.length]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-24 pb-32"
    >
      <PageTitle title="Mamu Market" />
      {/* Hero */}
      {slides.length > 0 && (
        <section className="container mx-auto px-4 pt-8">
          <div className="relative h-[560px] sm:h-[530px] lg:h-[600px] rounded-[3rem] overflow-hidden shadow-2xl group bg-black">
            <AnimatePresence initial={false}>
              <motion.div
                key={slide}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ 
                  duration: 2, 
                  ease: [0.4, 0, 0.2, 1]
                }}
                className="absolute inset-0 w-full h-full"
              >
                <div className="absolute inset-0 z-10" style={{ background: 'linear-gradient(to right, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.55) 45%, rgba(0,0,0,0.10) 100%)' }}></div>
                
                <motion.img 
                  initial={{ scale: 1.05 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 2, ease: "easeOut" }}
                  src={slides[slide].image || slides[slide].img || 'https://via.placeholder.com/1920x1080?text=Mamu+Market'} 
                  referrerPolicy="no-referrer" 
                  className="absolute inset-0 w-full h-full object-cover" 
                  alt="Hero" 
                />

                <div className="relative z-20 h-full flex flex-col justify-center pl-12 pr-6 sm:pl-16 sm:pr-8 lg:pl-20 lg:pr-12 max-w-sm sm:max-w-md lg:max-w-2xl">
                  {(slides[slide].badge === undefined ? true : !!slides[slide].badge) && (
                    <motion.span 
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5, duration: 0.8 }}
                      className="bg-white/20 backdrop-blur-md border border-white/30 text-white text-[10px] sm:text-xs font-black uppercase tracking-[0.3em] px-5 sm:px-6 py-2 sm:py-2.5 rounded-full w-fit mb-6 shadow-2xl shadow-black/20"
                    >
                      {slides[slide].badge !== undefined ? slides[slide].badge : 'New Season Arrival'}
                    </motion.span>
                  )}
                  <motion.h1 
                    initial={{ opacity: 0, y: 50, filter: 'blur(10px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    transition={{ delay: 0.7, duration: 0.8 }}
                    className="text-5xl sm:text-6xl lg:text-7xl font-black text-white mb-6 leading-[1.05] tracking-tight text-balance drop-shadow-2xl"
                    style={{ textShadow: '0 4px 30px rgba(0,0,0,0.6)' }}
                  >
                    {slides[slide].title}
                  </motion.h1>
                  <motion.p 
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.9, duration: 0.8 }}
                    className="text-lg sm:text-xl lg:text-2xl text-white/95 mb-10 max-w-xl font-medium leading-relaxed text-balance drop-shadow-lg"
                    style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}
                  >
                    {slides[slide].subtitle || slides[slide].sub}
                  </motion.p>
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.1, duration: 0.8 }}
                    className="flex flex-wrap gap-6"
                  >
                      <button 
                        onClick={() => navigate(slides[slide].buttonLink || '/products')} 
                        className="px-8 sm:px-10 py-4 bg-white text-gray-900 rounded-full font-black text-base sm:text-lg hover:scale-105 active:scale-95 transition-all shadow-xl hover:shadow-2xl shadow-black/20 flex items-center gap-3"
                      >
                        {slides[slide].buttonText || 'Explore Shop'} <i className="fas fa-arrow-right text-sm"></i>
                      </button>
                  </motion.div>
                </div>
              </motion.div>
            </AnimatePresence>
            
            <div className="absolute bottom-8 sm:bottom-12 left-1/2 -translate-x-1/2 sm:left-auto sm:right-12 sm:translate-x-0 z-20 flex gap-2 sm:gap-3">
              {slides.map((_, i) => (
                <button 
                  key={i} 
                  onClick={() => setSlide(i)} 
                  className={`h-1.5 rounded-full transition-all duration-500 ${slide === i ? 'w-8 sm:w-12 bg-white' : 'w-2 sm:w-3 bg-white/30 hover:bg-white/50'}`} 
                />
              ))}
            </div>
          </div>
        </section>
      )}



      {/* Categories */}
      <section className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Shop by Department</h2>
          <button onClick={() => { setSelectedCategory(''); window.scrollTo(0, 0); navigate('/products'); }} className="flex items-center gap-2 text-brand-600 font-black text-sm hover:gap-3 transition-all">
            View All <i className="fas fa-arrow-right text-xs"></i>
          </button>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
          {dbCategories.map(cat => (
            <button
              key={cat.dbId || cat.id}
              onClick={() => {
                setSelectedCategory(cat.id);
                window.scrollTo(0, 0);
                navigate(`/${cat.id}`);
              }}
              className="flex-shrink-0 flex items-center gap-2 px-5 py-3 rounded-full border border-gray-200 bg-white hover:border-brand-500 hover:bg-brand-50 hover:text-brand-700 transition-all font-black text-sm text-gray-600 shadow-sm hover:shadow-md"
            >
              <i className={`fas ${cat.icon || 'fa-tag'} text-xs`}></i>
              {cat.name}
            </button>
          ))}
        </div>
      </section>

      {/* Flash Sale */}
      <FlashSaleSection />

      {/* Featured Products */}
      <section className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-16">
          <div className="max-w-xl">
            <h2 className="text-4xl font-black text-gray-900 mb-4 tracking-tight text-gradient">Trending Now</h2>
            <p className="text-lg text-gray-500 font-medium leading-relaxed">The most coveted items from our global community.</p>
          </div>
          <button onClick={() => { setSelectedFilter('trending'); navigate('/products?filter=trending'); window.scrollTo(0, 0); }} className="px-8 py-3 rounded-2xl bg-gray-100 font-black text-gray-600 hover:bg-gray-200 transition-all active:scale-95">View All</button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
          {(() => {
            const dynamic = approvedProducts.map((p: Product) => {
              const matchedVendor = fetchedVendors.find(v => v.id === p.vendorId);
              return {
                ...p,
                image: p.mainImage || p.image || '',
                vendor: matchedVendor?.storeName || matchedVendor?.name || p.vendor || p.vendorName || 'Unknown Vendor',
              };
            });
            const allProducts = dynamic;
            
            // Filter out out-of-stock items and apply standard trending logic
            const calculateTrendScore = (prod: any) => {
              const reviewScore = (prod.reviewsCount || 0) * 0.5;
              const ratingScore = (prod.rating || 0) * 10;
              const saleBonus = prod.isSale ? 20 : 0;
              return reviewScore + ratingScore + saleBonus;
            };

            const trending = allProducts.filter(p => {
              const isOutOfStock = (p.inStock as any) === false || (p.inStock as any) === 'false' || p.stockStatus === 'out_of_stock' || p.stockStatus === 'discontinued';
              if (isOutOfStock) return false;
              return calculateTrendScore(p) >= 50;
            }).sort((a, b) => calculateTrendScore(b) - calculateTrendScore(a)).slice(0, 5);

            return trending;
          })().map((product: Product, idx: number) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
            >
              <ProductCard 
                product={product} 
                onAddToCart={handleAddToCart} 
                onSelect={() => handleSelectProduct(product)}
                onToggleWishlist={handleToggleWishlist}
                isWishlisted={wishlist.includes(product.id)}
                userRole={userRole}
              />
            </motion.div>
          ))}
        </div>
      </section>

      {/* New Arrivals */}
      {(() => {
        if (productsLoading) return null;
        // Filter out out-of-stock items and apply standard new arrivals logic
        const newArrivals = approvedProducts
          .filter(p => {
            const isOutOfStock = (p.inStock as any) === false || (p.inStock as any) === 'false' || p.stockStatus === 'out_of_stock' || p.stockStatus === 'discontinued';
            if (isOutOfStock) return false;
            return p.isNew === true;
          })
          .map((p: Product) => {
            const matchedVendor = fetchedVendors.find(v => v.id === p.vendorId);
            return {
              ...p,
              image: p.mainImage || p.image || '',
              vendor: matchedVendor?.storeName || matchedVendor?.name || p.vendor || p.vendorName || 'Unknown Vendor',
            };
          })
          .slice(0, 5);
        if (newArrivals.length === 0) return null;
        return (
          <section className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-16">
              <div className="max-w-xl">
                <span className="inline-block text-xs font-black uppercase tracking-[0.2em] text-brand-600 bg-brand-50 px-4 py-1.5 rounded-full mb-4">Just Added</span>
                <h2 className="text-4xl font-black text-gray-900 tracking-tight">New Arrivals</h2>
                <p className="text-lg text-gray-500 font-medium leading-relaxed mt-4">Fresh products from our latest vendors.</p>
              </div>
              <button onClick={() => { setSelectedFilter('new'); navigate('/products?filter=new'); window.scrollTo(0, 0); }} className="px-8 py-3 rounded-2xl bg-gray-100 font-black text-gray-600 hover:bg-gray-200 transition-all active:scale-95">View All</button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
              {newArrivals.map((product: Product, idx: number) => (
                <motion.div key={product.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: idx * 0.1 }}>
                  <ProductCard
                    product={product}
                    onAddToCart={handleAddToCart}
                    onSelect={() => handleSelectProduct(product)}
                    onToggleWishlist={handleToggleWishlist}
                    isWishlisted={wishlist.includes(product.id)}
                    userRole={userRole}
                  />
                </motion.div>
              ))}
            </div>
          </section>
        );
      })()}

      {/* Recently Viewed */}
      {recentlyViewed.length > 0 && (
        <section className="container mx-auto px-4 mb-16">
          <div className="flex justify-between items-center mb-10">
            <div>
              <span className="inline-block text-xs font-black uppercase tracking-[0.2em] text-gray-400 bg-gray-100 px-4 py-1.5 rounded-full mb-3">Your History</span>
              <h2 className="text-3xl font-black text-gray-900 tracking-tight">Recently Viewed</h2>
            </div>
          </div>
          <div className="flex gap-6 overflow-x-auto pb-4" style={{ scrollbarWidth: 'none' }}>
            {recentlyViewed.map((product: Product) => (
              <div key={product.id} className="flex-shrink-0 w-56 cursor-pointer group" onClick={() => handleSelectProduct(product)}>
                <div className="w-56 h-56 rounded-2xl overflow-hidden bg-gray-100 mb-3">
                  {product.image && <img src={product.image} referrerPolicy="no-referrer" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" alt={product.name} />}
                </div>
                <p className="text-sm font-black text-gray-900 truncate group-hover:text-brand-600 transition-colors">{product.name}</p>
                <p className="text-sm font-bold text-brand-600">৳{Number(product.price).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Promotion */}
      <section className="container mx-auto px-4">
        <motion.div 
          whileHover={{ scale: 1.005 }}
          className="relative rounded-[2.5rem] overflow-hidden min-h-[250px] lg:h-[300px] shadow-xl group border border-gray-100"
        >
          <img src="https://images.unsplash.com/photo-1674027392851-7b34f21b07ee?q=80&w=1200&auto=format&fit=crop" referrerPolicy="no-referrer" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-[3s]" alt="Merchant" />
          <div className="absolute inset-0 bg-gradient-to-r from-brand-700/90 via-brand-600/60 to-transparent z-10"></div>
          <div className="relative z-20 h-full flex flex-col justify-center p-8 sm:p-10 lg:p-16 items-start text-left">
            {userRole === 'vendor' ? (
              <>
                <motion.h2 
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  className="text-2xl sm:text-3xl lg:text-5xl font-black text-white mb-3 tracking-tighter"
                >
                  Welcome back, Merchant!
                </motion.h2>
                <motion.p 
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-sm sm:text-base lg:text-lg text-white/80 mb-6 max-w-xl font-medium leading-relaxed"
                >
                  Manage your products, check your orders, and grow your store.
                </motion.p>
                <div className="flex gap-4 flex-wrap">
                  <motion.button 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    onClick={() => navigate('/dashboard')} 
                    className="px-6 sm:px-8 py-3 bg-white text-brand-600 rounded-xl font-black text-sm hover:scale-105 active:scale-95 transition-all shadow-xl shadow-black/20"
                  >
                    Go to Dashboard →
                  </motion.button>
                  <motion.button 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    onClick={() => navigate('/dashboard/analytics')} 
                    className="px-6 sm:px-8 py-3 bg-white/10 text-white border border-white/30 rounded-xl font-black text-sm hover:bg-white/20 transition-all"
                  >
                    View Analytics
                  </motion.button>
                </div>
              </>
            ) : (
              <>
                <motion.h2 
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  className="text-2xl sm:text-3xl lg:text-5xl font-black text-white mb-3 tracking-tighter"
                >
                  Ready to scale your brand?
                </motion.h2>
                <motion.p 
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-sm sm:text-base lg:text-lg text-white/80 mb-6 max-w-xl font-medium leading-relaxed"
                >
                  Join a trusted marketplace built to help your business grow.
                </motion.p>
                <motion.button 
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  onClick={() => navigate('/become-vendor')} 
                  className="px-6 sm:px-8 py-3 bg-white text-brand-600 rounded-xl font-black text-sm hover:scale-105 active:scale-95 transition-all shadow-xl shadow-black/20"
                >
                  Start Selling Today
                </motion.button>
              </>
            )}
          </div>
        </motion.div>
      </section>
    </motion.div>
  );
};

export default HomeView;
