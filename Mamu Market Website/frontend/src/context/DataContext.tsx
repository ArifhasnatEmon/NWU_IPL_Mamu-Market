import React, { createContext, useContext } from 'react';
import { Product, Vendor, Category } from '../types';
import { useApprovedProducts } from '../hooks/useProducts';
import { useVendors as useVendorsHook } from '../hooks/useVendors';
import { useCategories as useCategoriesHook } from '../hooks/useSecondary';
import { useGlobalSettings } from '../hooks/useMarketing';

interface DataContextValue {
  approvedProducts: Product[];
  productsLoading: boolean;
  vendors: Vendor[];
  vendorsLoading: boolean;
  refreshVendors: () => void;
  categories: Category[];
  categoriesLoading: boolean;
  refreshCategories: () => Promise<void>;
  addCategory: (name: string, icon?: string) => Promise<boolean>;
  removeCategory: (id: string) => Promise<boolean>;
  addSubCategory: (parentId: string, name: string) => Promise<boolean>;
  removeSubCategory: (id: string) => Promise<boolean>;
  sponsoredProductIds: string[];
}

const DataContext = createContext<DataContextValue | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { products: approvedProducts, loading: productsLoading } = useApprovedProducts();
  const { vendors, loading: vendorsLoading, refresh: refreshVendors } = useVendorsHook();
  const {
    categories,
    loading: categoriesLoading,
    refreshCategories,
    addCategory,
    removeCategory,
    addSubCategory,
    removeSubCategory,
  } = useCategoriesHook();

  const { setting: sponsoredPinned } = useGlobalSettings('sponsored_products');
  
  const sponsoredProductIds = React.useMemo(() => {
    if (!sponsoredPinned) return [];
    const now = Date.now();
    return sponsoredPinned
      .filter((x: any) => typeof x === 'string' || !x.expiresAt || new Date(x.expiresAt).getTime() > now)
      .map((x: any) => typeof x === 'string' ? x : x.id);
  }, [sponsoredPinned]);

  return (
    <DataContext.Provider value={{
      approvedProducts,
      productsLoading,
      vendors,
      vendorsLoading,
      refreshVendors,
      categories,
      categoriesLoading,
      refreshCategories,
      addCategory,
      removeCategory,
      addSubCategory,
      removeSubCategory,
      sponsoredProductIds,
    }}>
      {children}
    </DataContext.Provider>
  );
};

/** Shared approved products — single subscription, many consumers */
export const useSharedProducts = () => {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useSharedProducts must be used within DataProvider');
  return { products: ctx.approvedProducts, loading: ctx.productsLoading };
};

/** Shared vendors — single subscription, many consumers */
export const useSharedVendors = () => {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useSharedVendors must be used within DataProvider');
  return { vendors: ctx.vendors, loading: ctx.vendorsLoading, refresh: ctx.refreshVendors };
};

/** Shared categories — single subscription, many consumers */
export const useSharedCategories = () => {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useSharedCategories must be used within DataProvider');
  return {
    categories: ctx.categories,
    loading: ctx.categoriesLoading,
    refreshCategories: ctx.refreshCategories,
    addCategory: ctx.addCategory,
    removeCategory: ctx.removeCategory,
    addSubCategory: ctx.addSubCategory,
    removeSubCategory: ctx.removeSubCategory,
  };
};

/** Shared sponsored products check to avoid websocket exhaustion in ProductCard */
export const useSharedSponsoredProducts = () => {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useSharedSponsoredProducts must be used within DataProvider');
  return { sponsoredProductIds: ctx.sponsoredProductIds };
};
