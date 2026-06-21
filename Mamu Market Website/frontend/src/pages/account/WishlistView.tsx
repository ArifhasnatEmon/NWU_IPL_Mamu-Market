import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Product } from '../../types';

import ProductCard from '../../components/product/ProductCard';
import SkeletonCard from '../../components/ui/SkeletonCard';
import { useAuth } from '../../context/AuthContext';
import PageTitle from '../../components/PageTitle';
import { useCart } from '../../context/CartContext';
import { useApp } from '../../context/AppContext';
import { useSharedProducts } from '../../context/DataContext';

const WishlistView: React.FC = () => {
  const { wishlist, handleToggleWishlist, handleSelectProduct } = useApp();
  const { handleAddToCart, setIsCartOpen } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { products: approvedProducts } = useSharedProducts();

  const [isLoading, setIsLoading] = React.useState(true);
  React.useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(t);
  }, []);

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-32 text-center">
        <i className="fas fa-heart text-6xl text-gray-200 mb-6 block"></i>
        <h2 className="text-2xl font-black text-gray-900 mb-4">Please Sign In</h2>
        <p className="text-gray-400 font-medium mb-8">You need to be logged in to view your wishlist.</p>
        <button onClick={() => navigate('/user-login')} className="px-8 py-4 bg-brand-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:opacity-90 transition-all">Sign In</button>
      </div>
    );
  }
  if (user.role === 'vendor') {
    return (
      <div className="container mx-auto px-4 py-32 text-center">
        <i className="fas fa-store text-6xl text-gray-200 mb-6 block"></i>
        <h2 className="text-2xl font-black text-gray-900 mb-4">Vendors Cannot Use Wishlist</h2>
        <p className="text-gray-400 font-medium mb-8">Switch to a customer account to save items.</p>
        <button onClick={() => navigate('/')} className="px-8 py-4 bg-brand-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:opacity-90 transition-all">Go Home</button>
      </div>
    );
  }

  const dynamicProds = approvedProducts.map((p: any) => ({
    ...p,
    name: p.productName || p.name || '',
    price: parseFloat(p.price) || 0,
    originalPrice: parseFloat(p.originalPrice) || parseFloat(p.price) || 0,
    image: p.image || p.mainImage || '',
    isSale: p.isSale === true || p.isSale === 'true',
    rating: typeof p.rating === 'number' ? p.rating : parseFloat(p.rating) || 0,
    reviewsCount: p.reviewsCount || 0,
    vendor: p.storeName || p.vendorId || '',
    isNew: true,
    inStock: true,
    colors: p.colors || [],
  }));
  const allProducts = dynamicProds;
  const wishlistedProducts = allProducts.filter(p => wishlist.includes(p.id));

  return (
    <div className="container mx-auto px-4 py-20">
      <PageTitle title="My Wishlist" />
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-12">
          <div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tight">My Wishlist</h1>
            <p className="text-gray-500 font-medium mt-2">You have {wishlistedProducts.length} items saved.</p>
          </div>
          <div className="flex items-center gap-3">
            {wishlistedProducts.length > 0 && (
              <button
                onClick={() => {
                  // Suppress drawer
                  setIsCartOpen(false);
                  wishlistedProducts.forEach(p => handleAddToCart(p));
                  setTimeout(() => setIsCartOpen(true), 100);
                }}
                className="px-8 py-3 gradient-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-brand-500/20 hover:scale-[1.02] active:scale-95 transition-all"
              >
                <i className="fas fa-cart-plus mr-2"></i>Add All to Cart
              </button>
            )}
            <button
              onClick={() => navigate('/products')}
              className="px-8 py-3 border-2 border-gray-100 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-50 transition-all"
            >
              Continue Shopping
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : wishlistedProducts.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {wishlistedProducts.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                onAddToCart={handleAddToCart}
                onSelect={() => handleSelectProduct(p)}
                onToggleWishlist={handleToggleWishlist}
                isWishlisted={true}
              />
            ))}
          </div>
        ) : (
          <div className="py-32 text-center bg-white rounded-[4rem] border-2 border-dashed border-gray-100">
            <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-8">
              <i className="fas fa-heart text-4xl text-gray-200"></i>
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-3">Your wishlist is empty</h3>
            <p className="text-gray-500 font-medium max-w-xs mx-auto mb-10">Save items you love to find them easily later.</p>
            <button onClick={() => navigate('/products')} className="px-10 py-4 gradient-primary text-white rounded-2xl font-black shadow-xl shadow-brand-500/20">Explore Products</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default WishlistView;
