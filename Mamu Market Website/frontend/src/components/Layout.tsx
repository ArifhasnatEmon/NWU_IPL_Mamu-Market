
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, useLocation, useNavigationType } from 'react-router-dom';
import { CATEGORIES } from '../config';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useApp } from '../context/AppContext';
import { useGlobalSettings } from '../hooks/useMarketing';
import { isExpired } from '../utils/expiry';
import { useMessages } from '../hooks/useSupport';
import { useCategories } from '../hooks/useSecondary';
import { useApprovedProducts, usePendingProducts } from '../hooks/useProducts';
import { useVendors } from '../hooks/useVendors';
import { supabase } from '../lib/supabase';

interface LayoutProps {
  children: React.ReactNode;
}

interface SearchSuggestion {
  label: string;
  type: 'category' | 'brand' | 'keyword';
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const { user, handleLogout } = useAuth();
  const { cart, setIsCartOpen } = useCart();
  const { wishlist, setSearchQuery, setSelectedCategory, setSelectedSubCategory, setSelectedFilter } = useApp();
  const { products: approvedProducts } = useApprovedProducts();
  const { products: pendingProducts } = usePendingProducts();
  const { vendors: fetchedVendors } = useVendors();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMegaMenuOpen, setIsMegaMenuOpen] = useState(false);
  const [activeMegaCat, setActiveMegaCat] = useState<string | null>(null);
  const [showAllMegaCats, setShowAllMegaCats] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Hooks must be called before any conditional logic or variables using their results
  const { categories: customCategoriesConfig } = useCategories();
  const { setting: tickerSettings } = useGlobalSettings('top_ticker');
  const { messages: supportMessages } = useMessages();

  const [displayCategories, setDisplayCategories] = useState(CATEGORIES);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [vendorPendingCount, setVendorPendingCount] = useState(0);

  // Fetch dynamic categories
  useEffect(() => {
    if (customCategoriesConfig && customCategoriesConfig.length > 0) {
      setDisplayCategories(customCategoriesConfig);
    }
  }, [customCategoriesConfig]);

  const [bannerVersion, setBannerVersion] = useState(0);
  const [searchVal, setSearchVal] = useState('');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const [tickerMessages, setTickerMessages] = useState<string[]>([]);
  useEffect(() => {
    if (tickerSettings && Array.isArray(tickerSettings.messages)) {
      // Handle both old string[] and new {text, expiresAt}[] formats
      const activeMessages = tickerSettings.messages
        .map((m: any) => typeof m === 'string' ? { text: m, expiresAt: null } : m)
        .filter((m: any) => !isExpired(m.expiresAt))
        .map((m: any) => m.text);
      setTickerMessages(activeMessages.length > 0 ? activeMessages : [
        '🎉 Welcome to Mamu Market!',
        '🚚 Free shipping on orders over ৳10000'
      ]);
    } else {
      setTickerMessages([
        '🎉 Welcome to Mamu Market!',
        '🚚 Free shipping on orders over ৳10000'
      ]);
    }
  }, [tickerSettings]);



  React.useEffect(() => {
    const onStorage = () => setBannerVersion(v => v + 1);
    window.addEventListener('storage', onStorage);
    return () => { window.removeEventListener('storage', onStorage); };
  }, []);

  useEffect(() => {


    // User counts
    if (user?.id) {
      const messages: any[] = supportMessages || [];
      setUnreadMessageCount(messages.filter((m: any) => m?.receiverId === user.id && !m?.read).length);

      if (user.role === 'vendor') {
        const pendingProds: any[] = pendingProducts;
        const pendingUpdates: any[] = [];
        const approvedProds: any[] = approvedProducts;
        const pp = pendingProds.filter(p => p.vendorId === user.id && (!p.status || p.status === 'pending')).length;
        const pu = pendingUpdates.filter(u => approvedProds.some(p => p.id === u.productId && p.vendorId === user.id)).length;
        setVendorPendingCount(pp + pu);
      } else {
        setVendorPendingCount(0);
      }
    } else {
      setUnreadMessageCount(0);
      setVendorPendingCount(0);
    }
  }, [user?.id, bannerVersion, pendingProducts, approvedProducts, supportMessages]);


  const [topbarTime, setTopbarTime] = useState<{ h: number, m: number, s: number } | null>(null);
  const [topbarSlot, setTopbarSlot] = useState(0);

  useEffect(() => {
    const updateTimer = () => {
      const midnight = new Date();
      midnight.setHours(23, 59, 59, 0);
      const diff = midnight.getTime() - Date.now();
      if (diff <= 0) { setTopbarTime(null); return; }
      setTopbarTime({
        h: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        m: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        s: Math.floor((diff % (1000 * 60)) / 1000),
      });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const totalSlots = topbarTime ? tickerMessages.length + 1 : tickerMessages.length;
    if (totalSlots === 0) return;

    const interval = setInterval(() => {
      setTopbarSlot(prev => (prev + 1) % totalSlots);
    }, 30 * 1000);
    return () => clearInterval(interval);
  }, [tickerMessages.length, !!topbarTime]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  const adminPaths = ['/admin', '/admin-login'];
  if (adminPaths.some(p => location.pathname.startsWith(p))) {
    if (location.pathname.startsWith('/admin') && location.pathname !== '/admin-login' && (!user || user.role !== 'admin')) return null;
    return <>{children}</>;
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchVal(val);
    setSearchQuery(val);
    if (val.trim().length >= 1) {
      const q = val.toLowerCase();
      const dynamicProds = approvedProducts;
      const customCats = customCategoriesConfig || [];
      const stopWords = new Set(['and', 'or', 'the', 'a', 'an', 'with', 'for', 'in', 'on', 'at', 'to', 'of', 'is', 'it', 'its', 'by', 'from', 'new', 'set', 'pro', 'max', 'plus', 'mini', 'ultra', 'gen', 'series', 'edition']);

      const kwMap = new Map<string, 'category' | 'brand' | 'keyword'>();

      // Custom
      customCats.forEach((c: any) => { if (c.name) kwMap.set(c.name, 'category'); });

      // Dynamic categories
      dynamicProds.forEach((p: any) => {
        if (p.category) kwMap.set(p.category, 'category');
      });

      // Keywords
      const allProds = dynamicProds;
      allProds.forEach((p: any) => {
        const name = (p.name || p.productName || '') as string;
        const words = name.split(/[\s\-\/,()\[\]]+/).filter((w: string) => w.length >= 4 && !stopWords.has(w.toLowerCase()) && !/^\d+/.test(w));
        // Brand
        if (words[0]) kwMap.set(words[0], 'brand');
        // Content
        words.slice(1).forEach((w: string) => {
          if (!kwMap.has(w)) kwMap.set(w, 'keyword');
        });
      });

      // Dynamic vendor/store names
      fetchedVendors.forEach((v: any) => { if (v.name) kwMap.set(v.name, 'brand'); if (v.storeName && v.storeName !== v.name) kwMap.set(v.storeName, 'brand'); });

      // Sort
      const order = { category: 0, brand: 1, keyword: 2 };
      const matched = [...kwMap.entries()]
        .filter(([k]) => k.toLowerCase().includes(q))
        .sort((a, b) => order[a[1]] - order[b[1]])
        .slice(0, 8)
        .map(([k, type]) => ({ label: k, type }));

      setSuggestions(matched);
      setShowSuggestions(matched.length > 0);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    const label = suggestion.label;
    setSearchQuery(label);
    setShowSuggestions(false);
    setSearchVal('');
    navigate('/products');
  };

  const handleNav = (path: string, requireAuth = false) => {
    if (requireAuth && !user) {
      navigate('/user-login');
    } else {
      navigate(path);
    }
  };

  const isAuthPage = ['/user-login', '/user-signup', '/vendor-login', '/affiliate-program'].includes(location.pathname) ||
    ['/help-center', '/about', '/terms', '/privacy', '/return-policy', '/seller-policy', '/contact', '/vendor-support', '/reset-password', '/update-password'].includes(location.pathname);

  return (
    <div className="min-h-screen flex flex-col font-sans selection:bg-brand-100 selection:text-brand-600 bg-[#F5F5F8]">
      {/* Top Banner */}
      {!isAuthPage && (
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className={`gradient-primary px-4 py-2 text-[11px] font-bold uppercase tracking-widest`}
        >
          <div className="container mx-auto flex justify-between items-center text-white">
            {user?.role !== 'vendor' && tickerMessages.length > 0 && (
              <AnimatePresence mode="wait">
                {(() => {
                  const isTimerSlot = topbarTime && topbarSlot === 0;
                  const messageIndex = topbarTime ? topbarSlot - 1 : topbarSlot;

                  return isTimerSlot ? (
                    <motion.span
                      key="timer"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.4 }}
                      className="flex items-center gap-2"
                    >
                      <i className="fas fa-bolt text-yellow-300 text-xs"></i>
                      <span>Daily Deal ends in:</span>
                      <span className="font-black tabular-nums bg-white/20 px-2 py-0.5 rounded-lg">
                        {String(topbarTime.h).padStart(2, '0')}:{String(topbarTime.m).padStart(2, '0')}:{String(topbarTime.s).padStart(2, '0')}
                      </span>
                    </motion.span>
                  ) : (
                    <motion.span
                      key={`slot-${messageIndex}`}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.4 }}
                    >
                      {tickerMessages[messageIndex]}
                    </motion.span>
                  );
                })()}
              </AnimatePresence>
            )}
            <div className="flex gap-6 w-full sm:w-auto justify-end">
              {user?.role !== 'vendor' && (
                <button onClick={() => navigate('/affiliate-program')} className="hover:opacity-80 transition-opacity">Join Affiliate Program</button>
              )}
              <button onClick={() => handleNav('/help-center')} className="hover:opacity-80 transition-opacity">Help & Support</button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Navigation */}
      {!isAuthPage && (
        <nav className={`sticky top-0 z-50 w-full transition-all duration-0 ${scrolled ? 'glass shadow-lg py-2' : 'bg-[#F5F5F8] border-b border-gray-100 py-4'}`}>
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between gap-8">
              {/* Logo */}
              <div className="flex items-center gap-4">
                <button className="lg:hidden p-2 hover:bg-gray-100 rounded-xl transition-colors" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                  <i className={`fas ${isMobileMenuOpen ? 'fa-times' : 'fa-bars'} text-xl text-gray-700`}></i>
                </button>
                <button onClick={() => navigate('/')} className="flex items-center gap-3 group">
                  <motion.div
                    whileHover={{ rotate: 12, scale: 1.1 }}
                    className="flex h-12 w-12 items-center justify-center rounded-2xl gradient-primary text-white shadow-xl shadow-brand-500/20"
                  >
                    <i className="fas fa-store text-xl"></i>
                  </motion.div>
                  <div className="flex flex-col text-left">
                    <span className="text-2xl font-black tracking-tighter text-gray-900 leading-none text-gradient">Mamu</span>
                    <span className="text-[10px] font-black text-brand-600 tracking-[0.2em] uppercase">Market</span>
                  </div>
                </button>
              </div>

              {/* Search */}
              <div className="hidden max-w-xl flex-1 lg:block" ref={searchRef}>
                <div className="relative group">
                  <input
                    type="text"
                    value={searchVal}
                    placeholder="Search for products, brands, and more..."
                    onChange={handleSearchChange}
                    onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        setShowSuggestions(false);
                        navigate('/products');
                      }
                      if (e.key === 'Escape') { setShowSuggestions(false); setSearchVal(''); setSearchQuery(''); }
                    }}
                    className="w-full rounded-2xl border border-gray-200 bg-gray-50/50 py-3.5 pl-6 pr-14 text-sm outline-none focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/5 transition-all placeholder:text-gray-400"
                  />
                  <button
                    onClick={() => {
                      setShowSuggestions(false);
                      navigate('/products');
                    }}
                    className="absolute right-2 top-1/2 h-10 w-10 -translate-y-1/2 rounded-xl gradient-primary text-white flex items-center justify-center hover:shadow-xl hover:scale-105 transition-all"
                  >
                    <i className="fas fa-search"></i>
                  </button>
                  <AnimatePresence>
                    {showSuggestions && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-gray-100 shadow-xl z-50 overflow-hidden"
                      >
                        {suggestions.map((s, i) => {
                          const label = s.label;
                          const type = s.type;
                          const icon = type === 'category' ? 'fa-tag' : type === 'brand' ? 'fa-store' : 'fa-search';
                          const badge = type === 'category' ? { text: 'Category', cls: 'bg-brand-50 text-brand-500' } : type === 'brand' ? { text: 'Brand', cls: 'bg-amber-50 text-amber-500' } : null;
                          return (
                            <button
                              key={i}
                              onMouseDown={() => handleSuggestionClick(s)}
                              className="w-full flex items-center gap-3 px-5 py-3 text-sm font-medium text-gray-700 hover:bg-brand-50 hover:text-brand-600 transition-colors text-left"
                            >
                              <i className={`fas ${icon} text-gray-300 text-xs flex-shrink-0`}></i>
                              <span className="truncate flex-1">{label}</span>
                              {badge && <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full shrink-0 ${badge.cls}`}>{badge.text}</span>}
                            </button>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 lg:gap-4">
                {user?.role !== 'vendor' && (
                  <button
                    onClick={() => navigate('/wishlist')}
                    className="hidden lg:flex flex-col items-center gap-1 text-gray-500 hover:text-brand-600 p-2.5 rounded-2xl hover:bg-grad-soft transition-all group relative"
                  >
                    <div className="relative">
                      <i className="far fa-heart text-xl group-hover:scale-110 transition-transform"></i>
                      {wishlist.length > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-rose-500 text-white text-[8px] font-black rounded-full flex items-center justify-center">
                          {wishlist.length}
                        </span>
                      )}
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-widest">Wishlist</span>
                  </button>
                )}



                {user && user.role !== 'admin' && (
                  <button onClick={() => navigate('/messages')} className="relative hidden lg:flex flex-col items-center gap-1 hover:opacity-80 transition-all">
                    {unreadMessageCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[8px] font-black rounded-full flex items-center justify-center z-10">
                        {unreadMessageCount}
                      </span>
                    )}
                    <i className="fas fa-comment-dots text-xl text-gray-600"></i>
                    <span className="text-[9px] font-black uppercase tracking-wider text-gray-500">Messages</span>
                  </button>
                )}

                {(user && user.role !== 'admin') ? (
                  <div className="relative">
                    <button
                      onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                      className="flex items-center gap-3 p-1.5 pr-4 rounded-2xl hover:bg-gray-50 transition-all border border-transparent hover:border-gray-100"
                    >
                      <div className="relative">
                        {user.avatar ? (
                          user.avatar && <img src={user.avatar} referrerPolicy="no-referrer" className="w-10 h-10 rounded-xl object-cover shadow-md" alt="User" />
                        ) : (
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md font-black text-white text-sm" style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}>
                            {(user.storeName || user.name || 'U').charAt(0).toUpperCase()}
                          </div>
                        )}
                        {user.role === 'vendor' && vendorPendingCount > 0 && (
                          <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-white text-[8px] font-black rounded-full flex items-center justify-center z-10 shadow">
                            {vendorPendingCount}
                          </span>
                        )}
                      </div>
                      <div className="hidden xl:flex flex-col text-left">
                        <span className="text-xs font-black text-gray-900 leading-none mb-1">{user.role === 'vendor' ? (user.storeName || user.name) : user.name}</span>
                        <span className="text-[9px] font-black text-brand-600 uppercase tracking-widest">{user.role}</span>
                      </div>
                      <i className={`fas fa-chevron-down text-[10px] text-gray-400 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`}></i>
                    </button>
                    <AnimatePresence>
                      {isUserMenuOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute right-0 mt-3 w-56 bg-white rounded-[2rem] shadow-2xl border border-gray-100 py-3 z-50 overflow-hidden"
                        >
                          <div className="px-6 py-4 border-b border-gray-50 mb-2">
                            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Account</p>
                            <p className="text-sm font-bold text-[#111827] truncate">{user.email}</p>
                          </div>
                          {user.role === 'vendor' && (
                            <>
                              <button
                                onClick={() => { navigate('/dashboard'); setIsUserMenuOpen(false); }}
                                className="w-full text-left px-6 py-3.5 text-sm font-bold text-gray-600 hover:bg-grad-soft hover:text-brand-600 transition-all flex items-center gap-3"
                              >
                                <i className="fas fa-store w-5"></i> My Dashboard
                              </button>
                              <button
                                onClick={() => { navigate(`/vendors/${user.id}`); setIsUserMenuOpen(false); }}
                                className="w-full text-left px-6 py-3.5 text-sm font-bold text-gray-600 hover:bg-grad-soft hover:text-brand-600 transition-all flex items-center gap-3"
                              >
                                <i className="fas fa-shop w-5"></i> My Store
                              </button>
                              <div className="h-px bg-gray-50 my-2 mx-4"></div>
                            </>
                          )}
                          <button onClick={() => { navigate('/settings'); setIsUserMenuOpen(false); }} className="w-full text-left px-6 py-3.5 text-sm font-bold text-gray-600 hover:bg-grad-soft hover:text-brand-600 transition-all flex items-center gap-3">
                            <i className="fas fa-cog w-5"></i> Account Settings
                          </button>
                          {user.role !== 'vendor' && (
                            <button onClick={() => { navigate('/orders'); setIsUserMenuOpen(false); }} className="w-full text-left px-6 py-3.5 text-sm font-bold text-gray-600 hover:bg-grad-soft hover:text-brand-600 transition-all flex items-center gap-3">
                              <i className="fas fa-box w-5"></i> Order History
                            </button>
                          )}
                          <div className="h-px bg-gray-50 my-2 mx-4"></div>
                          <button onClick={() => { handleLogout(); setIsUserMenuOpen(false); }} className="w-full text-left px-6 py-3.5 text-sm font-bold text-red-500 hover:bg-red-50 transition-all flex items-center gap-3">
                            <i className="fas fa-sign-out-alt w-5"></i> Logout
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ) : (
                  <button
                    onClick={() => navigate('/user-login')}
                    className="hidden lg:flex flex-col items-center gap-1 text-gray-500 hover:text-brand-600 p-2.5 rounded-2xl hover:bg-grad-soft transition-all group"
                  >
                    <i className="far fa-user text-xl group-hover:scale-110 transition-transform"></i>
                    <span className="text-[9px] font-black uppercase tracking-widest">Sign In</span>
                  </button>
                )}

                {user?.role !== 'vendor' && (
                  <>
                    <div className="h-8 w-px bg-gray-200 hidden lg:block mx-1"></div>

                    <button
                      onClick={() => setIsCartOpen(true)}
                      className="relative flex items-center gap-4 p-2.5 lg:p-3 rounded-2xl bg-white hover:bg-grad-soft transition-all group border border-transparent hover:border-brand-100"
                    >
                      <div className="relative">
                        <i className="fas fa-shopping-bag text-2xl text-[#111827] group-hover:text-brand-600 transition-colors"></i>
                        <AnimatePresence>
                          {cartCount > 0 && (
                            <motion.span
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full gradient-primary text-[10px] font-black text-white ring-2 ring-white"
                            >
                              {cartCount}
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </div>
                      <div className="hidden flex-col text-left lg:flex">
                        <span className="text-[10px] font-black text-gray-400 uppercase leading-none mb-1"></span>
                        <span className="font-black text-[#111827] leading-none">৳{cartTotal.toLocaleString()}</span>
                      </div>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Mobile Menu */}
          <AnimatePresence>
            {isMobileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="lg:hidden border-t border-gray-100 bg-[#F5F5F8] px-4 py-8 space-y-4 overflow-hidden"
              >
                {[
                  { id: '/', label: 'Home', icon: 'fa-home' },
                  { id: '/products', label: 'Products', icon: 'fa-box' },
                  { id: '/vendors', label: 'Vendors', icon: 'fa-store' },
                  { id: '/dashboard', label: 'Merchant Center', icon: 'fa-columns', vendorOnly: true },
                  { id: '/settings', label: 'Settings', icon: 'fa-cog', showIfLogged: true },
                  { id: '/cart', label: 'My Cart', icon: 'fa-shopping-cart' },
                  { id: '/user-login', label: 'Login', icon: 'fa-user', hideIfLogged: true }
                ].filter(link => {
                  if (link.vendorOnly && user?.role !== 'vendor') return false;
                  if (link.hideIfLogged && user) return false;
                  if (link.showIfLogged && !user) return false;
                  return true;
                }).map(link => (
                  <button
                    key={link.id}
                    onClick={() => { navigate(link.id); setIsMobileMenuOpen(false); }}
                    className="flex items-center gap-5 w-full py-4 px-6 rounded-2xl font-bold text-gray-700 hover:bg-grad-soft hover:text-brand-600 transition-all border border-transparent hover:border-brand-100"
                  >
                    <i className={`fas ${link.icon} w-6 text-xl`}></i>
                    <span className="text-lg">{link.label}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </nav>
      )}

      {/* Secondary Nav — separate sticky bar below main nav */}
      {!isAuthPage && (
        <div className={`hidden lg:block sticky z-40 bg-white border-b border-gray-100 shadow-sm transition-all`} style={{ top: scrolled ? '64px' : '80px' }}>
          <div className="container mx-auto px-4">
            <nav className="flex items-center gap-10 py-3 relative">
              {/* All Categories Mega Menu */}
                <div
                  className="relative"
                  onMouseEnter={() => setIsMegaMenuOpen(true)}
                  onMouseLeave={() => { setIsMegaMenuOpen(false); setShowAllMegaCats(false); }}
                >
                <button
                  className={`flex items-center gap-3 px-6 py-2 rounded-xl transition-all font-black uppercase tracking-widest text-[13px] ${isMegaMenuOpen ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/20' : 'text-gray-900 hover:bg-gray-50'}`}
                >
                  <i className="fas fa-bars"></i>
                  All Categories
                  <i className={`fas fa-chevron-down text-[10px] transition-transform duration-300 ${isMegaMenuOpen ? 'rotate-180' : ''}`}></i>
                </button>

                <AnimatePresence>
                  {isMegaMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 15, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.98 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className="absolute top-full left-0 mt-2 w-[800px] bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-gray-100 overflow-hidden z-[100] flex"
                    >
                      {/* Left: Categories List */}
                      <div className="w-1/3 bg-gray-50/50 p-8 border-r border-gray-100">
                        <div className="space-y-2">
                          <button
                            onMouseEnter={() => setActiveMegaCat(null)}
                            onClick={() => {
                              setSelectedCategory(null);
                              navigate('/products');
                              setIsMegaMenuOpen(false);
                            }}
                            className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-sm font-black transition-all group text-left mb-4 ${!activeMegaCat ? 'text-brand-600 bg-white shadow-sm' : 'text-gray-600 hover:bg-white hover:text-brand-600'}`}
                          >
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${!activeMegaCat ? 'gradient-primary text-white' : 'bg-white shadow-sm group-hover:gradient-primary group-hover:text-white'}`}>
                              <i className="fas fa-th-large"></i>
                            </div>
                            All Products
                          </button>
                          {(() => {
                            const filtered = displayCategories.filter(c => c.name.toLowerCase() !== 'general');
                            const visible = showAllMegaCats ? filtered : filtered.slice(0, 5);
                            return (
                              <>
                                {visible.map((cat) => (
                                  <button
                                    key={cat.id}
                                    onMouseEnter={() => setActiveMegaCat(cat.id)}
                                    onClick={() => {
                                      setSelectedCategory(cat.id);
                                      navigate(`/${cat.id}`);
                                      setIsMegaMenuOpen(false);
                                    }}
                                    className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-sm font-bold transition-all group text-left ${activeMegaCat === cat.id ? 'text-brand-600 bg-white shadow-md' : 'text-gray-600 hover:bg-white hover:text-brand-600'}`}
                                  >
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${activeMegaCat === cat.id ? 'gradient-primary text-white' : 'bg-white shadow-sm group-hover:gradient-primary group-hover:text-white'}`}>
                                      <i className={`fas ${cat.icon}`}></i>
                                    </div>
                                    {cat.name}
                                  </button>
                                ))}
                                {!showAllMegaCats && filtered.length > 5 && (
                                  <button
                                    onMouseEnter={() => setActiveMegaCat(null)}
                                    onClick={() => setShowAllMegaCats(true)}
                                    className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-sm font-bold transition-all group text-left text-gray-500 hover:bg-gray-100 hover:text-gray-900 mt-2 border border-dashed border-gray-200"
                                  >
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gray-100 text-gray-400 group-hover:bg-white group-hover:text-gray-900 shadow-sm transition-colors">
                                      <i className="fas fa-ellipsis-h"></i>
                                    </div>
                                    Browse all categories
                                  </button>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Right: Subcategories or Featured */}
                      <div className="flex-1 p-10 bg-white">
                        {activeMegaCat ? (
                          <div>
                            <div className="flex justify-between items-center mb-8">
                              <h3 className="text-xl font-black text-gray-900 tracking-tight">
                                {displayCategories.find(c => c.id === activeMegaCat)?.name} Subcategories
                              </h3>
                              <button
                                onClick={() => {
                                  setSelectedCategory(activeMegaCat);
                                  navigate(`/${activeMegaCat}`);
                                  setIsMegaMenuOpen(false);
                                  window.scrollTo(0, 0);
                                }}
                                className="text-xs font-black text-brand-600 uppercase tracking-widest hover:underline"
                              >
                                View All
                              </button>
                            </div>
                            <div className="grid grid-cols-2 gap-x-12 gap-y-4">
                              {displayCategories.find(c => c.id === activeMegaCat)?.subcategories?.map(sub => (
                                <button
                                  key={sub.id}
                                  onClick={() => {
                                    setSelectedCategory(activeMegaCat);
                                    setSelectedSubCategory(sub.name);
                                    navigate(`/${activeMegaCat}/${sub.id}`);
                                    setIsMegaMenuOpen(false);
                                    window.scrollTo(0, 0);
                                  }}
                                  className="flex items-center gap-3 text-sm font-medium text-gray-500 hover:text-brand-600 transition-colors group text-left"
                                >
                                  <div className="w-1.5 h-1.5 rounded-full bg-gray-200 group-hover:bg-brand-600 transition-colors"></div>
                                  {sub.name}
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="flex justify-between items-center mb-8">
                              <h3 className="text-xl font-black text-gray-900 tracking-tight">Featured Collections</h3>
                              <button onClick={() => { navigate('/products'); setIsMegaMenuOpen(false); window.scrollTo(0, 0); }} className="text-xs font-black text-brand-600 uppercase tracking-widest hover:underline text-gradient">View All</button>
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                              {[
                                { title: 'New Arrivals', color: 'bg-emerald-50', icon: 'fa-sparkles', filter: 'new' },
                                { title: 'Best Sellers', color: 'bg-amber-50', icon: 'fa-fire', filter: 'best' },
                                { title: 'Trending Now', color: 'bg-brand-50', icon: 'fa-bolt', filter: 'trending' },
                                { title: 'Official Stores', color: 'bg-blue-50', icon: 'fa-check-circle', filter: 'official' }
                              ].map((item) => (
                                <div
                                  key={item.title}
                                  onClick={() => {
                                    setSelectedFilter(item.filter);
                                    navigate(`/products?filter=${item.filter}`);
                                    setIsMegaMenuOpen(false);
                                    window.scrollTo(0, 0);
                                  }}
                                  className={`p-8 rounded-[2rem] ${item.color} border border-white group cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all`}
                                >
                                  <h4 className="text-lg font-black text-gray-900 mb-2">{item.title}</h4>
                                  <button className="text-[11px] font-black uppercase tracking-widest text-gray-400 group-hover:text-brand-600 transition-colors flex items-center gap-2">
                                    Shop Now <i className="fas fa-arrow-right text-[10px]"></i>
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="h-6 w-px bg-gray-100"></div>

              {[
                { id: '/', label: 'Home' },
                { id: '/vendors', label: 'Vendors' },
                { id: '/deals', label: 'All Deals' },
                { id: '/dashboard', label: 'Merchant Center', vendorOnly: true }
              ].filter(link => !link.vendorOnly || user?.role === 'vendor').map(link => (
                <button
                  key={link.id}
                  onClick={() => navigate(link.id)}
                  className={`text-[13px] font-black uppercase tracking-widest transition-all relative py-1 ${location.pathname === link.id ? 'text-gradient' : 'text-gray-500 hover:text-brand-600'}`}
                >
                  {link.label}
                  {location.pathname === link.id && (
                    <motion.div layoutId="activeNav" className="absolute -bottom-1 left-0 right-0 h-0.5 gradient-primary rounded-full" />
                  )}
                </button>
              ))}
            </nav>
          </div>
        </div>
      )}



      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      {!isAuthPage && (
        <footer className="bg-[#111827] text-white pt-20 pb-10">
          <div className="container mx-auto px-4">
            <div className={user?.role === 'vendor' ? 'flex flex-col lg:flex-row gap-x-16 gap-y-12 mb-16' : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-x-8 gap-y-12 mb-16'}>
              <div className={user?.role === 'vendor' ? 'lg:w-72 shrink-0 space-y-6' : 'lg:col-span-3 space-y-6'}>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 gradient-primary rounded-xl flex items-center justify-center text-white font-bold text-2xl shadow-xl shadow-brand-500/10">
                    <i className="fas fa-store"></i>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-3xl font-black tracking-tighter text-gradient">Mamu</span>
                    <span className="text-[10px] font-black text-brand-300 tracking-[0.4em] uppercase">Market</span>
                  </div>
                </div>
                <p className="text-gray-400 leading-relaxed text-base font-medium">
                  Bangladesh's premier multi-vendor<br />marketplace since 2025.
                </p>
                <div className="flex gap-3">
                  {['facebook', 'instagram', 'twitter', 'linkedin'].map(social => (
                    <motion.button
                      key={social}
                      whileHover={{ y: -4, scale: 1.1 }}
                      className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center hover:bg-brand-600 transition-all shadow-lg"
                    >
                      <i className={`fab fa-${social} text-lg`}></i>
                    </motion.button>
                  ))}
                </div>
              </div>

              <div className={user?.role === 'vendor' ? 'flex-1' : 'lg:col-span-3'}>
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] mb-6 text-brand-300">Quick Links</h3>
                <ul className="space-y-3 text-gray-400 font-bold text-sm">
                  <li><button onClick={() => handleNav('/about')} className="hover:text-white transition-colors flex items-center gap-2 group"><i className="fas fa-chevron-right text-[6px] opacity-0 group-hover:opacity-100 -ml-3 group-hover:ml-0 transition-all"></i> About Us</button></li>
                  <li><button onClick={() => navigate(user?.role === 'vendor' ? '/vendor-support' : '/contact')} className="hover:text-white transition-colors flex items-center gap-2 group"><i className="fas fa-chevron-right text-[6px] opacity-0 group-hover:opacity-100 -ml-3 group-hover:ml-0 transition-all"></i> {user?.role === 'vendor' ? 'Vendor Support' : 'User Support'}</button></li>
                  <li><button onClick={() => handleNav('/help-center')} className="hover:text-white transition-colors flex items-center gap-2 group"><i className="fas fa-chevron-right text-[6px] opacity-0 group-hover:opacity-100 -ml-3 group-hover:ml-0 transition-all"></i> Help & Support</button></li>
                  {user?.role !== 'vendor' && (
                    <>
                      <li><button onClick={() => navigate('/terms')} className="hover:text-white transition-colors flex items-center gap-2 group"><i className="fas fa-chevron-right text-[6px] opacity-0 group-hover:opacity-100 -ml-3 group-hover:ml-0 transition-all"></i> Terms & Conditions</button></li>
                      <li><button onClick={() => handleNav('/return-policy')} className="hover:text-white transition-colors flex items-center gap-2 group"><i className="fas fa-chevron-right text-[6px] opacity-0 group-hover:opacity-100 -ml-3 group-hover:ml-0 transition-all"></i> Return & Refund Policy</button></li>
                    </>
                  )}
                </ul>
              </div>

              {/* ACCOUNT — vendor only */}
              {user?.role === 'vendor' && (
                <div className="flex-1">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] mb-6 text-brand-300">My Account</h3>
                  <ul className="space-y-3 text-gray-400 font-bold text-sm">
                    <li><button onClick={() => { navigate('/settings'); }} className="hover:text-white transition-colors flex items-center gap-2 group"><i className="fas fa-chevron-right text-[6px] opacity-0 group-hover:opacity-100 -ml-3 group-hover:ml-0 transition-all"></i> Account Settings</button></li>
                    <li><button onClick={() => { navigate('/messages'); }} className="hover:text-white transition-colors flex items-center gap-2 group"><i className="fas fa-chevron-right text-[6px] opacity-0 group-hover:opacity-100 -ml-3 group-hover:ml-0 transition-all"></i> Messages</button></li>
                  </ul>
                </div>
              )}

              {/* ACCOUNT — hidden for vendor */}
              {user?.role !== 'vendor' && (
                <div className="lg:col-span-3">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] mb-6 text-brand-300">Account</h3>
                  <ul className="space-y-3 text-gray-400 font-bold text-sm">
                    <li><button onClick={() => handleNav('/settings', true)} className="hover:text-white transition-colors flex items-center gap-2 group"><i className="fas fa-chevron-right text-[6px] opacity-0 group-hover:opacity-100 -ml-3 group-hover:ml-0 transition-all"></i> My Account</button></li>
                    <li><button onClick={() => handleNav('/orders', true)} className="hover:text-white transition-colors flex items-center gap-2 group"><i className="fas fa-chevron-right text-[6px] opacity-0 group-hover:opacity-100 -ml-3 group-hover:ml-0 transition-all"></i> Order History</button></li>
                    <li><button onClick={() => handleNav('/wishlist', true)} className="hover:text-white transition-colors flex items-center gap-2 group"><i className="fas fa-chevron-right text-[6px] opacity-0 group-hover:opacity-100 -ml-3 group-hover:ml-0 transition-all"></i> Wishlist</button></li>
                    <li><button onClick={() => handleNav('/cart', true)} className="hover:text-white transition-colors flex items-center gap-2 group"><i className="fas fa-chevron-right text-[6px] opacity-0 group-hover:opacity-100 -ml-3 group-hover:ml-0 transition-all"></i> My Cart</button></li>
                  </ul>
                </div>
              )}

              {/* MERCHANT — hidden for vendor */}
              {user?.role !== 'vendor' && (
                <div className="lg:col-span-3">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] mb-6 text-brand-300">Merchant</h3>
                  <ul className="space-y-3 text-gray-400 font-bold text-sm">
                    <li><button onClick={() => { navigate('/affiliate-program'); }} className="hover:text-white transition-colors flex items-center gap-2 group"><i className="fas fa-chevron-right text-[6px] opacity-0 group-hover:opacity-100 -ml-3 group-hover:ml-0 transition-all"></i> Affiliate Program</button></li>
                    {!user && (
                      <li><button onClick={() => { navigate('/vendor-login'); }} className="hover:text-white transition-colors flex items-center gap-2 group"><i className="fas fa-chevron-right text-[6px] opacity-0 group-hover:opacity-100 -ml-3 group-hover:ml-0 transition-all"></i> Vendor Login</button></li>
                    )}
                    <li><button onClick={() => handleNav('/seller-policy')} className="hover:text-white transition-colors flex items-center gap-2 group"><i className="fas fa-chevron-right text-[6px] opacity-0 group-hover:opacity-100 -ml-3 group-hover:ml-0 transition-all"></i> Seller Policies</button></li>
                  </ul>
                </div>
              )}

              {/* 4TH COLUMN — Merchant Tools for vendor */}
              {user?.role === 'vendor' && (
                <div className="flex-1">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] mb-6 text-brand-300">Merchant Tools</h3>
                  <div className="space-y-3">
                    {[
                      { label: 'My Dashboard', path: '/dashboard', icon: 'fa-store' },
                      { label: 'My Store', path: `/vendors/${user.id}`, icon: 'fa-shop' },
                      { label: 'Analytics', path: '/dashboard/analytics', icon: 'fa-chart-pie' },
                      { label: 'Seller Policies', path: '/seller-policy', icon: 'fa-file-contract' },
                    ].map(item => (
                      <button key={item.label} onClick={() => { navigate(item.path); }} className="w-full text-left flex items-center gap-3 text-gray-400 hover:text-white transition-colors text-sm font-medium">
                        <i className={`fas ${item.icon} text-brand-400 w-4`}></i> {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-gray-800 pt-10 flex flex-col md:flex-row justify-between items-center gap-6 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
              <p>© {new Date().getFullYear()} MAMU MARKET INC</p>
              <div className="flex gap-8">
                {user?.role !== 'vendor' && (
                  <>
                    <button onClick={() => handleNav('/privacy')} className="hover:text-white transition-colors">Privacy</button>
                    <button onClick={() => handleNav('/terms')} className="hover:text-white transition-colors">Terms</button>
                  </>
                )}
                <button className="hover:text-white transition-colors">Cookies</button>
              </div>
            </div>
          </div>
        </footer>
      )}

    </div>
  );
};

export default Layout;
