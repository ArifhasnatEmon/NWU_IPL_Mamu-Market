import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { CartItem, Product } from '../types';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';

interface CartContextValue {
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  handleAddToCart: (product: Product) => void;
  removeFromCart: (id: string) => void;
  updateCartQuantity: (id: string, delta: number) => void;
  clearCart: () => void;
  cartLoaded: boolean;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

const LOCAL_CART_KEY = 'mamu_cart';

function loadLocalCart(): CartItem[] {
  try {
    const saved = localStorage.getItem(LOCAL_CART_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch { return []; }
}

function saveLocalCart(items: CartItem[]) {
  try { localStorage.setItem(LOCAL_CART_KEY, JSON.stringify(items)); } catch {}
}

// Merge two cart arrays: union of items, higher quantity wins for duplicates
function mergeCarts(a: CartItem[], b: CartItem[]): CartItem[] {
  const merged = new Map<string, CartItem>();
  for (const item of a) {
    merged.set(item.id, { ...item });
  }
  for (const item of b) {
    const existing = merged.get(item.id);
    if (existing) {
      existing.quantity = Math.max(existing.quantity, item.quantity);
    } else {
      merged.set(item.id, { ...item });
    }
  }
  return Array.from(merged.values());
}

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>(loadLocalCart);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartLoaded, setCartLoaded] = useState(true);

  const { user } = useAuth();
  const prevUserIdRef = useRef<string | null>(null);
  const syncingRef = useRef(false);
  // Cart sync on login
  useEffect(() => {
    const userId = user?.id ?? null;


    if (userId === prevUserIdRef.current) return;
    prevUserIdRef.current = userId;

    if (!userId) {
      return;
    }


    let mounted = true;
    setCartLoaded(false);

    (async () => {
      try {
        const { data, error: dbErr } = await supabase
          .from('carts')
          .select('items')
          .eq('user_id', userId)
          .maybeSingle();

        if (dbErr) throw dbErr;

        const dbItems: CartItem[] = data?.items || [];
        const localItems = loadLocalCart();
        // Merge DB + local, higher qty wins
        const merged = mergeCarts(dbItems, localItems);

        if (mounted) {
          setCart(merged);
          saveLocalCart(merged);
        }
        // Push merged to DB
        if (merged.length > 0) {
          await supabase
            .from('carts')
            .upsert(
              { user_id: userId, items: merged, updated_at: new Date().toISOString() },
              { onConflict: 'user_id' }
            );
        }
      } catch (err) {
        console.error('Cart sync error:', err);

      } finally {
        if (mounted) setCartLoaded(true);
      }
    })();

    return () => { mounted = false; };
  }, [user?.id]);

  // Mirror to localStorage
  useEffect(() => {
    saveLocalCart(cart);
  }, [cart]);

  // Background DB sync
  const syncCartToDB = useCallback(async (items: CartItem[]) => {
    if (!user?.id || syncingRef.current) return;
    syncingRef.current = true;
    try {
      await supabase
        .from('carts')
        .upsert(
          { user_id: user.id, items, updated_at: new Date().toISOString() },
          { onConflict: 'user_id' }
        );
    } catch (err) {
      console.error('Cart DB sync error:', err);
    } finally {
      syncingRef.current = false;
    }
  }, [user?.id]);

  const handleAddToCart = useCallback((product: Product) => {

    if (!product.inStock) {
      window.dispatchEvent(new CustomEvent('cart:outOfStock'));
      return;
    }
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id);
      const maxQty = (product as any).units ? Number((product as any).units) : 999;
      let next: CartItem[];
      if (existing) {

        if (existing.quantity >= maxQty) return prev;
        next = prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      } else {
        next = [...prev, { ...product, quantity: 1 }];
      }
      syncCartToDB(next);
      return next;
    });
    setIsCartOpen(true);
  }, [syncCartToDB]);

  const removeFromCart = useCallback((id: string) => {
    setCart(prev => {
      const next = prev.filter(i => i.id !== id);
      syncCartToDB(next);
      return next;
    });
  }, [syncCartToDB]);

  const updateCartQuantity = useCallback((id: string, delta: number) => {
    setCart(prev => {
      const item = prev.find(i => i.id === id);
      if (!item) return prev;
      if (item.quantity + delta <= 0) {
        const next = prev.filter(i => i.id !== id);
        syncCartToDB(next);
        return next;
      }
      const maxQty = (item as any).units ? Number((item as any).units) : 999;
      if (delta > 0 && item.quantity + delta > maxQty) return prev;
      const next = prev.map(i => i.id === id ? { ...i, quantity: i.quantity + delta } : i);
      syncCartToDB(next);
      return next;
    });
  }, [syncCartToDB]);

  const clearCart = useCallback(async () => {
    // 1. Clear React state
    setCart([]);
    // 2. Clear localStorage directly
    try { localStorage.removeItem(LOCAL_CART_KEY); } catch {}
    // 3. Clear DB directly (bypass syncingRef guard)
    if (user?.id) {
      try {
        await supabase
          .from('carts')
          .upsert(
            { user_id: user.id, items: [], updated_at: new Date().toISOString() },
            { onConflict: 'user_id' }
          );
      } catch (err) {
        console.error('Cart clear DB error:', err);
      }
    }
  }, [user?.id]);

  return (
    <CartContext.Provider value={{ cart, setCart, isCartOpen, setIsCartOpen, handleAddToCart, removeFromCart, updateCartQuantity, clearCart, cartLoaded }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
