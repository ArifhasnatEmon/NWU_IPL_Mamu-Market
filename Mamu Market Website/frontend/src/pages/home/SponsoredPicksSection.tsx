import React, { useRef } from 'react';
import { Product } from '../../types';
import ProductCard from '../../components/product/ProductCard';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useApp } from '../../context/AppContext';
import { useSharedProducts } from '../../context/DataContext';
import { useGlobalSettings } from '../../hooks/useMarketing';

const SponsoredPicksSection: React.FC = () => {
  const { user } = useAuth();
  const { handleAddToCart } = useCart();
  const { wishlist, handleToggleWishlist, handleSelectProduct } = useApp();
  const { products: approvedProducts, loading } = useSharedProducts();
  const { setting: sponsoredPinned } = useGlobalSettings('sponsored_products');
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const pinnedIds: string[] = React.useMemo(() => {
    if (!sponsoredPinned) return [];
    const now = Date.now();
    return sponsoredPinned
      .filter((x: any) => typeof x === 'string' || !x.expiresAt || new Date(x.expiresAt).getTime() > now)
      .map((x: any) => typeof x === 'string' ? x : x.id);
  }, [sponsoredPinned]);

  const sponsoredProducts = React.useMemo(() => {
    if (pinnedIds.length === 0 || approvedProducts.length === 0) return [];
    
    const allProductsMap = new Map();
    approvedProducts.forEach((p: Product) => {
      if (!allProductsMap.has(p.id)) {
        allProductsMap.set(p.id, {
          ...p,
          price: Number(p.price) || 0,
          originalPrice: Number(p.originalPrice) || Math.round((Number(p.price) || 0) * 1.2),
          image: p.image || p.mainImage || '',
          name: p.productName || p.name || '',
        });
      }
    });
    
    return pinnedIds
      .map(id => allProductsMap.get(id))
      .filter(Boolean);
  }, [pinnedIds, approvedProducts]);

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -300, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 300, behavior: 'smooth' });
    }
  };

  if (loading || sponsoredProducts.length === 0) return null;

  return (
    <section className="container mx-auto px-4">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center">
            <i className="fas fa-star text-amber-500"></i>
          </div>
          <div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Featured Promoted Picks</h2>
            <p className="text-sm font-medium text-gray-500">Discover highly rated sponsored products</p>
          </div>
        </div>
        
        {sponsoredProducts.length > 4 && (
          <div className="flex gap-2">
            <button 
              onClick={scrollLeft}
              className="w-10 h-10 rounded-full bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-brand-600 transition-colors flex items-center justify-center shadow-sm"
            >
              <i className="fas fa-chevron-left text-xs"></i>
            </button>
            <button 
              onClick={scrollRight}
              className="w-10 h-10 rounded-full bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-brand-600 transition-colors flex items-center justify-center shadow-sm"
            >
              <i className="fas fa-chevron-right text-xs"></i>
            </button>
          </div>
        )}
      </div>

      <div 
        ref={scrollContainerRef}
        className="flex gap-6 overflow-x-auto pb-4 pt-2 snap-x"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {sponsoredProducts.map((product) => (
          <div key={product.id} className="min-w-[240px] max-w-[240px] sm:min-w-[280px] sm:max-w-[280px] snap-start">
            <ProductCard 
              product={product} 
              isSponsored={true}
              onAddToCart={handleAddToCart}
              onSelect={(id) => handleSelectProduct(product)}
              onToggleWishlist={handleToggleWishlist}
              isWishlisted={wishlist.includes(product.id)}
              userRole={user?.role}
            />
          </div>
        ))}
      </div>
    </section>
  );
};

export default SponsoredPicksSection;

