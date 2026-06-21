import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Product, Vendor } from '../../types';
import { CATEGORIES, getCategoryName } from '../../config';
import ProductCard from '../../components/product/ProductCard';
import SkeletonCard from '../../components/ui/SkeletonCard';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useApp } from '../../context/AppContext';
import { useSharedProducts, useSharedVendors, useSharedCategories } from '../../context/DataContext';
import PageTitle from '../../components/PageTitle';
import { Category } from '../../types';

const ProductsView: React.FC<{
  initialCategory?: string | null,
  initialSubCategory?: string | null,
  initialFilter?: string | null,
}> = ({ initialCategory, initialSubCategory, initialFilter }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { handleAddToCart } = useCart();
  const {
    wishlist, handleToggleWishlist, searchQuery,
    handleSelectProduct, navigateToVendor
  } = useApp();
  const userRole = user?.role;
  const { categories: customCategories, loading: catLoading } = useSharedCategories();

  // Use dynamic categories, fallback to static
  const displayCategories = customCategories && customCategories.length > 0 ? customCategories : CATEGORIES;
  const [minPrice, setMinPrice] = useState<number>(0);
  const [maxPrice, setMaxPrice] = useState<number>(500000);
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [selectedVendors, setSelectedVendors] = useState<string[]>([]);
  const [onlyOnSale, setOnlyOnSale] = useState<boolean>(false);
  const [wishlistOnly, setWishlistOnly] = useState(false);
  const [selectedCat, setSelectedCat] = useState<string | null>(initialCategory || null);
  const [selectedSubCat, setSelectedSubCat] = useState<string | null>(initialSubCategory || null);
  const [sortBy, setSortBy] = useState<string>('newest');
  const [stockFilter, setStockFilter] = useState<'all' | 'in' | 'out'>('all');
  const [expandedCats, setExpandedCats] = useState<string[]>(initialCategory ? [initialCategory] : []);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const { products: approvedProducts, loading: productsLoading } = useSharedProducts();
  const { vendors: fetchedVendors } = useSharedVendors();
  const [isLoading, setIsLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(9);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [searchParams] = useSearchParams();
  const customCatParam = searchParams.get('customCat');
  const customSubParam = searchParams.get('customSub');
  const urlFilterParam = searchParams.get('filter');
  const BATCH_SIZE = 9;

  useEffect(() => {
    if (!productsLoading) {
      const t = setTimeout(() => setIsLoading(false), 600);
      return () => clearTimeout(t);
    } else {
      setIsLoading(true);
    }
  }, [productsLoading]);

  useEffect(() => {
    setVisibleCount(9);
  }, [selectedCat, selectedSubCat, minPrice, maxPrice, sortBy, stockFilter, searchQuery, selectedRating, selectedVendors, onlyOnSale, wishlistOnly, customCatParam, customSubParam, viewMode]);

  useEffect(() => {
    const checkSentinel = () => {
      const sentinel = sentinelRef.current;
      if (!sentinel) return;
      const rect = sentinel.getBoundingClientRect();
      if (rect.top <= window.innerHeight + 300) {
        setVisibleCount(prev => prev + BATCH_SIZE);
      }
    };
    window.addEventListener('scroll', checkSentinel, { passive: true });
    return () => window.removeEventListener('scroll', checkSentinel);
  }, []);

  useEffect(() => {
    if (initialCategory !== undefined) {
      setSelectedCat(initialCategory);
      setSelectedSubCat(initialSubCategory || null);
      if (initialCategory) {
        setExpandedCats(prev => prev.includes(initialCategory) ? prev : [...prev, initialCategory]);
      }
      window.scrollTo(0, 0);
    } else {
      setSelectedCat(null);
      setSelectedSubCat(null);
    }
  }, [initialCategory, initialSubCategory]);

  const toggleExpand = (catId: string) => {
    setExpandedCats(prev =>
      prev.includes(catId) ? [] : [catId]
    );
  };

  const dynamicProds = useMemo(() => {
    return approvedProducts.map((p: Product) => {
      const price = Number(p.price) || 0;
      const originalPrice = Number(p.originalPrice) || Math.round(price * 1.2);
      const rating = typeof p.rating === 'number' ? p.rating : (Number(p.rating) || 0);
      const matchedVendor = fetchedVendors.find(v => v.id === p.vendorId);
      const vendorDisplayName = matchedVendor?.storeName || matchedVendor?.name || p.vendor || p.vendorName || 'Unknown Vendor';
      return {
        ...p,
        id: p.id,
        name: p.productName || p.name || '',
        price,
        originalPrice,
        rating,
        reviewsCount: p.reviewsCount || 0,
        isSale: p.isSale === true || (p.isSale as any) === 'true',
        image: p.image || p.mainImage || `https://picsum.photos/seed/${p.id}/400/400`,
        images: [p.mainImage, p.extraImage1, p.extraImage2, p.extraImage3].filter(Boolean),
        categoryId: p.category?.toLowerCase().replace(/\s+/g, '-') || 'general',
        subcategory: p.subcategory || '',
        category: getCategoryName(p.category) || p.category || 'General',
        vendorId: p.vendorId,
        vendor: vendorDisplayName,
        isNew: (() => {
          if (p.isNew === false || (p.isNew as any) === 'false') return false;
          const added = p.approvedAt || (p as any).createdAt;
          if (!added) return false;
          return (Date.now() - new Date(added).getTime()) / (1000 * 60 * 60 * 24) <= 30;
        })(),
        inStock: p.inStock !== false && (p.inStock as any) !== 'false' && (Number(p.units) || 0) > 0,
        description: p.description || '',
        colors: p.colors || [],
        reviews: p.reviews || []
      };
    });
  }, [approvedProducts, fetchedVendors]);

  const allProducts = useMemo(() => {
    return dynamicProds;
  }, [dynamicProds]);

  const filtered = useMemo(() => {
    return allProducts.filter(p => {
      if (selectedCat && p.categoryId !== selectedCat) return false;
      if (customCatParam && !selectedCat) {
        const productCat = (p.category || (p as any).categoryName || '').toLowerCase();
        if (productCat !== customCatParam.toLowerCase()) return false;
      }
      if (customSubParam) {
        const productSub = (p.subcategory || (p as any).subCategoryName || '').toLowerCase();
        if (productSub !== customSubParam.toLowerCase()) return false;
      }
      if (selectedSubCat && p.subcategory?.toLowerCase() !== selectedSubCat.toLowerCase()) return false;
      if (p.price < minPrice || p.price > maxPrice) return false;
      if (selectedRating && p.rating < selectedRating) return false;
      if (selectedVendors.length > 0 && !selectedVendors.includes(p.vendorId)) return false;
      if (onlyOnSale && !p.isSale) return false;
      if (wishlistOnly && !wishlist.includes(p.id)) return false;

      const activeFilter = urlFilterParam || initialFilter;
      if (activeFilter === 'new' && !p.isNew) return false;
      if (activeFilter === 'best' && p.rating < 4.8) return false;
      const calculateTrendScore = (prod: any) => {
        const reviewScore = (prod.reviewsCount || 0) * 0.5;
        const ratingScore = (prod.rating || 0) * 10;
        const saleBonus = prod.isSale ? 20 : 0;
        return reviewScore + ratingScore + saleBonus;
      };

      if (activeFilter === 'trending' && calculateTrendScore(p) < 50) return false;
      if (activeFilter === 'deals' && !p.isSale) return false;
      if (activeFilter === 'daily' && (!p.isSale || p.price > 3000)) return false;
      if (activeFilter === 'weekly' && (!p.isSale || (p.price > 2000 && p.price < 5000))) return false;
      if (activeFilter === 'monthly' && (!p.isSale || p.price < 2000)) return false;
      if (activeFilter === 'official' && !p.vendor.includes('Official')) return false;

      // Filter out out-of-stock items from curated collections to prevent a bad customer experience
      const isCuratedCollection = ['new', 'best', 'trending', 'deals', 'daily', 'weekly', 'monthly', 'official'].includes(activeFilter);
      const isOutOfStock = (p.inStock as any) === false || (p.inStock as any) === 'false' || p.stockStatus === 'out_of_stock' || p.stockStatus === 'discontinued';
      if (isCuratedCollection && isOutOfStock && stockFilter !== 'out') return false;

      if (stockFilter === 'in' && !p.inStock) return false;
      if (stockFilter === 'out' && p.inStock) return false;

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.subcategory?.toLowerCase().includes(q) ||
          p.keywords?.some((k: string) => k.toLowerCase().includes(q))
        );
      }
      return true;
    }).sort((a, b) => {
      // Sort out-of-stock and discontinued items to the very bottom
      const aIsOutOfStock = (a.inStock as any) === false || (a.inStock as any) === 'false' || a.stockStatus === 'out_of_stock' || a.stockStatus === 'discontinued';
      const bIsOutOfStock = (b.inStock as any) === false || (b.inStock as any) === 'false' || b.stockStatus === 'out_of_stock' || b.stockStatus === 'discontinued';

      if (aIsOutOfStock && !bIsOutOfStock) return 1;
      if (!aIsOutOfStock && bIsOutOfStock) return -1;

      if (sortBy === 'price-low') return a.price - b.price;
      if (sortBy === 'price-high') return b.price - a.price;
      if (sortBy === 'popular') return b.reviewsCount - a.reviewsCount;
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'discount') {
        const discA = a.isSale ? (a.originalPrice - a.price) / a.originalPrice : 0;
        const discB = b.isSale ? (b.originalPrice - b.price) / b.originalPrice : 0;
        return discB - discA;
      }
      const aNum = parseInt(String(a.id));
      const bNum = parseInt(String(b.id));
      const aIsNew = !isNaN(aNum);
      const bIsNew = !isNaN(bNum);
      if (aIsNew && bIsNew) return bNum - aNum;
      if (aIsNew && !bIsNew) return -1;
      return 0;
    });
  }, [allProducts, selectedCat, customCatParam, customSubParam, selectedSubCat, minPrice, maxPrice, selectedRating, selectedVendors, onlyOnSale, wishlistOnly, initialFilter, urlFilterParam, stockFilter, searchQuery, sortBy, wishlist]);

  const finalProducts = filtered;

  const visibleProducts = useMemo(() => finalProducts.slice(0, visibleCount), [finalProducts, visibleCount]);
  const hasMore = useMemo(() => visibleCount < finalProducts.length, [visibleCount, finalProducts.length]);


  const dynamicVendors = useMemo(() => {
    return fetchedVendors.filter(u => u.status === 'approved' || u.status === 'active')
      .map((u: Record<string, any>): Vendor => {
        const vendorProducts = approvedProducts.filter(p => p.vendorId === u.id);
        const ratedProducts = vendorProducts.filter(p => p.rating > 0);
        const computedRating = ratedProducts.length > 0
          ? Math.round((ratedProducts.reduce((sum, p) => sum + p.rating, 0) / ratedProducts.length) * 10) / 10
          : 0;
        return {
          id: u.id,
          name: u.name,
          storeName: u.name,
          avatar: u.logo,
          logo: u.logo,
          banner: u.banner,
          category: u.category,
          rating: computedRating,
          productsCount: vendorProducts.length,
          verified: u.verified || false,
          joinedDate: u.joinedDate || new Date().toISOString(),
          description: u.description || '',
          storeCity: u.storeCity,
          socialFacebook: u.socialFacebook,
          socialInstagram: u.socialInstagram,
          socialYoutube: u.socialYoutube,
          socialWhatsapp: u.socialWhatsapp,
        };
      });
  }, [fetchedVendors, approvedProducts]);
  const topVendors = useMemo(() => [...dynamicVendors].sort((a, b) => b.rating - a.rating).slice(0, 3), [dynamicVendors]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="container mx-auto px-4 py-16"
    >
      <PageTitle title={selectedSubCat ? selectedSubCat : selectedCat ? (displayCategories.find(c => c.id === selectedCat)?.name || 'Products') : customSubParam ? customSubParam : customCatParam ? customCatParam : 'All Products'} />
      <div className="flex flex-col lg:flex-row gap-16">
        {/* Mobile Filter Toggle */}
        <div className="lg:hidden flex items-center justify-between gap-4 mb-8">
          <button
            onClick={() => setShowMobileFilters(true)}
            className="flex-1 py-4 bg-white border border-gray-100 rounded-2xl flex items-center justify-center gap-3 font-black text-xs uppercase tracking-widest text-gray-900 shadow-sm"
          >
            <i className="fas fa-filter text-brand-600"></i>
            Filter & Sort
          </button>
          <div className="flex items-center bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('grid')}
              className={`w-12 h-12 flex items-center justify-center rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-400'}`}
            >
              <i className="fas fa-th-large"></i>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`w-12 h-12 flex items-center justify-center rounded-lg transition-all ${viewMode === 'list' ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-400'}`}
            >
              <i className="fas fa-list"></i>
            </button>
          </div>
        </div>

        {/* Redesigned Premium Sidebar */}
        <aside className={`lg:w-[340px] shrink-0 ${showMobileFilters ? 'fixed inset-0 z-[100] bg-white/95 backdrop-blur-2xl p-6 overflow-y-auto' : 'hidden lg:block'}`}>
          {showMobileFilters && (
            <div className="flex items-center justify-between mb-8 lg:hidden">
              <h2 className="text-3xl font-black text-gray-900 tracking-tight">Filters</h2>
              <button onClick={() => setShowMobileFilters(false)} className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-900 hover:bg-gray-100 transition-colors">
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>
          )}
          <div className="sticky top-24 h-[calc(100vh-110px)] overflow-y-auto custom-scrollbar lg:pr-2">

            <div className="bg-white/70 backdrop-blur-xl border border-white/40 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2.5rem] p-8 space-y-10">

              {/* Categories */}
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600">
                    <i className="fas fa-layer-group text-xs"></i>
                  </div>
                  <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Categories</h3>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => {
                      setSelectedCat(null);
                      setSelectedSubCat(null);
                      navigate('/products');
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all ${!selectedCat && !customCatParam ? 'bg-gray-900 text-white shadow-lg shadow-gray-900/20' : 'text-gray-500 hover:bg-gray-50'}`}
                  >
                    <i className="fas fa-globe text-xs opacity-70"></i>
                    <span>All Products</span>
                  </button>

                  {displayCategories.map(cat => (
                    <div key={cat.id} className="space-y-1">
                      <button
                        onClick={() => {
                          if (selectedCat === cat.id) toggleExpand(cat.id);
                          else { navigate(`/${cat.id}`); toggleExpand(cat.id); }
                        }}
                        className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl text-sm font-bold transition-all ${selectedCat === cat.id ? 'bg-gray-900 text-white shadow-lg shadow-gray-900/20' : 'text-gray-500 hover:bg-gray-50'}`}
                      >
                        <div className="flex items-center gap-3">
                          <i className={`fas ${cat.icon || 'fa-tag'} text-xs opacity-70`}></i>
                          <span>{cat.name}</span>
                        </div>
                        <i className={`fas fa-chevron-right text-[10px] transition-transform duration-300 ${expandedCats.includes(cat.id) ? 'rotate-90' : ''}`}></i>
                      </button>

                      <AnimatePresence>
                        {expandedCats.includes(cat.id) && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden space-y-1"
                          >
                            <div className="pl-6 pr-2 py-2 border-l-2 border-gray-100 ml-6 mt-1 space-y-1">
                              {cat.subcategories?.map(sub => (
                                <button
                                  key={sub.name}
                                  onClick={() => {
                                    if (selectedSubCat === sub.name) navigate(`/${cat.id}`);
                                    else navigate(`/${cat.id}/${sub.id}`);
                                  }}
                                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all ${selectedSubCat === sub.name ? 'bg-brand-50 text-brand-600' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-50'}`}
                                >
                                  <div className={`w-1.5 h-1.5 rounded-full ${selectedSubCat === sub.name ? 'bg-brand-500' : 'bg-transparent'}`}></div>
                                  <span>{sub.name}</span>
                                </button>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}

                  {/* Custom Categories from URL Params */}
                  {(() => {
                    const params = new URLSearchParams(window.location.search);
                    const activeCat = params.get('customCat');
                    if (!activeCat) return null;
                    return customCategories.map((cat: Category) => (
                      <div key={cat.id} className="space-y-1">
                        <button
                          onClick={() => {
                            if (activeCat === cat.name) navigate('/products');
                            else { navigate('/products?customCat=' + encodeURIComponent(cat.name)); window.scrollTo(0, 0); }
                          }}
                          className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl text-sm font-bold transition-all ${activeCat === cat.name ? 'bg-gray-900 text-white shadow-lg shadow-gray-900/20' : 'text-gray-500 hover:bg-gray-50'}`}
                        >
                          <div className="flex items-center gap-3">
                            <i className="fas fa-tag text-xs opacity-70"></i>
                            <span>{cat.name}</span>
                          </div>
                          <i className={`fas fa-chevron-right text-[10px] transition-transform duration-300 ${activeCat === cat.name ? 'rotate-90' : ''}`}></i>
                        </button>
                        {activeCat === cat.name && (cat.subcategories || []).length > 0 && (
                          <div className="pl-6 pr-2 py-2 border-l-2 border-gray-100 ml-6 mt-1 space-y-1">
                            {((cat as any).subcategories || []).map((sub: any) => (
                              <button
                                key={sub.id}
                                onClick={() => navigate('/products?customCat=' + encodeURIComponent(cat.name) + '&customSub=' + encodeURIComponent(sub.name))}
                                className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all ${params.get('customSub') === sub.name ? 'bg-brand-50 text-brand-600' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-50'}`}
                              >
                                <div className={`w-1.5 h-1.5 rounded-full ${params.get('customSub') === sub.name ? 'bg-brand-500' : 'bg-transparent'}`}></div>
                                <span>{sub.name}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ));
                  })()}
                </div>
              </div>

              <hr className="border-gray-100" />

              {/* Price Range */}
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <i className="fas fa-wallet text-xs"></i>
                  </div>
                  <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Price Range</h3>
                </div>

                <div className="px-1 space-y-8">
                  <div className="relative h-2 bg-gray-100 rounded-full">
                    <div
                      className="absolute top-0 left-0 h-full bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.4)]"
                      style={{
                        left: `${(minPrice / 500000) * 100}%`,
                        width: `${((maxPrice - minPrice) / 500000) * 100}%`
                      }}
                    ></div>
                    <input
                      type="range" min="0" max="500000" step="1000"
                      value={minPrice}
                      onChange={(e) => setMinPrice(Math.min(Number(e.target.value), maxPrice))}
                      className="absolute top-0 left-0 w-full h-2 bg-transparent appearance-none cursor-pointer accent-emerald-500 z-10 pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-md"
                    />
                    <input
                      type="range" min="0" max="500000" step="1000"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(Math.max(Number(e.target.value), minPrice))}
                      className="absolute top-0 left-0 w-full h-2 bg-transparent appearance-none cursor-pointer accent-emerald-500 z-10 pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-md"
                    />
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-1 relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-black">৳</span>
                      <input
                        type="number"
                        value={minPrice === 0 ? '' : minPrice}
                        onChange={(e) => setMinPrice(e.target.value === '' ? 0 : Number(e.target.value))}
                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-8 pr-4 py-3 text-sm font-black text-gray-900 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                        placeholder="Min"
                      />
                    </div>
                    <div className="flex items-center text-gray-300">-</div>
                    <div className="flex-1 relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-black">৳</span>
                      <input
                        type="number"
                        value={maxPrice === 500000 ? '' : maxPrice}
                        onChange={(e) => setMaxPrice(e.target.value === '' ? 500000 : Number(e.target.value))}
                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-8 pr-4 py-3 text-sm font-black text-gray-900 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                        placeholder="Max"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <hr className="border-gray-100" />

              {/* Toggles */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Availability</h3>
                  <div className="flex p-1 bg-gray-100 rounded-2xl">
                    {[
                      { id: 'all', label: 'All' },
                      { id: 'in', label: 'In Stock' },
                      { id: 'out', label: 'Out of Stock' }
                    ].map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => setStockFilter(opt.id as any)}
                        className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all truncate px-1 ${stockFilter === opt.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Minimum Rating</h3>
                  <div className="flex gap-2">
                    {[null, 3, 4, 4.5].map(r => (
                      <button
                        key={String(r)}
                        onClick={() => setSelectedRating(selectedRating === r ? null : r)}
                        className={`flex-1 py-2.5 rounded-2xl text-[10px] font-bold transition-all border-2 flex items-center justify-center gap-1 ${selectedRating === r ? 'border-amber-400 bg-amber-50 text-amber-600' : 'border-gray-100 text-gray-400 hover:border-amber-200 hover:text-amber-500 hover:bg-amber-50/30'}`}
                      >
                        {r === null ? 'Any' : <>{r}<i className="fas fa-star text-[10px]"></i></>}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setOnlyOnSale(!onlyOnSale)}
                    className={`flex items-center justify-center gap-2 py-3 rounded-2xl text-[9px] font-bold uppercase tracking-widest transition-all border-2 ${onlyOnSale ? 'border-rose-500 bg-rose-50 text-rose-600' : 'border-gray-100 text-gray-400 hover:border-rose-200 hover:text-rose-500 hover:bg-rose-50/30'}`}
                  >
                    <i className="fas fa-tag"></i> On Sale
                  </button>

                  {userRole !== 'vendor' && (
                    <button
                      onClick={() => setWishlistOnly(!wishlistOnly)}
                      className={`flex items-center justify-center gap-2 py-3 rounded-2xl text-[9px] font-bold uppercase tracking-widest transition-all border-2 ${wishlistOnly ? 'border-brand-500 bg-brand-50 text-brand-600' : 'border-gray-100 text-gray-400 hover:border-brand-200 hover:text-brand-500 hover:bg-brand-50/30'}`}
                    >
                      <i className="fas fa-heart"></i> Wishlist
                    </button>
                  )}
                </div>
              </div>

              <hr className="border-gray-100" />

              {/* Top Vendors */}
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                      <i className="fas fa-store text-xs"></i>
                    </div>
                    <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest">Top Brands</h3>
                  </div>
                  <button onClick={() => navigate('/vendors/top')} className="text-[9px] font-black text-brand-600 uppercase tracking-widest hover:text-brand-700">View All</button>
                </div>

                <div className="space-y-4">
                  {topVendors.map(vendor => (
                    <div key={vendor.id} className="flex items-center gap-4 group cursor-pointer" onClick={() => navigateToVendor(vendor)}>
                      <div className="w-12 h-12 rounded-[1rem] overflow-hidden bg-gray-50 border border-gray-100 flex items-center justify-center shadow-sm relative group-hover:shadow-md transition-all">
                        {vendor.logo ? (
                          <img src={vendor.logo || 'https://via.placeholder.com/150?text=Logo'} referrerPolicy="no-referrer" className="w-full h-full object-cover" alt={vendor.name} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-black text-white" style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}>
                            {(vendor.name || 'V').charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors"></div>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-xs font-black text-gray-900 group-hover:text-brand-600 transition-colors">{vendor.name}</h4>
                        <div className="flex items-center gap-1.5 mt-1">
                          <i className="fas fa-star text-amber-400 text-[9px]"></i>
                          <span className="text-[10px] font-bold text-gray-500">{vendor.rating} <span className="text-gray-300 mx-1">•</span> {vendor.productsCount} items</span>
                        </div>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-brand-50 group-hover:text-brand-600 transition-colors">
                        <i className="fas fa-chevron-right text-[10px]"></i>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reset Button */}
              <button
                onClick={() => {
                  setSelectedCat(null);
                  setMinPrice(0);
                  setMaxPrice(500000);
                  setSelectedRating(null);
                  setSelectedVendors([]);
                  setOnlyOnSale(false);
                  setWishlistOnly(false);
                  setStockFilter('all');
                }}
                className="w-full py-3.5 rounded-2xl text-[9px] font-bold uppercase tracking-widest border-2 border-dashed border-gray-200 text-gray-400 hover:border-red-300 hover:text-red-500 hover:bg-red-50/50 transition-all flex items-center justify-center gap-2"
              >
                <i className="fas fa-redo-alt"></i> Reset All Filters
              </button>

              {showMobileFilters && (
                <div className="pt-4 lg:hidden">
                  <button
                    onClick={() => setShowMobileFilters(false)}
                    className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-gray-900/20"
                  >
                    Apply Filters
                  </button>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Content */}
        <div className="flex-1">
          {(() => {
            const chips: { label: string; onRemove: () => void }[] = [];
            if (selectedCat) chips.push({ label: displayCategories.find(c => c.id === selectedCat)?.name || selectedCat, onRemove: () => setSelectedCat(null) });
            if (selectedSubCat) chips.push({ label: selectedSubCat, onRemove: () => setSelectedSubCat(null) });
            if (onlyOnSale) chips.push({ label: 'On Sale', onRemove: () => setOnlyOnSale(false) });
            if (selectedRating) chips.push({ label: `${selectedRating}★+`, onRemove: () => setSelectedRating(null) });
            if (wishlistOnly) chips.push({ label: 'Wishlisted', onRemove: () => setWishlistOnly(false) });
            if (minPrice > 0) chips.push({ label: `Min ৳${minPrice}`, onRemove: () => setMinPrice(0) });
            if (maxPrice < 500000) chips.push({ label: `Max ৳${maxPrice}`, onRemove: () => setMaxPrice(500000) });
            if (stockFilter !== 'all') chips.push({ label: stockFilter === 'in' ? 'In Stock' : 'Out of Stock', onRemove: () => setStockFilter('all') });
            if (chips.length === 0) return null;
            return (
              <div className="flex flex-wrap gap-2 mb-6">
                {chips.map(chip => (
                  <span key={chip.label} className="flex items-center gap-1.5 bg-brand-50 text-brand-600 px-3 py-1.5 rounded-full text-xs font-black">
                    {chip.label}
                    <button onClick={chip.onRemove} className="hover:text-brand-800 ml-0.5"><i className="fas fa-times text-[9px]"></i></button>
                  </span>
                ))}
              </div>
            );
          })()}
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-12">
            <div>
              <h2 className="text-4xl font-black text-gray-900 tracking-tight text-gradient">
                {selectedCat ? displayCategories.find(c => c.id === selectedCat)?.name : customSubParam ? customSubParam : customCatParam ? customCatParam : 'Explore All'}
              </h2>
              <p className="text-gray-500 font-medium mt-1">Showing {filtered.length} curated products</p>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center bg-gray-100 p-1 rounded-xl">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  <i className="fas fa-th-large"></i>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all ${viewMode === 'list' ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  <i className="fas fa-list"></i>
                </button>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-brand-500/20 cursor-pointer"
                >
                  <option value="newest">Newest First</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="popular">Most Popular</option>
                  <option value="rating">Top Rated</option>
                  <option value="discount">Biggest Discount</option>
                </select>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className={viewMode === 'grid' ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6" : "flex flex-col gap-6"}>
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} viewMode={viewMode} />
              ))}
            </div>
          ) : filtered.length > 0 ? (
            <>
              <div className={viewMode === 'grid' ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6" : "flex flex-col gap-6"}>
                {visibleProducts.map((p, idx) => (
                  <div key={p.id}>
                    <ProductCard
                      product={p}
                      onAddToCart={handleAddToCart}
                      onSelect={() => handleSelectProduct(p)}
                      onToggleWishlist={handleToggleWishlist}
                      isWishlisted={wishlist.includes(p.id)}
                      userRole={userRole}
                      viewMode={viewMode}
                    />
                  </div>
                ))}
              </div>
              <div ref={sentinelRef} className="h-16 flex items-center justify-center mt-8">
                {hasMore && (
                  <div className="flex items-center gap-3 text-gray-400">
                    <div className="w-4 h-4 border-2 border-brand-600 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-xs font-black uppercase tracking-widest">Loading more...</span>
                  </div>
                )}
              </div>
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-32 text-center bg-white rounded-[4rem] border-2 border-dashed border-gray-100"
            >
              <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-8">
                <i className="fas fa-search text-4xl text-gray-200"></i>
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-3">No matches found</h3>
              <p className="text-gray-500 font-medium max-w-xs mx-auto">Try adjusting your filters or search terms to find what you're looking for.</p>
              <button
                onClick={() => {
                  setSelectedCat(null);
                  setMinPrice(0);
                  setMaxPrice(100000);
                  setSelectedRating(null);
                  setSelectedVendors([]);
                  setOnlyOnSale(false);
                  setWishlistOnly(false);
                  setStockFilter('all');
                }}
                className="mt-8 px-8 py-3 bg-gray-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-gray-800 transition-colors"
              >
                Clear All Filters
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default ProductsView;

