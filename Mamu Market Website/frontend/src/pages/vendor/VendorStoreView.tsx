import { createSlug } from '../../utils/slug';
import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import { Product, Vendor } from '../../types';
import { getCategoryName } from '../../config';
import ProductCard from '../../components/product/ProductCard';
import SkeletonCard from '../../components/ui/SkeletonCard';
import PageTitle from '../../components/PageTitle';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { useCart } from '../../context/CartContext';
import { useApp } from '../../context/AppContext';
import { useVendorProducts } from '../../hooks/useProducts';
import { useSharedProducts, useSharedVendors } from '../../context/DataContext';

const VendorStoreView: React.FC = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { handleAddToCart } = useCart();
  const { setToast, wishlist, handleToggleWishlist, handleSelectProduct } = useApp();
  const navigate = useNavigate();

  const { products: approvedProducts } = useSharedProducts();
  const { vendors: fetchedVendors, loading: vendorsLoading } = useSharedVendors();

  const allVendors = fetchedVendors;
  const vendor = allVendors.find(v => v.id === id || createSlug(v.name) === id);

  const [contactModal, setContactModal] = useState(false);
  const [contactMsg, setContactMsg] = useState('');
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(t);
  }, []);

  const { products: vendorDynamicProducts, loading: productsLoading } = useVendorProducts(vendor?.id);

  if (!vendor && !vendorsLoading) return <Navigate to="/vendors" replace />;
  if (vendorsLoading) return <div className="flex h-screen items-center justify-center"><div className="w-16 h-16 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div></div>;

  const vendorFromStorage = fetchedVendors.find(u => u.id === vendor?.id);
  const vendorData = { ...vendor, ...vendorFromStorage };
  const bannerSrc = vendorFromStorage?.banner || vendor?.banner || '';
  const isVerified = vendorFromStorage ? vendorFromStorage.verified : vendor.verified;

  const vendorProducts = vendorDynamicProducts.filter(p => p.status === 'approved');

  const ratedProducts = vendorProducts.filter(p => p.rating > 0);
  const vendorRating = ratedProducts.length > 0
    ? Math.round((ratedProducts.reduce((sum, p) => sum + p.rating, 0) / ratedProducts.length) * 10) / 10
    : 0;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <PageTitle title={vendor?.name || 'Vendor Store'} />
      <div className="relative h-[500px] bg-gray-900 overflow-hidden">
        <div style={{ backgroundImage: bannerSrc ? `url(${bannerSrc})` : 'linear-gradient(135deg, #4c1d95, #7c3aed, #a855f7)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }} className="w-full h-full opacity-40 scale-110" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-gray-900/50 to-gray-900"></div>

        <div className="absolute inset-0 flex items-center justify-center pt-20">
          <div className="text-center max-w-4xl px-4">
            <div className="relative z-10 flex flex-col items-center text-center">
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="relative mb-6"
            >
              <div className="absolute inset-0 bg-brand-500 blur-3xl opacity-30 rounded-full"></div>
              {vendor?.logo ? (
                <img src={vendor.logo} referrerPolicy="no-referrer" alt={vendor.name} className="w-32 h-32 rounded-full border-4 border-white shadow-2xl relative z-10 object-cover" />
              ) : (
                <div className="w-32 h-32 rounded-full bg-brand-500 flex items-center justify-center text-5xl font-black text-white border-4 border-white shadow-2xl relative z-10">
                  {(vendor?.name || 'V').charAt(0).toUpperCase()}
                </div>
              )}
              {isVerified && (
                <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white border-4 border-white shadow-lg z-20">
                  <i className="fas fa-check text-sm"></i>
                </div>
              )}
            </motion.div>

            {vendorData?.category && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="inline-block px-5 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-[10px] font-black uppercase tracking-[0.2em] mb-4"
              >
                {vendorData.category.replace(/,/g, ', ')}
              </motion.div>
            )}

            <motion.h1
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-10 tracking-tighter leading-tight max-w-4xl mx-auto drop-shadow-sm"
            >
              {vendor?.name}
            </motion.h1>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center justify-center bg-white/10 backdrop-blur-xl rounded-[2rem] border border-white/20 shadow-2xl overflow-hidden divide-x divide-white/10"
            >
              <div className="flex flex-col items-center px-10 py-5 hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-2 text-amber-400 mb-1">
                  <i className="fas fa-star text-sm"></i>
                  <span className="font-black text-2xl text-white">{vendorRating || '—'}</span>
                </div>
                <span className="text-white/60 text-[10px] font-black uppercase tracking-[0.2em]">Rating</span>
              </div>
              <div className="flex flex-col items-center px-10 py-5 hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-2 text-brand-400 mb-1">
                  <i className="fas fa-box text-sm"></i>
                  <span className="font-black text-2xl text-white">{vendorProducts.length}</span>
                </div>
                <span className="text-white/60 text-[10px] font-black uppercase tracking-[0.2em]">Products</span>
              </div>
              <div className="flex flex-col items-center px-10 py-5 hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-2 text-emerald-400 mb-1">
                  <i className="fas fa-calendar-alt text-sm"></i>
                  <span className="font-black text-2xl text-white">{new Date(vendor?.joinedDate || '').getFullYear()}</span>
                </div>
                <span className="text-white/60 text-[10px] font-black uppercase tracking-[0.2em]">Joined</span>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>

      <div className="container mx-auto px-4 py-20">
        <div className="grid lg:grid-cols-4 gap-16">
          <div className="lg:col-span-1">
            <div className="sticky top-32 space-y-12">
              <div>
                <h3 className="text-xs font-black uppercase tracking-[0.3em] text-gray-400 mb-6">About Store</h3>
                <p className="text-gray-600 font-medium leading-relaxed">
                  {vendorData?.description || ''}
                </p>
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-[0.3em] text-gray-400 mb-6">Member Since</h3>
                <p className="text-gray-900 font-black">{new Date(vendor?.joinedDate || '').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
              </div>
              {vendorData?.storeCity && (
                <div className="mt-6">
                  <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-1">Location</p>
                  <div className="flex items-center gap-2">
                    <i className="fas fa-map-marker-alt text-brand-500 text-sm"></i>
                    <span className="text-sm font-bold text-gray-700">{vendorData.storeCity}</span>
                  </div>
                </div>
              )}
              {vendorData?.phone && (
                <div className="mt-6">
                  <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-1">Phone</p>
                  <div className="flex items-center gap-2">
                    <i className="fas fa-phone text-brand-500 text-sm"></i>
                    <span className="text-sm font-bold text-gray-700">{vendorData.phone}</span>
                  </div>
                </div>
              )}
              {(vendorData?.socialFacebook || vendorData?.socialInstagram || vendorData?.socialWhatsapp || vendorData?.socialYoutube) && (
                <div className="mt-6">
                  <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">Follow Us</p>
                  <div className="flex gap-3 flex-wrap">
                    {vendorData?.socialFacebook && (
                      <a href={vendorData.socialFacebook.startsWith('http') ? vendorData.socialFacebook : `https://${vendorData.socialFacebook}`} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 hover:bg-blue-100 transition-all">
                        <i className="fab fa-facebook"></i>
                      </a>
                    )}
                    {vendorData?.socialInstagram && (
                      <a href={vendorData.socialInstagram.startsWith('http') ? vendorData.socialInstagram : `https://${vendorData.socialInstagram}`} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-xl bg-pink-50 flex items-center justify-center text-pink-500 hover:bg-pink-100 transition-all">
                        <i className="fab fa-instagram"></i>
                      </a>
                    )}
                    {vendorData?.socialWhatsapp && (
                      <a href={`https://wa.me/${vendorData.socialWhatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-green-500 hover:bg-green-100 transition-all">
                        <i className="fab fa-whatsapp"></i>
                      </a>
                    )}
                    {vendorData?.socialYoutube && (
                      <a href={vendorData.socialYoutube.startsWith('http') ? vendorData.socialYoutube : `https://${vendorData.socialYoutube}`} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-500 hover:bg-red-100 transition-all">
                        <i className="fab fa-youtube"></i>
                      </a>
                    )}
                  </div>
                </div>
              )}
              {user?.id === vendor?.id ? (
                <button
                  onClick={() => navigate('/settings/store')}
                  className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:opacity-90 transition-all"
                >
                  <i className="fas fa-cog mr-2"></i> Edit Store Settings
                </button>
              ) : (
                <button onClick={() => { if (!user) { navigate('/user-login'); return; } if (user.role === 'vendor') { setToast('Vendors cannot message other vendors'); return; } setContactModal(true); }}
                  className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:opacity-90 transition-all">
                  Contact Seller
                </button>
              )}
            </div>
          </div>
          <div className="lg:col-span-3">
            <div className="flex justify-between items-end mb-12">
              <h2 className="text-3xl font-black text-gray-900 tracking-tight">Store Products</h2>
              <p className="text-gray-400 font-bold text-sm">{vendorProducts.length} items found</p>
            </div>

            {isLoading || productsLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-6">
                {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : vendorProducts.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-6">
                {vendorProducts.map((p) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    onAddToCart={handleAddToCart}
                    onSelect={() => handleSelectProduct(p)}
                    onToggleWishlist={handleToggleWishlist}
                    isWishlisted={wishlist.includes(p.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-200">
                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm">
                  <i className="fas fa-box-open text-4xl text-gray-300"></i>
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-2">No Products Available</h3>
                <p className="text-gray-500 font-medium text-center max-w-md">
                  This vendor hasn't added any products yet. Check back later for new arrivals!
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      {contactModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setContactModal(false)}>
          <div className="bg-white rounded-[2rem] p-8 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-6">
              {vendor.logo || vendor.banner ? (
                <img src={vendor.logo || vendor.banner || 'https://via.placeholder.com/150'} referrerPolicy="no-referrer" className="w-12 h-12 rounded-xl object-cover" alt="" />
              ) : (
                <div className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-white text-lg shrink-0" style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}>
                  {(vendor?.name || 'V').charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <p className="font-black text-gray-900">{vendor?.name}</p>
                <p className="text-xs text-gray-400 font-medium">Send a message</p>
              </div>
            </div>
            <textarea value={contactMsg} onChange={e => setContactMsg(e.target.value)}
              placeholder="Write your message here..." rows={4}
              className="w-full bg-gray-50 rounded-2xl px-5 py-4 outline-none font-bold text-sm border-none resize-none mb-4" />
            <div className="flex gap-3">
              <button onClick={() => setContactModal(false)} className="flex-1 py-4 bg-gray-100 text-gray-900 rounded-2xl font-black text-sm uppercase tracking-widest">Cancel</button>
              <button onClick={async () => {
                if (!contactMsg.trim() || !user) return;
                try {
                  const { error } = await supabase.from('messages').insert({
                    sender_id: user.id,
                    sender_name: user.name || user.storeName || 'Customer',
                    sender_role: user.role || 'customer',
                    sender_avatar: user.avatar || '',
                    receiver_id: vendor.id,
                    receiver_name: vendor.name,
                    receiver_avatar: vendor.logo || vendor.banner || '',
                    text: contactMsg.trim(),
                    date: new Date().toISOString()
                  });
                  if (error) throw error;
                  setContactModal(false);
                  setContactMsg('');
                  setToast('Message sent to vendor!');
                  setTimeout(() => navigate('/messages'), 500);
                } catch (err) {
                  console.error(err);
                  setToast('Error: ' + (err.message || 'Failed to send message.'));
                }
              }} className="flex-1 py-4 bg-brand-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-brand-800 transition-all">Send Message</button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default VendorStoreView;
