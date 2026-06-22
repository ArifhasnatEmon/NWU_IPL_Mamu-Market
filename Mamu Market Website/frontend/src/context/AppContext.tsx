import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation, useNavigationType } from 'react-router-dom';
import { Review, Product, Vendor } from '../types';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';

interface RecentlyViewedItem {
  id: string;
  name: string;
  image: string;
  price: number;
  categoryId?: string;
  rating?: number;
  reviewsCount?: number;
}

interface AppContextValue {
  toast: string | null;
  toastType: 'success' | 'error' | 'info';
  setToast: (msg: string | null, type?: 'success' | 'error' | 'info') => void;
  wishlist: string[];
  setWishlist: React.Dispatch<React.SetStateAction<string[]>>;
  handleToggleWishlist: (productId: string) => void;
  wishlistLoading: boolean;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedCategory: string | null;
  setSelectedCategory: (c: string | null) => void;
  selectedSubCategory: string | null;
  setSelectedSubCategory: (s: string | null) => void;
  selectedFilter: string | null;
  setSelectedFilter: (f: string | null) => void;
  navigateToVendor: (vendor: Vendor) => void;
  handleSelectProduct: (product: Product) => void;
  recentlyViewed: RecentlyViewedItem[];
  trackRecentlyViewed: (product: RecentlyViewedItem) => void;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

// ── Wishlist localStorage helpers (guest fallback + mirror) ──
const LOCAL_WISHLIST_KEY = 'mamu_wishlist';

function loadLocalWishlist(): string[] {
  try {
    const saved = localStorage.getItem(LOCAL_WISHLIST_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch { return []; }
}

function saveLocalWishlist(ids: string[]) {
  try { localStorage.setItem(LOCAL_WISHLIST_KEY, JSON.stringify(ids)); } catch {}
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toast, setToastState] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success');

  const setToast = useCallback((msg: string | null, type?: 'success' | 'error' | 'info') => {
    if (!msg) {
      setToastState(null);
      return;
    }
    setToastState(msg);
    if (type) {
      setToastType(type);
    } else {
      const ERROR_KEYWORDS = ['invalid', 'incorrect', 'wrong', 'failed', 'error', 'denied', 'rejected', 'not found', 'already registered', 'cannot', 'pending', 'please sign in', 'please use', 'not a merchant', 'out of stock', 'please fill', 'please add', 'please upload', 'please select', 'storage limit', 'exceeded', 'too many', 'please wait', 'suspended', 'unauthorized', 'must', 'required'];
      const isError = ERROR_KEYWORDS.some(k => msg.toLowerCase().includes(k));
      setToastType(isError ? 'error' : 'success');
    }
  }, []);

  const [wishlist, setWishlist] = useState<string[]>(loadLocalWishlist);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const wishlistSyncedRef = useRef(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);
  const [recentlyViewed, setRecentlyViewed] = useState<RecentlyViewedItem[]>([]);

  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const prevUserIdRef = useRef<string | null>(null);
  // Wishlist sync on login
  useEffect(() => {
    const userId = user?.id ?? null;


    if (userId === prevUserIdRef.current) return;
    prevUserIdRef.current = userId;

    if (!userId) {
      wishlistSyncedRef.current = false;
      return;
    }


    let mounted = true;
    setWishlistLoading(true);

    (async () => {
      try {

        const { data, error: dbErr } = await supabase
          .from('wishlists')
          .select('product_ids')
          .eq('user_id', userId)
          .maybeSingle();

        if (dbErr) throw dbErr;

        const dbIds: string[] = data?.product_ids || [];
        const localIds = loadLocalWishlist();
        // Merge DB + local
        const merged = [...new Set([...dbIds, ...localIds])];

        if (mounted) {
          setWishlist(merged);
          saveLocalWishlist(merged);
        }
        // Push merged to DB if changed
        if (merged.length !== dbIds.length || !dbIds.every(id => merged.includes(id))) {
          await supabase
            .from('wishlists')
            .upsert(
              { user_id: userId, product_ids: merged, updated_at: new Date().toISOString() },
              { onConflict: 'user_id' }
            );
        }

        wishlistSyncedRef.current = true;
      } catch (err) {
        console.error('Wishlist sync error:', err);

      } finally {
        if (mounted) setWishlistLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, [user?.id]);

  // Mirror to localStorage
  useEffect(() => {
    saveLocalWishlist(wishlist);
  }, [wishlist]);

  // Background DB sync
  const syncWishlistToDB = useCallback(async (ids: string[]) => {
    if (!user?.id) return;
    try {
      await supabase
        .from('wishlists')
        .upsert(
          { user_id: user.id, product_ids: ids, updated_at: new Date().toISOString() },
          { onConflict: 'user_id' }
        );
    } catch (err) {
      console.error('Wishlist DB sync error:', err);
    }
  }, [user?.id]);

  const handleToggleWishlist = useCallback((productId: string) => {
    setWishlist(prev => {
      const isWishlisted = prev.includes(productId);
      const next = isWishlisted
        ? prev.filter(id => id !== productId)
        : [...prev, productId];


      setToast(isWishlisted ? 'Removed from wishlist' : 'Added to wishlist!');
      syncWishlistToDB(next);
      return next;
    });
  }, [syncWishlistToDB]);


  const navType = useNavigationType();


  useEffect(() => {
    const key = `scroll-${location.key}`;
    const handleScroll = () => {
      sessionStorage.setItem(key, String(window.scrollY));
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [location.key]);


  useEffect(() => {
    if (navType === 'POP') {
      const key = `scroll-${location.key}`;
      const saved = sessionStorage.getItem(key);
      if (saved) {
        setTimeout(() => window.scrollTo(0, parseInt(saved, 10)), 0);
      }
    } else {
      window.scrollTo(0, 0);
    }
  }, [location.pathname, location.key, navType]);

  useEffect(() => {
    const handleCartAuthRequired = () => {
      setToast('Please sign in to add items to your cart');
      setTimeout(() => navigate('/user-login'), 100);
    };
    window.addEventListener('cart:authRequired', handleCartAuthRequired);
    return () => window.removeEventListener('cart:authRequired', handleCartAuthRequired);
  }, [navigate]);

  useEffect(() => {
    const handleOutOfStock = () => {
      setToast('Sorry, this product is out of stock.');
    };
    window.addEventListener('cart:outOfStock', handleOutOfStock);
    return () => window.removeEventListener('cart:outOfStock', handleOutOfStock);
  }, []);

  useEffect(() => {
    const handleAuthLogout = () => {
      setToast('Logged out successfully');
    };
    window.addEventListener('auth:logout', handleAuthLogout);
    return () => window.removeEventListener('auth:logout', handleAuthLogout);
  }, []);

  useEffect(() => {
    const handleQuota = () => setToast('Storage full! Please clear some data from Settings.');
    window.addEventListener('storage:quotaExceeded', handleQuota);
    return () => window.removeEventListener('storage:quotaExceeded', handleQuota);
  }, []);

  const navigateToVendor = (vendor: Vendor) => {
    navigate(`/vendors/${vendor.id}`);
  };

  const handleSelectProduct = (product: Product) => {
    navigate(`/products/${product.id}`);
  };

  const trackRecentlyViewed = (product: RecentlyViewedItem) => {
    setRecentlyViewed(prev => {
      const filtered = prev.filter(p => p.id !== product.id);
      return [product, ...filtered].slice(0, 8);
    });
  };

  return (
    <AppContext.Provider value={{
      toast, toastType, setToast,
      wishlist, setWishlist,
      handleToggleWishlist,
      wishlistLoading,
      searchQuery, setSearchQuery,
      selectedCategory, setSelectedCategory,
      selectedSubCategory, setSelectedSubCategory,
      selectedFilter, setSelectedFilter,
      navigateToVendor, handleSelectProduct,
      recentlyViewed, trackRecentlyViewed
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
