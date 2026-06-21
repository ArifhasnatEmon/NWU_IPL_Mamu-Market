import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Product, Review, Vendor } from '../../types';
import ProductCard from '../../components/product/ProductCard';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useApp } from '../../context/AppContext';
import { useSharedProducts, useSharedVendors } from '../../context/DataContext';

import { useReviews } from '../../hooks/useReviews';
import { supabase } from '../../lib/supabase';
import PageTitle from '../../components/PageTitle';

const ProductDetailsView: React.FC<{
  product: Product,
}> = ({ product }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { handleAddToCart } = useCart();
  const {
    wishlist, handleToggleWishlist, navigateToVendor, handleSelectProduct,
    recentlyViewed, trackRecentlyViewed, setToast
  } = useApp();
  const userRole = user?.role;
  const isWishlisted = wishlist.includes(product.id);
  const [quantity, setQuantity] = useState(1);
  const [copied, setCopied] = useState(false);
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<'description' | 'reviews' | 'shipping'>('description');
  const { products: approvedProducts, loading: productsLoading } = useSharedProducts();
  const { reviews: allReviews, refreshReviews } = useReviews({ productId: product.id });

  const { vendors: fetchedVendors } = useSharedVendors();

  const resolvedVendorName = React.useMemo(() => {
    if (!product.vendorId) return product.vendor;
    try {
      const vendorUser = fetchedVendors.find(u => u.id === product.vendorId);
      return vendorUser?.storeName || vendorUser?.name || product.vendor;
    } catch {
      return product.vendor;
    }
  }, [product.vendorId, product.vendor, fetchedVendors]);

  useEffect(() => {
    if (location.state && (location.state as any).activeTab) {
      setActiveTab((location.state as any).activeTab);
    }
  }, [location]);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [activeImage, setActiveImage] = useState(product.image);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  const [submittingReview, setSubmittingReview] = useState(false);
  const [reportModal, setReportModal] = useState<{ reviewId: string } | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [productReportModal, setProductReportModal] = useState(false);
  const [productReportReason, setProductReportReason] = useState('');

  const [reportedReviewIds, setReportedReviewIds] = useState<string[]>([]);
  const [productReported, setProductReported] = useState(false);

  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  useEffect(() => {
    setActiveImage(product.image);
    setSelectedColor(null);
    setQuantity(1);
    window.scrollTo(0, 0);
    // Track recently viewed
    trackRecentlyViewed({
      id: product.id,
      name: product.name,
      image: product.image,
      price: product.price,
      categoryId: product.categoryId,
      rating: product.rating,
      reviewsCount: product.reviewsCount
    });
  }, [product.id]);

  const dynamicRelated = approvedProducts
    .filter((p: Product) => p.category?.toLowerCase().replace(/\s+/g, '-') === product.categoryId && p.id !== product.id)
    .map((p: Product) => ({
      id: p.id,
      name: p.productName || p.name || '',
      price: Number(p.price) || 0,
      originalPrice: Number(p.originalPrice) || Number(p.price) || 0,
      image: p.mainImage || p.image || '',
      images: [p.mainImage, p.extraImage1, p.extraImage2, p.extraImage3].filter(Boolean),
      categoryId: p.category?.toLowerCase().replace(/\s+/g, '-') || 'general',
      category: p.category || 'General',
      subcategory: p.subcategory || '',
      vendorId: p.vendorId,
      rating: Number(p.rating) || 0,
      reviewsCount: p.reviewsCount || 0,
      isSale: p.isSale === true || (p.isSale as any) === 'true',
      description: p.description || '',
      colors: p.colors || [],
      reviews: [],
      vendor: p.vendor || 'Unknown',
      isNew: p.isNew === true || (p.isNew as any) === 'true',
      inStock: p.inStock !== false && (p.inStock as any) !== 'false',
    }));
  const relatedProducts = dynamicRelated.slice(0, 4);

  const localVendor = fetchedVendors.find(u => u.id === product.vendorId);

  const vendor = localVendor ? (() => {
    const vendorProducts = approvedProducts.filter((p: Product) => p.vendorId === localVendor.id);
    const ratedProducts = vendorProducts.filter(p => p.rating > 0);
    const computedRating = ratedProducts.length > 0
      ? Math.round((ratedProducts.reduce((sum, p) => sum + Number(p.rating), 0) / ratedProducts.length) * 10) / 10
      : 0;
    return {
      id: localVendor.id,
      name: localVendor.name,
      logo: localVendor.logo || '',
      banner: localVendor.banner || '',
      category: localVendor.category || 'General',
      rating: computedRating,
      productsCount: vendorProducts.length,
      verified: localVendor.verified || false,
      joinedDate: localVendor.joinedDate || new Date().toISOString().split('T')[0],
      description: localVendor.description || `Welcome to ${localVendor.name}'s store.`
    };
  })() : null;

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate('/user-login');
      return;
    }

    if (!reviewForm.comment.trim()) {
      setToast?.('Please write a comment before submitting.');
      return;
    }

    const finalRating = reviewForm.rating;

    const san = (s: string) => (s || '').trim().replace(/[<>]/g, '');
    
    setSubmittingReview(true);
    try {
      const { error } = await supabase.from('reviews').insert({
        user_id: user.id,
        user_name: user.name,
        user_avatar: user.avatar || '',
        rating: finalRating,
        comment: san(reviewForm.comment),
        product_id: product.id,
        product_name: product.name,
        product_image: product.image || ''
      });

      if (error) {
        console.error('Review insert error:', error.message, error.details, error.hint);
        setToast?.('Failed to post review: ' + error.message);
        return;
      }
      
      // Update the product's rating via Edge Function (bypasses RLS)
      let ratingUpdated = false;
      try {
        const { data: fnData, error: fnError } = await supabase.functions.invoke('update-product-rating', {
          body: { product_id: product.id }
        });
        console.log('Rating update response:', fnData, fnError);
        if (fnError) {
          console.error('Product rating Edge Function error:', fnError);
        } else if (fnData?.success) {
          ratingUpdated = true;
        }
      } catch (ratingErr) {
        console.error('Product rating Edge Function failed:', ratingErr);
      }

      // Fallback: direct DB update if Edge Function failed
      if (!ratingUpdated) {
        try {
          const { data: freshReviews } = await supabase
            .from('reviews')
            .select('rating')
            .eq('product_id', product.id);
          
          const allRevs = freshReviews || [];
          const rated = allRevs.filter((r: any) => Number(r.rating) > 0);
          const avg = rated.length > 0
            ? Math.round((rated.reduce((s: number, r: any) => s + Number(r.rating), 0) / rated.length) * 10) / 10
            : 0;
          
          await supabase.from('products').update({
            rating: avg,
            reviews_count: allRevs.length
          }).eq('id', product.id);
        } catch (fallbackErr) {
          console.error('Rating fallback update failed:', fallbackErr);
        }
      }

      setReviewForm({ rating: 5, comment: '' });
      setToast?.('Review posted successfully!');
      refreshReviews();
    } catch (err: any) {
      console.error('Review submit error:', err);
      setToast?.('Failed to post review: ' + (err?.message || 'Unknown error'));
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="container mx-auto px-4 py-12 lg:py-20"
    >
      <PageTitle title={product.name} />
      <div className="flex flex-col lg:flex-row gap-12 lg:gap-16 mb-24 relative">
        {/* Image Gallery */}
        <div className="w-full lg:w-[40%] shrink-0 space-y-6">
          <div
            className="relative flex items-center justify-center cursor-zoom-in group aspect-square"
            onClick={() => setIsLightboxOpen(true)}
          >
            <motion.img
              key={activeImage}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              src={activeImage || undefined}
              referrerPolicy="no-referrer"
              className="w-full h-full object-contain"
              alt={product.name}
            />
            {(() => {
              const isOutOfStock = (product.inStock as any) === false || (product.inStock as any) === 'false' || product.stockStatus === 'out_of_stock' || product.stockStatus === 'discontinued';
              const isDiscontinued = product.stockStatus === 'discontinued';
              
              if (!isOutOfStock) return null;
              
              return (
                <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-10 flex items-center justify-center rounded-3xl">
                  {isDiscontinued ? (
                    <span className="bg-slate-800 text-white px-6 py-3 rounded-2xl font-black text-lg uppercase tracking-widest shadow-2xl flex items-center gap-3">
                      <i className="fas fa-archive"></i> Discontinued
                    </span>
                  ) : (
                    <span className="bg-red-500/90 backdrop-blur-md text-white px-6 py-3 rounded-2xl font-black text-lg uppercase tracking-widest shadow-2xl flex items-center gap-3 border border-red-400">
                      <i className="fas fa-exclamation-circle"></i> Out of Stock
                    </span>
                  )}
                </div>
              );
            })()}
          </div>

          <div className="flex overflow-x-auto gap-4 pb-4 snap-x scrollbar-hide">
            {[product.image, ...(product.images || []), ...(product.colors?.map(c => c.image) || [])]
              .filter(Boolean)
              .filter((v, i, a) => a.indexOf(v) === i)
              .map((img, i) => (
              <button
                key={i}
                onClick={() => setActiveImage(img)}
                className={`shrink-0 w-24 h-24 snap-start rounded-2xl overflow-hidden border-2 transition-all ${activeImage === img ? 'border-brand-600 scale-95 shadow-lg' : 'border-transparent hover:border-gray-200'}`}
              >
                <img src={img} referrerPolicy="no-referrer" className="w-full h-full object-cover" alt={`Gallery ${i + 1}`} />
              </button>
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 flex flex-col pt-2">
          <div className="mb-8">
            <nav className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest mb-6 flex-wrap">
              <button onClick={() => navigate('/')} className="text-gray-400 hover:text-brand-600 transition-colors">Home</button>
              <i className="fas fa-chevron-right text-[7px] text-gray-300"></i>
              <button onClick={() => navigate('/products')} className="text-gray-400 hover:text-brand-600 transition-colors">All Products</button>
              {product.category && (
                <>
                  <i className="fas fa-chevron-right text-[7px] text-gray-300"></i>
                  <button onClick={() => navigate(`/${product.categoryId}`)} className="text-gray-400 hover:text-brand-600 transition-colors">{product.category}</button>
                </>
              )}
              {product.subcategory && (
                <>
                  <i className="fas fa-chevron-right text-[7px] text-gray-300"></i>
                  <span className="text-brand-600">{product.subcategory}</span>
                </>
              )}
            </nav>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-black text-brand-600 uppercase tracking-[0.2em]">
                {product.category} {product.subcategory && <span className="text-gray-400 mx-1">/</span>} {product.subcategory}
              </span>
              <div className="flex items-center gap-2">
                {(() => {
                  const ratedReviews = allReviews.filter((r: any) => r.rating > 0);
                  const liveCount = allReviews.length;
                  const liveRating = ratedReviews.length > 0
                    ? Math.round((ratedReviews.reduce((sum: number, r: any) => sum + Number(r.rating), 0) / ratedReviews.length) * 10) / 10
                    : Number(product.rating) || 0;
                  return (
                    <>
                      <div className="flex text-amber-400 gap-0.5">
                        {[1, 2, 3, 4, 5].map(s => <i key={s} className={`fas fa-star text-[10px] ${s <= Math.floor(liveRating) ? '' : 'text-gray-200'}`}></i>)}
                      </div>
                      <span className="text-xs font-black text-gray-900">{liveRating}</span>
                      <span className="text-xs font-bold text-gray-400">({liveCount} reviews)</span>
                    </>
                  );
                })()}
              </div>
            </div>

            {(() => {
              const isOutOfStock = (product.inStock as any) === false || (product.inStock as any) === 'false' || product.stockStatus === 'out_of_stock' || product.stockStatus === 'discontinued';
              if (isOutOfStock) return null;
              
              if (!(product.isNew || product.isSale || (product as any).dealType || (product as any).isSponsored)) return null;
              
              return (
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  {product.isNew && <span className="gradient-success text-white text-[10px] font-black uppercase px-3 py-1 rounded-lg shadow-sm">New Arrival</span>}
                  {product.isSale && <span className="gradient-danger text-white text-[10px] font-black uppercase px-3 py-1 rounded-lg shadow-sm">Sale</span>}
                  {(product as any).dealType === 'daily' && <span className="text-[10px] font-black uppercase px-3 py-1 rounded-lg shadow-sm bg-rose-500 text-white flex items-center gap-1.5"><i className="fas fa-bolt"></i> Daily Deal</span>}
                  {(product as any).dealType === 'weekly' && <span className="text-[10px] font-black uppercase px-3 py-1 rounded-lg shadow-sm bg-indigo-500 text-white flex items-center gap-1.5"><i className="fas fa-calendar-week"></i> Weekly</span>}
                  {(product as any).dealType === 'monthly' && <span className="text-[10px] font-black uppercase px-3 py-1 rounded-lg shadow-sm bg-emerald-500 text-white flex items-center gap-1.5"><i className="fas fa-calendar-alt"></i> Monthly</span>}
                  {(product as any).dealType === 'flash' && <span className="text-[10px] font-black uppercase px-3 py-1 rounded-lg shadow-sm bg-amber-500 text-white flex items-center gap-1.5"><i className="fas fa-fire"></i> Flash</span>}
                  {(product as any).isSponsored && <span className="text-[10px] font-black uppercase px-3 py-1 rounded-lg shadow-sm bg-gray-800 text-white flex items-center gap-1.5"><i className="fas fa-ad"></i> Sponsored</span>}
                </div>
              );
            })()}

            <div className="flex items-start gap-3 mb-4">
              <h1 className="text-2xl lg:text-3xl font-black text-gray-900 tracking-tight leading-snug flex-1">{product.name}</h1>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="shrink-0 mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-50 border border-gray-100 text-gray-400 hover:text-brand-600 hover:border-brand-200 transition-all text-[10px] font-black uppercase tracking-widest"
              >
                <i className={`fas ${copied ? 'fa-check text-emerald-500' : 'fa-share-alt'} text-xs`}></i>
                {copied ? 'Copied!' : 'Share'}
              </button>
            </div>
            <div className="flex items-center gap-4 mb-8">
              <span className="text-3xl font-black text-gray-900">৳{product.price.toLocaleString()}</span>
              {product.isSale && (
                <>
                  <span className="text-xl text-gray-300 line-through font-bold">৳{product.originalPrice.toLocaleString()}</span>
                  <span className="px-3 py-1 bg-rose-50 text-rose-500 text-[10px] font-black rounded-full border border-rose-100">Save {Math.round((1 - product.price / product.originalPrice) * 100)}%</span>
                </>
              )}
              {user?.role === 'customer' && (
                <button onClick={async () => {
                  if (productReported) return;
                  const existingReports = null;
                  if (existingReports && existingReports.length > 0) { setProductReported(true); return; }
                  setProductReportReason('');
                  setProductReportModal(true);
                }} className={`ml-auto text-[10px] font-black uppercase tracking-widest transition-colors ${productReported ? 'text-gray-300 cursor-not-allowed' : 'text-gray-400 hover:text-red-400'}`}>
                  {productReported ? '✓ Product Reported' : '⚑ Report Product'}
                </button>
              )}
            </div>
          </div>

          <div className="space-y-10 mb-10">
            {product.colors && product.colors.length > 0 && (
              <div>
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Available Colors</h4>
                <div className="flex gap-3">
                  {product.colors.map(color => (
                    <button
                      key={color.name}
                      onClick={() => { setSelectedColor(color.name); setActiveImage(color.image); }}
                      className={`group relative w-12 h-12 rounded-2xl p-1 border-2 transition-all ${selectedColor === color.name ? 'border-brand-600 scale-110 shadow-lg' : 'border-transparent hover:border-gray-200'}`}
                    >
                      <div className="w-full h-full rounded-xl shadow-inner" style={{ backgroundColor: color.value }}></div>
                      <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[8px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">{color.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {userRole !== 'vendor' && (
              <div>
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Quantity</h4>
                <div className="flex items-center gap-6">
                  <div className="flex items-center bg-gray-50 rounded-2xl border border-gray-100 p-1">
                    <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-12 h-12 flex items-center justify-center text-gray-400 hover:text-brand-600 transition-colors disabled:opacity-30 disabled:hover:text-gray-400" disabled={quantity <= 1}>
                      <i className="fas fa-minus text-xs"></i>
                    </button>
                    <span className="w-12 text-center font-black text-gray-900 text-lg">{quantity}</span>
                    <button onClick={() => {
                      const stockVal = (product as any).units !== undefined ? (product as any).units : ((product as any).stock !== undefined ? (product as any).stock : 99);
                      const units = Number(stockVal);
                      if (quantity < units) setQuantity(quantity + 1);
                    }} className="w-12 h-12 flex items-center justify-center text-gray-400 hover:text-brand-600 transition-colors disabled:opacity-30 disabled:hover:text-gray-400" disabled={quantity >= Number((product as any).units !== undefined ? (product as any).units : ((product as any).stock !== undefined ? (product as any).stock : 99))}>
                      <i className="fas fa-plus text-xs"></i>
                    </button>
                  </div>
                  {(() => {
                    const stockVal = (product as any).units !== undefined ? (product as any).units : ((product as any).stock !== undefined ? (product as any).stock : 99);
                    const units = Number(stockVal);
                    const isOutOfStock = (product as any).inStock === false || (product as any).inStock === 'false' || product.stockStatus === 'out_of_stock' || product.stockStatus === 'discontinued';
                    if (isOutOfStock) return <p className="text-xs font-black text-red-500"><i className="fas fa-times-circle mr-1"></i>Out of Stock</p>;
                    if (units > 0 && units <= 5) return <p className="text-xs font-black text-amber-500"><i className="fas fa-exclamation-circle mr-1"></i>Only <span className="text-amber-600">{units} left</span> — order soon!</p>;
                    return <p className="text-xs font-bold text-emerald-600"><i className="fas fa-check-circle mr-1"></i>In Stock</p>;
                  })()}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-4 mb-10">
            {userRole === 'vendor' ? (
              user?.id === product.vendorId ? (
                <button
                  onClick={() => navigate('/dashboard')}
                  className="flex-1 py-5 bg-gray-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:opacity-90 transition-all flex items-center justify-center gap-3"
                >
                  <i className="fas fa-pencil-alt"></i> Edit in Dashboard
                </button>
              ) : (
                <div className="flex-1 py-5 bg-gray-50 text-gray-400 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 border border-gray-100 cursor-not-allowed select-none">
                  <i className="fas fa-store"></i> Vendor View Only
                </div>
              )
            ) : (
              <>
                {(() => {
                  const stockVal = (product as any).units !== undefined ? (product as any).units : ((product as any).stock !== undefined ? (product as any).stock : 99);
                  const units = Number(stockVal);
                  const isOutOfStock = (product as any).inStock === false || (product as any).inStock === 'false' || product.stockStatus === 'out_of_stock' || product.stockStatus === 'discontinued';
                  
                  return isOutOfStock ? (
                    <button
                      disabled
                      className="flex-1 py-5 bg-gray-100 text-gray-400 rounded-2xl font-black text-sm uppercase tracking-widest cursor-not-allowed flex items-center justify-center gap-3"
                    >
                      <i className="fas fa-times-circle"></i> Out of Stock
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        for (let i = 0; i < quantity; i++) {
                          handleAddToCart(product);
                        }
                      }}
                      className="flex-1 py-5 gradient-primary text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-2xl shadow-brand-500/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
                    >
                      <i className="fas fa-shopping-cart"></i> Add to Cart
                    </button>
                  );
                })()}
                <button
                  onClick={() => handleToggleWishlist(product.id)}
                  className={`w-16 h-16 rounded-2xl border-2 flex items-center justify-center transition-all ${isWishlisted ? 'bg-rose-50 border-rose-100 text-rose-500' : 'border-gray-100 text-gray-400 hover:border-rose-500 hover:text-rose-500'}`}
                >
                  <i className={`${isWishlisted ? 'fas' : 'far'} fa-heart text-xl`}></i>
                </button>
              </>
            )}
          </div>

          <p className="text-gray-500 font-medium leading-relaxed text-lg whitespace-pre-wrap">
            {product.shortDescription || (product.description ? (product.description.length > 150 ? product.description.substring(0, 150) + '...' : product.description) : '')}
          </p>

          {/* Vendor Info Card */}
          {vendor && (
            <div className="mt-12 p-8 rounded-[2.5rem] bg-gray-50 border border-gray-100 flex items-center justify-between group cursor-pointer hover:bg-white hover:shadow-xl transition-all" onClick={() => navigateToVendor(vendor)}>
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-2xl overflow-hidden bg-white border border-gray-100 shadow-sm">
                  {vendor.logo && <img src={vendor.logo} referrerPolicy="no-referrer" className="w-full h-full object-cover" alt={resolvedVendorName} />}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-lg font-black text-gray-900">{resolvedVendorName}</h4>
                    {vendor.verified && <i className="fas fa-check-circle text-blue-500 text-xs"></i>}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <i className="fas fa-star text-amber-400 text-[10px]"></i>
                      <span className="text-xs font-black text-gray-700">{vendor.rating}</span>
                    </div>
                    <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                    <span className="text-xs font-bold text-gray-400">{vendor.productsCount} Products</span>
                  </div>
                </div>
              </div>
              <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-gray-400 group-hover:bg-brand-600 group-hover:text-white transition-all shadow-sm">
                <i className="fas fa-arrow-right"></i>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-24">
        <div className="flex border-b border-gray-100 mb-12">
          {[
            { id: 'description', label: 'Description' },
            { id: 'reviews', label: `Reviews (${allReviews.length})` },
            { id: 'shipping', label: 'Shipping & Returns' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-10 py-6 text-xs font-black uppercase tracking-[0.2em] relative transition-all ${activeTab === tab.id ? 'text-brand-600' : 'text-gray-400 hover:text-gray-600'}`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 w-full h-1 gradient-primary rounded-full" />
              )}
            </button>
          ))}
        </div>

        <div className="max-w-3xl">
          <AnimatePresence mode="wait">
            {activeTab === 'description' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                <div className="text-gray-600 font-medium leading-loose text-[15px]">
                  {product.description ? (
                    (() => {
                      const text = product.description;
                      // If the vendor used a Rich Text Editor and saved HTML
                      if (/<[a-z][\s\S]*>/i.test(text)) {
                        return <div dangerouslySetInnerHTML={{ __html: text }} className="text-justify" />;
                      }
                      
                      // Otherwise parse plain text with newlines and markdown-like formatting
                      const parseFormatting = (str: string) => {
                        return str
                          .replace(/\*\*(.*?)\*\*/g, '<strong class="font-black text-gray-900">$1</strong>')
                          .replace(/\*(.*?)\*/g, '<em class="italic text-gray-800">$1</em>');
                      };

                      return (
                        <div className="space-y-6 text-justify">
                          {text.split('\n').map((paragraph, index) => {
                            if (!paragraph.trim()) return null;
                            if (paragraph.trim().startsWith('- ') || paragraph.trim().startsWith('• ')) {
                              return (
                                <ul key={index} className="list-disc pl-5 my-2 space-y-2">
                                  <li dangerouslySetInnerHTML={{ __html: parseFormatting(paragraph.trim().substring(2)) }} />
                                </ul>
                              );
                            }
                            return (
                              <p key={index} dangerouslySetInnerHTML={{ __html: parseFormatting(paragraph.trim()) }} />
                            );
                          })}
                        </div>
                      );
                    })()
                  ) : (
                    <p className="text-gray-400 italic">No description provided for this product.</p>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'reviews' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-12"
              >
                {user ? (
                  userRole !== 'vendor' ? (
                    <div className="bg-gray-50 rounded-[2.5rem] p-10 border border-gray-100">
                      {(() => {
                        const hasRated = allReviews.some((r: Review) => (r.userId === user.id || (r as any).user_id === user.id) && r.rating > 0);
                        return (
                          <>
                            <h4 className="text-xl font-black text-gray-900 mb-2">
                              {hasRated ? 'Add a Comment' : 'Write a Review'}
                            </h4>
                            {hasRated && (
                              <p className="text-xs text-gray-400 font-medium mb-6">
                                You have already rated this product. You can still leave additional comments.
                              </p>
                            )}
                            <form onSubmit={handleReviewSubmit} className="space-y-6">
                              {!hasRated && (
                                <div className="flex items-center gap-4 mb-4">
                                  <span className="text-sm font-bold text-gray-500">Your Rating:</span>
                                  <div className="flex gap-2">
                                    {[1, 2, 3, 4, 5].map(star => (
                                      <button
                                        key={star}
                                        type="button"
                                        onClick={() => setReviewForm(prev => ({ ...prev, rating: star }))}
                                        className={`text-2xl transition-all ${star <= reviewForm.rating ? 'text-amber-400 scale-110' : 'text-gray-200 hover:text-amber-200'}`}
                                      >
                                        <i className="fas fa-star"></i>
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                              <textarea
                                required
                                value={reviewForm.comment}
                                onChange={(e) => setReviewForm(prev => ({ ...prev, comment: e.target.value }))}
                                placeholder={hasRated ? 'Add more thoughts about this product...' : 'Share your experience with this product...'}
                                className="w-full bg-white border-none rounded-2xl px-8 py-6 outline-none focus:ring-4 focus:ring-brand-500/10 transition-all font-medium resize-none shadow-sm"
                                rows={4}
                              />
                              <button type="submit" disabled={submittingReview} className="px-10 py-4 bg-brand-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-brand-500/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100">
                                {submittingReview ? (
                                  <><i className="fas fa-spinner fa-spin mr-2"></i>Posting...</>
                                ) : (
                                  hasRated ? 'Post Comment' : 'Post Review'
                                )}
                              </button>
                            </form>
                          </>
                        );
                      })()}
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded-[2.5rem] p-10 border border-gray-100 text-center">
                      <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 text-brand-500 text-2xl shadow-sm">
                        <i className="fas fa-store-slash"></i>
                      </div>
                      <h4 className="text-gray-900 font-black mb-2">Merchant Accounts Cannot Review</h4>
                      <p className="text-gray-500 font-medium text-sm leading-relaxed max-w-md mx-auto">
                        Vendor accounts are restricted from leaving product reviews to maintain platform integrity. Please log in with a standard customer account to share your experience.
                      </p>
                    </div>
                  )
                ) : (
                  <div className="bg-gray-50 rounded-[2.5rem] p-10 border border-gray-100 text-center">
                    <p className="text-gray-500 font-bold mb-6">Please sign in to share your thoughts.</p>
                    <button onClick={() => navigate('/user-login')} className="px-8 py-3 bg-gray-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg">Sign In Now</button>
                  </div>
                )}

                <div className="space-y-8">
                  {allReviews.map((review) => (
                    <div key={review.id} className="flex gap-8 p-8 rounded-[2rem] bg-white border border-gray-50 shadow-sm hover:shadow-md transition-shadow">
                      <div className="w-16 h-16 rounded-2xl overflow-hidden bg-gray-100 shrink-0 shadow-lg flex items-center justify-center text-gray-400 font-black text-xl">
                        {(review.userAvatar || (review as any).user_avatar) ? (
                          <img src={review.userAvatar || (review as any).user_avatar} referrerPolicy="no-referrer" className="w-full h-full object-cover" alt={review.userName || (review as any).user_name} />
                        ) : (
                          (review.userName || (review as any).user_name || 'A').charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="font-black text-gray-900">{review.userName || (review as any).user_name || 'Anonymous'}</h5>
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{(() => {
                              const d = review.date;
                              if (!d) return 'Just now';
                              const parsed = new Date(d);
                              if (isNaN(parsed.getTime())) return 'Just now';
                              const diff = Date.now() - parsed.getTime();
                              if (diff < 0) return 'Just now';
                              const minutes = Math.floor(diff / (1000 * 60));
                              if (minutes < 1) return 'Just now';
                              if (minutes < 60) return `${minutes} min${minutes > 1 ? 's' : ''} ago`;
                              const hours = Math.floor(diff / (1000 * 60 * 60));
                              if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
                              const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                              return `${days} day${days > 1 ? 's' : ''} ago`;
                            })()}</span>
                            {user && user.id !== review.userId && user.id !== (review as any).user_id && (
                              <button onClick={() => {
                                if (reportedReviewIds.includes(review.id)) return;
                                setReportModal({ reviewId: review.id });
                                setReportReason('');
                              }} className={`text-[10px] font-black uppercase tracking-widest transition-colors ${reportedReviewIds.includes(review.id) ? 'text-gray-300 cursor-not-allowed' : 'text-gray-300 hover:text-red-400'}`}>
                                {reportedReviewIds.includes(review.id) ? '✓ Reported' : '⚑ Report'}
                              </button>
                            )}
                          </div>
                        </div>
                        {review.rating > 0 && (
                          <div className="flex text-amber-400 gap-0.5 mb-4">
                            {[1, 2, 3, 4, 5].map(s => <i key={s} className={`fas fa-star text-[10px] ${s <= review.rating ? '' : 'text-gray-100'}`}></i>)}
                          </div>
                        )}
                        <p className="text-gray-500 font-medium leading-relaxed">{review.comment}</p>
                        {review.vendorReply && (
                          <div className="mt-6 bg-gray-50 rounded-2xl p-6 border border-gray-100">
                            <div className="flex items-center gap-2 mb-2">
                              <i className="fas fa-store text-brand-600 text-xs"></i>
                              <span className="text-xs font-black uppercase tracking-widest text-brand-600">Vendor Reply</span>
                              {review.vendorReplyDate && (
                                <span className="text-[10px] text-gray-400 font-bold ml-auto">
                                  {new Date(review.vendorReplyDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                </span>
                              )}
                            </div>
                            <p className="text-gray-600 text-sm font-medium leading-relaxed">{review.vendorReply}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'shipping' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-12"
              >
                <div className="grid md:grid-cols-2 gap-12">
                  {product.shippingReturnPolicy ? (
                    <div className="col-span-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {product.shippingReturnPolicy.split('\n').map((line, i) => {
                          if (!line.trim()) return null;
                          const [title, ...rest] = line.split(':');
                          const value = rest.join(':').trim();
                          
                          let icon = 'fas fa-info-circle';
                          let colorClass = 'bg-gray-100 text-gray-500';
                          if (title.toLowerCase().includes('warranty')) { icon = 'fas fa-shield-alt'; colorClass = 'bg-blue-50 text-blue-500'; }
                          else if (title.toLowerCase().includes('guarantee')) { icon = 'fas fa-certificate'; colorClass = 'bg-emerald-50 text-emerald-500'; }
                          else if (title.toLowerCase().includes('return')) { icon = 'fas fa-undo'; colorClass = 'bg-amber-50 text-amber-500'; }
                          else if (title.toLowerCase().includes('delivery') || title.toLowerCase().includes('shipping')) { icon = 'fas fa-truck'; colorClass = 'bg-purple-50 text-purple-500'; }

                          return (
                            <div key={i} className="flex gap-4 p-5 rounded-2xl bg-gray-50 border border-gray-100 hover:border-gray-200 transition-all">
                              <div className={`w-12 h-12 shrink-0 rounded-xl flex items-center justify-center text-lg ${colorClass}`}>
                                <i className={icon}></i>
                              </div>
                              <div>
                                <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{title.trim()}</h5>
                                <p className="text-gray-900 font-bold text-sm">{value || 'Not Specified'}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-6">
                        <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center text-xl">
                          <i className="fas fa-truck"></i>
                        </div>
                        <h4 className="text-xl font-black text-gray-900">Fast Delivery</h4>
                        <p className="text-gray-500 font-medium leading-relaxed">Standard shipping takes 3-5 business days. Express options available at checkout for next-day delivery.</p>
                      </div>
                      <div className="space-y-6">
                        <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center text-xl">
                          <i className="fas fa-undo"></i>
                        </div>
                        <h4 className="text-xl font-black text-gray-900">Easy Returns</h4>
                        <p className="text-gray-500 font-medium leading-relaxed">Not satisfied? Return your item within 30 days for a full refund. No questions asked.</p>
                      </div>
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Recently Viewed */}
      {recentlyViewed.filter(p => p.id !== product.id).length > 0 && (
        <section className="mb-16">
          <h2 className="text-2xl font-black text-gray-900 tracking-tight mb-8">Recently Viewed</h2>
          <div className="flex gap-4 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
            {recentlyViewed.filter(p => p.id !== product.id).slice(0, 6).map((p: Product) => (
              <div
                key={p.id}
                onClick={() => handleSelectProduct(p)}
                className="shrink-0 w-36 cursor-pointer group"
              >
                <div className="w-36 h-36 rounded-2xl overflow-hidden bg-gray-100 mb-2">
                  {p.image && <img src={p.image} referrerPolicy="no-referrer" alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />}
                </div>
                <p className="text-xs font-black text-gray-900 truncate group-hover:text-brand-600 transition-colors">{p.name}</p>
                <p className="text-xs font-bold text-brand-600">৳{Number(p.price).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {relatedProducts.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-12">
            <h2 className="text-3xl font-black text-gray-900 tracking-tight">You May Also Like</h2>
            <button onClick={() => navigate('/products')} className="text-xs font-black text-brand-600 uppercase tracking-widest hover:underline">View All</button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
            {relatedProducts.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                onAddToCart={handleAddToCart}
                onSelect={() => handleSelectProduct(p)}
                onToggleWishlist={handleToggleWishlist}
                isWishlisted={wishlist.includes(p.id)}
                userRole={userRole}
              />
            ))}
          </div>
        </section>
      )}

      {productReportModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setProductReportModal(false)}>
          <div className="bg-white rounded-[2rem] p-8 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-black text-gray-900 mb-2">Report Product</h3>
            <p className="text-gray-400 font-medium text-sm mb-6">Why are you reporting this product?</p>
            <div className="space-y-2 mb-6">
              {['Counterfeit or fake product', 'Wrong or misleading description', 'Inappropriate or offensive content', 'Prohibited item', 'Other'].map(r => (
                <button
                  key={r}
                  onClick={() => setProductReportReason(r)}
                  className={`w-full text-left px-5 py-3 rounded-xl font-bold text-sm transition-all border-2 ${productReportReason === r ? 'border-brand-600 bg-grad-soft text-brand-600' : 'border-gray-100 bg-gray-50 text-gray-700 hover:border-gray-300'}`}
                >
                  {r}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setProductReportModal(false)} className="flex-1 py-3 bg-gray-100 text-gray-900 rounded-2xl font-black text-sm hover:bg-gray-200 transition-all">Cancel</button>
              <button
                onClick={async () => {
                  if (!productReportReason) return;
                  try {
                    await supabase.from('reported_products').insert({
                      product_id: product.id,
                      product_name: product.name,
                      reporter_name: user?.name || 'Guest',
                      reason: productReportReason,
                      date: new Date().toISOString()
                    });
                    setProductReported(true);
                  } catch (err) {
                    console.error(err);
                  }
                  setProductReportModal(false);
                }}
                disabled={!productReportReason}
                className="flex-1 py-3 bg-red-500 text-white rounded-2xl font-black text-sm hover:bg-red-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Submit Report
              </button>
            </div>
          </div>
        </div>
      )}
      {reportModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setReportModal(null)}>
          <div className="bg-white rounded-[2rem] p-8 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-black text-gray-900 mb-2">Report Review</h3>
            <p className="text-gray-400 font-medium text-sm mb-6">Why are you reporting this review?</p>
            <div className="space-y-2 mb-6">
              {['Spam', 'Fake review', 'Inappropriate content', 'Harassment', 'Other'].map(r => (
                <button
                  key={r}
                  onClick={() => setReportReason(r)}
                  className={`w-full text-left px-5 py-3 rounded-xl font-bold text-sm transition-all border-2 ${reportReason === r ? 'border-brand-600 bg-grad-soft text-brand-600' : 'border-gray-100 bg-gray-50 text-gray-700 hover:border-gray-300'}`}
                >
                  {r}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setReportModal(null)} className="flex-1 py-3 bg-gray-100 text-gray-900 rounded-2xl font-black text-sm hover:bg-gray-200 transition-all">Cancel</button>
              <button
                onClick={async () => {
                  if (!reportReason) return;
                  const reviewId = reportModal.reviewId;
                  
                  try {
                    const targetReview = allReviews.find((r: Review) => r.id === reviewId);
                    if (targetReview) {
                      await supabase.from('reported_reviews').insert({
                        review_id: reviewId,
                        product_id: product.id,
                        reviewer_name: targetReview.userName,
                        review_text: targetReview.comment,
                        report_reason: reportReason,
                        date: new Date().toISOString()
                      });
                      setReportedReviewIds([...reportedReviewIds, reviewId]);
                    }
                  } catch (err) {
                    console.error(err);
                  }
                  setReportModal(null);
                }}
                disabled={!reportReason}
                className="flex-1 py-3 bg-brand-600 text-white rounded-2xl font-black text-sm hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Submit Report
              </button>
            </div>
          </div>
        </div>
      )}
      
      {isLightboxOpen && (
        <div className="fixed inset-0 z-[200] bg-black/90 flex flex-col items-center justify-center p-4">
          <button 
            onClick={() => setIsLightboxOpen(false)}
            className="absolute top-6 right-6 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors"
          >
            <i className="fas fa-times text-xl"></i>
          </button>
          <img src={activeImage || undefined} referrerPolicy="no-referrer" className="max-w-full max-h-[80vh] object-contain mb-8" alt="Zoomed" />
          <div className="flex gap-4">
            {[product.image, ...(product.images || []), ...(product.colors?.map(c => c.image) || [])].filter((v, i, a) => a.indexOf(v) === i).slice(0, 4).map((img, i) => (
              <button
                key={i}
                onClick={() => setActiveImage(img)}
                className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${activeImage === img ? 'border-brand-500 scale-110' : 'border-transparent opacity-50 hover:opacity-100'}`}
              >
                {img && <img src={img} referrerPolicy="no-referrer" className="w-full h-full object-cover" alt="Thumb" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default ProductDetailsView;
