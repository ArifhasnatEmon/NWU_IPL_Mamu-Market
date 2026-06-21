import React from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Vendor } from '../../types';
import { useAuth } from '../../context/AuthContext';
import PageTitle from '../../components/PageTitle';
import { useApp } from '../../context/AppContext';
import { useSharedVendors, useSharedProducts } from '../../context/DataContext';

const TopVendorsView: React.FC = () => {
  const { navigateToVendor } = useApp();
  const navigate = useNavigate();
  const { vendors: dynamicVendors, loading } = useSharedVendors();
  const { products: approvedProducts } = useSharedProducts();

  // Compute vendor ratings from their products and sort
  const top7Vendors = dynamicVendors && dynamicVendors.length > 0
    ? [...dynamicVendors].map(v => {
        const vendorProducts = approvedProducts.filter(p => p.vendorId === v.id);
        const ratedProducts = vendorProducts.filter(p => p.rating > 0);
        const computedRating = ratedProducts.length > 0
          ? Math.round((ratedProducts.reduce((sum, p) => sum + p.rating, 0) / ratedProducts.length) * 10) / 10
          : 0;
        return { ...v, rating: computedRating, productsCount: vendorProducts.length };
      }).sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 7)
    : [];

  return (
    <div className="container mx-auto px-4 py-20">
      <PageTitle title="Top Rated Stores" />
      <div className="flex items-center justify-between mb-16">
        <div>
          <h1 className="text-5xl font-black text-gray-900 tracking-tighter mb-4 text-gradient">Top Rated Vendors</h1>
          <p className="text-xl text-gray-500 font-medium">The most trusted merchants in our marketplace.</p>
        </div>
        <button onClick={() => navigate('/products')} className="px-8 py-3 bg-gray-100 rounded-2xl font-black text-gray-600 hover:bg-gray-200 transition-all">
          Back to Shopping
        </button>
      </div>

      <div className="max-w-4xl mx-auto space-y-6">
        {top7Vendors.map((vendor, idx) => (
          <motion.div 
            key={vendor.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm hover:shadow-xl transition-all flex items-center gap-8 group"
          >
            <div className="w-24 h-24 rounded-2xl overflow-hidden shadow-lg shrink-0">
              <img src={vendor.logo || 'https://via.placeholder.com/150?text=Logo'} referrerPolicy="no-referrer" className="w-full h-full object-cover" alt={vendor.name} />
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-black text-gray-900 mb-2">{vendor.name}</h3>
              <div className="flex items-center gap-4 mb-2">
                <div className="flex text-amber-400 gap-0.5">
                  {[1, 2, 3, 4, 5].map(s => <i key={s} className={`fas fa-star text-xs ${s <= Math.floor(vendor.rating) ? '' : 'text-gray-100'}`}></i>)}
                </div>
                <span className="text-sm font-black text-gray-900">{vendor.rating}</span>
              </div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{vendor.productsCount} Products • Joined {vendor.joinedDate}</p>
            </div>
            <button 
              onClick={() => navigateToVendor(vendor)}
              className="px-10 py-4 gradient-primary text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-brand-500/20 hover:scale-105 active:scale-95 transition-all"
            >
              Visit Store
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default TopVendorsView;
