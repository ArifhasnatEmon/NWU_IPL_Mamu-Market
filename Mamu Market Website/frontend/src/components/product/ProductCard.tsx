import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Product } from '../../types';
import { useSharedSponsoredProducts, useSharedVendors } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';

const ProductCard: React.FC<{ 
  product: Product, 
  onAddToCart: (p: Product) => void, 
  onSelect: (id: string) => void,
  onToggleWishlist: (id: string) => void,
  isWishlisted: boolean,
  userRole?: string,
  viewMode?: 'grid' | 'list',
  isSponsored?: boolean
}> = ({ product, onAddToCart, onSelect, onToggleWishlist, isWishlisted, userRole, viewMode = 'grid', isSponsored }) => {
  const [activeImage, setActiveImage] = useState(product.image);
  const [selectedColor, setSelectedColor] = useState<string | null>(product.colors?.[0]?.name || null);
  const discount = Math.round((1 - product.price / product.originalPrice) * 100);
  const { user } = useAuth();
  const activeUserRole = user?.role || userRole;

  const { vendors } = useSharedVendors();
  const matchedVendor = vendors.find(v => v.id === product.vendorId);
  const resolvedVendorName = matchedVendor?.storeName || product.vendorName || product.vendor || 'Unknown Vendor';

  const handleColorClick = (e: React.MouseEvent, color: { name: string, image: string }) => {
    e.stopPropagation();
    setSelectedColor(color.name);
    setActiveImage(color.image);
  };
  
  const isOutOfStock = (product.inStock as any) === false || (product.inStock as any) === 'false' || product.stockStatus === 'out_of_stock' || product.stockStatus === 'discontinued';
  const isDiscontinued = product.stockStatus === 'discontinued';
  
  const { sponsoredProductIds } = useSharedSponsoredProducts();
  const actuallySponsored = isSponsored || sponsoredProductIds.includes(product.id);
  
  if (viewMode === 'list') {
    return (
      <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm flex flex-row items-center p-5 gap-8 relative hover:shadow-md transition-shadow cursor-pointer" onClick={() => onSelect(product.id)}>
        <div className="w-44 h-44 overflow-hidden bg-gray-50 rounded-xl shrink-0 relative">
          <img src={activeImage || 'https://via.placeholder.com/400x400?text=Product'} referrerPolicy="no-referrer" className="w-full h-full object-cover" alt={product.name} />
          {isOutOfStock && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-10 flex items-center justify-center">
              {isDiscontinued ? (
                <span className="bg-slate-800 text-white px-3 py-1.5 rounded-lg font-black text-[9px] uppercase tracking-widest shadow-lg flex items-center gap-1.5">
                  <i className="fas fa-archive"></i> Discontinued
                </span>
              ) : (
                <span className="bg-red-500/90 backdrop-blur-md text-white px-3 py-1.5 rounded-lg font-black text-[9px] uppercase tracking-widest shadow-lg flex items-center gap-1.5 border border-red-400">
                  <i className="fas fa-exclamation-circle"></i> Out of Stock
                </span>
              )}
            </div>
          )}

        </div>
        
        <div className="flex-1 flex flex-col">
          {!isOutOfStock && (
            <div className="flex flex-wrap gap-2 mb-2">
              {product.isNew && <span className="gradient-success text-white text-[9px] font-black uppercase px-2.5 py-1 rounded-full shadow-sm">New Arrival</span>}
              {product.isSale && <span className="gradient-danger text-white text-[9px] font-black uppercase px-2.5 py-1 rounded-full shadow-sm">-{discount}% Off</span>}
              {(product as any).dealType === 'daily' && <span className="text-[9px] font-black uppercase px-2.5 py-1 rounded-full shadow-sm bg-rose-500 text-white flex items-center gap-1"><i className="fas fa-bolt"></i> Daily Deal</span>}
              {(product as any).dealType === 'weekly' && <span className="text-[9px] font-black uppercase px-2.5 py-1 rounded-full shadow-sm bg-indigo-500 text-white flex items-center gap-1"><i className="fas fa-calendar-week"></i> Weekly</span>}
              {(product as any).dealType === 'monthly' && <span className="text-[9px] font-black uppercase px-2.5 py-1 rounded-full shadow-sm bg-emerald-500 text-white flex items-center gap-1"><i className="fas fa-calendar-alt"></i> Monthly</span>}
              {(product as any).dealType === 'flash' && <span className="text-[9px] font-black uppercase px-2.5 py-1 rounded-full shadow-sm bg-amber-500 text-white flex items-center gap-1"><i className="fas fa-fire"></i> Flash</span>}
              {actuallySponsored && <span className="text-[9px] font-black uppercase px-2.5 py-1 rounded-full shadow-sm bg-amber-400 text-gray-900 flex items-center gap-1"><i className="fas fa-star text-[8px]"></i> Promoted</span>}
            </div>
          )}
          <h3 className="text-lg font-black text-gray-900 mb-1 leading-tight">
            {product.name}
          </h3>
          <p className="text-sm text-gray-400 font-medium mb-4">
            {resolvedVendorName} {product.subcategory && <span className="mx-1">•</span>} {product.subcategory}
          </p>
          
          <div className="flex items-center gap-3">
            {!isOutOfStock ? (
              <>
                <span className="text-2xl font-black text-gray-900">৳{product.price.toLocaleString()}</span>
                {product.isSale && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-300 line-through font-bold">৳{product.originalPrice.toLocaleString()}</span>
                    <span className="text-xs text-rose-500 font-bold">-{discount}%</span>
                  </div>
                )}
              </>
            ) : (
              <span className="text-sm font-black text-gray-400 uppercase tracking-widest mt-2">Unavailable</span>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      whileHover={{ y: -8, boxShadow: "0 20px 40px -12px rgba(0, 0, 0, 0.1)" }}
      className={`group bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl transition-all flex flex-col h-full relative cursor-pointer`}
      onClick={() => onSelect(product.id)}
      data-testid={`product-card-${product.id}`}
    >
      <div className="relative aspect-square overflow-hidden bg-gray-50">
        <img 
          src={activeImage || 'https://via.placeholder.com/400x400?text=Product'} 
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" 
          alt={product.name} 
        />
        {isOutOfStock && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-10 flex items-center justify-center">
            {isDiscontinued ? (
              <span className="bg-slate-800 text-white px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg flex items-center gap-2">
                <i className="fas fa-archive"></i> Discontinued
              </span>
            ) : (
              <span className="bg-red-500/90 backdrop-blur-md text-white px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg flex items-center gap-2 border border-red-400">
                <i className="fas fa-exclamation-circle"></i> Out of Stock
              </span>
            )}
          </div>
        )}
        
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-20">
          {!isOutOfStock && (
            <>
              {product.isNew && <span className="gradient-success text-white text-[7px] font-black uppercase px-2 py-1 rounded-full shadow-lg">New Arrival</span>}
              {product.isSale && <span className="gradient-danger text-white text-[7px] font-black uppercase px-2 py-1 rounded-full shadow-lg">-{discount}% Off</span>}
              {(product as any).dealType === 'daily' && <span className="text-[7px] font-black uppercase px-2 py-1 rounded-full shadow-lg bg-rose-500 text-white flex items-center gap-1"><i className="fas fa-bolt"></i> Daily Deal</span>}
              {(product as any).dealType === 'weekly' && <span className="text-[7px] font-black uppercase px-2 py-1 rounded-full shadow-lg bg-indigo-500 text-white flex items-center gap-1"><i className="fas fa-calendar-week"></i> Weekly</span>}
              {(product as any).dealType === 'monthly' && <span className="text-[7px] font-black uppercase px-2 py-1 rounded-full shadow-lg bg-emerald-500 text-white flex items-center gap-1"><i className="fas fa-calendar-alt"></i> Monthly</span>}
              {(product as any).dealType === 'flash' && !(product as any).dealType?.includes('daily') && <span className="text-[7px] font-black uppercase px-2 py-1 rounded-full shadow-lg bg-amber-500 text-white flex items-center gap-1"><i className="fas fa-fire"></i> Flash</span>}
              {actuallySponsored && <span className="text-[7px] font-black uppercase px-2 py-1 rounded-full shadow-lg bg-amber-400 text-gray-900 flex items-center gap-1"><i className="fas fa-star text-[6px]"></i> Promoted</span>}
            </>
          )}
        </div>
        {activeUserRole !== 'vendor' && (
          <button
            onClick={e => { e.stopPropagation(); onToggleWishlist(product.id); }}
            className={`absolute top-3 right-3 z-20 w-8 h-8 rounded-xl flex items-center justify-center transition-all shadow-sm ${isWishlisted ? 'bg-rose-500 text-white' : 'bg-white/80 text-gray-400 hover:text-rose-500 hover:bg-white'}`}
          >
            <i className={`${isWishlisted ? 'fas' : 'far'} fa-heart text-xs`}></i>
          </button>
        )}
      </div>
      <div className="p-4 flex flex-col flex-1">
        <div className="mb-1.5">
          <span className="text-[9px] font-black text-brand-600 uppercase tracking-widest">
            {resolvedVendorName} {product.subcategory && <span className="text-gray-400 mx-1">•</span>} {product.subcategory}
          </span>
        </div>
        <h3 className="text-xs font-bold text-gray-900 mb-2 line-clamp-2 leading-tight group-hover:text-brand-600 transition-colors">
          {product.name}
        </h3>

        <div className="mt-auto">
          <div className="flex items-center justify-between mb-3">
            <div>
              {!isOutOfStock ? (
                <>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-base font-black text-gray-900">৳{product.price.toLocaleString()}</span>
                    {product.isSale && (
                      <span className="text-[9px] text-rose-500 font-bold">-{discount}%</span>
                    )}
                  </div>
                  {product.isSale && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-gray-300 line-through font-bold">৳{product.originalPrice.toLocaleString()}</span>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center h-full py-1">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Unavailable</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-1.5">
            <div className="flex items-center text-amber-400 gap-0.5">
              {[1, 2, 3, 4, 5].map(s => <i key={s} className={`fas fa-star text-[7px] ${s <= Math.floor(product.rating) ? '' : 'text-gray-100'}`}></i>)}
            </div>
            {product.rating > 0 && (
              <span className="text-[9px] font-black text-gray-700">{product.rating.toFixed(1)}</span>
            )}
            <span className="text-[8px] font-bold text-gray-400">({product.reviewsCount})</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ProductCard;
