import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Vendor, Product } from '../../types';
import Pagination from '../../components/ui/Pagination';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import PageTitle from '../../components/PageTitle';
import { useSharedProducts, useSharedVendors } from '../../context/DataContext';

const VendorsView: React.FC = () => {
  const { navigateToVendor } = useApp();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState<'default' | 'rating' | 'products'>('default');
  const { products: dynamicProducts } = useSharedProducts();
  const [allVendors, setAllVendors] = useState<Vendor[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [catOpen, setCatOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const catRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);
  const itemsPerPage = 6;

  const { vendors: fetchedVendors } = useSharedVendors();

  useEffect(() => {
    // Only use dynamic vendors from database
    const localVendors = fetchedVendors
      .map((u: Vendor) => {
        const vendorProducts = dynamicProducts.filter((p: Product) => p.vendorId === u.id);
        const dynamicCount = vendorProducts.length;
        // Compute vendor rating from their products' ratings
        const ratedProducts = vendorProducts.filter(p => p.rating > 0);
        const vendorRating = ratedProducts.length > 0
          ? Math.round((ratedProducts.reduce((sum, p) => sum + p.rating, 0) / ratedProducts.length) * 10) / 10
          : 0;
        return {
          ...u,
          productsCount: dynamicCount,
          rating: vendorRating,
          isNew: true,
        } as Vendor;
      });

    setAllVendors(localVendors);

    // Unique Categories
    const catSet = new Set<string>();
    localVendors.forEach((v: Vendor) => {
      (v.category || '').split(',').forEach((c: string) => {
        const trimmed = c.trim();
        if (trimmed) catSet.add(trimmed);
      });
    });
    setCategories(Array.from(catSet).sort());
  }, [dynamicProducts, fetchedVendors]);

  // Close Dropdowns
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (catRef.current && !catRef.current.contains(e.target as Node)) setCatOpen(false);
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filteredVendors = allVendors.filter(v => {
    const vendorCats = (v.category || '').split(',').map((c: string) => c.trim());
    const matchCat = selectedCategory === 'All' || vendorCats.includes(selectedCategory);
    const matchSearch = v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendorCats.some((c: string) => c.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchCat && matchSearch;
  });

  const sortedVendors = [...filteredVendors].sort((a, b) => {
    if (sortBy === 'rating') return b.rating - a.rating;
    if (sortBy === 'products') return b.productsCount - a.productsCount;
    return 0;
  });

  const totalPages = Math.ceil(sortedVendors.length / itemsPerPage);
  const paginatedVendors = sortedVendors.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, selectedCategory, sortBy]);


  const sortLabels: Record<string, string> = {
    default: 'Default',
    rating: 'Top Rated',
    products: 'Most Products',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <PageTitle title="All Stores" />
      {/* Hero */}
      <div className="bg-white border-b border-gray-100 pt-20 pb-12">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <h1 className="text-5xl lg:text-6xl font-black text-gray-900 mb-4 tracking-tighter">Our Trusted Vendors</h1>
          <p className="text-lg text-gray-500 font-medium mb-10">Explore top-rated stores and shop directly from them.</p>

          {/* Search */}
          <div className="relative max-w-xl mx-auto">
            <i className="fas fa-search absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 text-base"></i>
            <input
              type="text"
              placeholder="Search stores..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl py-4 pl-12 pr-5 text-base font-medium outline-none focus:border-brand-500 focus:bg-white transition-all"
            />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Filter bar */}
        <div className="flex items-center justify-between mb-8 gap-4">
          <div className="flex items-center gap-3">
            {/* Category dropdown */}
            <div ref={catRef} className="relative">
              <button
                onClick={() => { setCatOpen(o => !o); setSortOpen(false); }}
                className="flex items-center gap-2 bg-white border-2 border-gray-100 rounded-xl px-4 py-2.5 font-black text-sm text-gray-700 hover:border-brand-400 transition-all shadow-sm"
              >
                <i className="fas fa-tag text-brand-500 text-xs"></i>
                {selectedCategory}
                <i className={`fas fa-chevron-down text-gray-400 text-[10px] transition-transform ${catOpen ? 'rotate-180' : ''}`}></i>
              </button>
              <AnimatePresence>
                {catOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full mt-2 left-0 bg-white rounded-2xl border border-gray-100 shadow-xl z-30 min-w-[180px] py-2 overflow-hidden"
                  >
                    {['All', ...categories].map(cat => (
                      <button
                        key={cat}
                        onClick={() => { setSelectedCategory(cat); setCatOpen(false); }}
                        className={`w-full text-left px-4 py-2.5 text-sm font-bold transition-colors flex items-center gap-2 ${selectedCategory === cat ? 'text-brand-600 bg-brand-50' : 'text-gray-700 hover:bg-gray-50'
                          }`}
                      >
                        {selectedCategory === cat && <i className="fas fa-check text-brand-500 text-[10px]"></i>}
                        {cat}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Active filter pill */}
            {selectedCategory !== 'All' && (
              <motion.span
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex items-center gap-1.5 bg-brand-50 text-brand-600 px-3 py-1.5 rounded-full text-xs font-black"
              >
                {selectedCategory}
                <button onClick={() => setSelectedCategory('All')} className="hover:text-brand-800">
                  <i className="fas fa-times text-[10px]"></i>
                </button>
              </motion.span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-gray-400 hidden sm:block">{sortedVendors.length} stores</span>

            {/* Sort dropdown */}
            <div ref={sortRef} className="relative">
              <button
                onClick={() => { setSortOpen(o => !o); setCatOpen(false); }}
                className="flex items-center gap-2 bg-white border-2 border-gray-100 rounded-xl px-4 py-2.5 font-black text-sm text-gray-700 hover:border-brand-400 transition-all shadow-sm"
              >
                <i className="fas fa-sort text-brand-500 text-xs"></i>
                {sortLabels[sortBy]}
                <i className={`fas fa-chevron-down text-gray-400 text-[10px] transition-transform ${sortOpen ? 'rotate-180' : ''}`}></i>
              </button>
              <AnimatePresence>
                {sortOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full mt-2 right-0 bg-white rounded-2xl border border-gray-100 shadow-xl z-30 min-w-[180px] py-2"
                  >
                    {Object.entries(sortLabels).map(([key, label]) => (
                      <button
                        key={key}
                        onClick={() => { setSortBy(key as 'default' | 'rating' | 'products'); setSortOpen(false); }}
                        className={`w-full text-left px-4 py-2.5 text-sm font-bold transition-colors flex items-center gap-2 ${sortBy === key ? 'text-brand-600 bg-brand-50' : 'text-gray-700 hover:bg-gray-50'
                          }`}
                      >
                        {sortBy === key && <i className="fas fa-check text-brand-500 text-[10px]"></i>}
                        {label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Vendor Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginatedVendors.map((vendor, idx) => (
            <motion.div
              key={vendor.id + sortBy}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.05 }}
              className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all overflow-hidden group flex flex-col"
            >
              <div className="h-32 bg-gray-100 relative overflow-hidden">
                {vendor.banner ? (
                  <img src={vendor.banner || 'https://via.placeholder.com/800x400?text=Banner'} referrerPolicy="no-referrer" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="Banner" />
                ) : (
                  <div className="w-full h-full gradient-primary opacity-10"></div>
                )}
              </div>

              <div className="px-7 pb-7 flex flex-col flex-1 relative">
                <div className="absolute -top-10 left-7 w-20 h-20 rounded-2xl bg-white p-1.5 shadow-lg border border-gray-50">
                  {vendor.logo ? (
                    <img src={vendor.logo || 'https://via.placeholder.com/150?text=Logo'} referrerPolicy="no-referrer" className="w-full h-full rounded-xl object-cover" alt={vendor.name} />
                  ) : (
                    <div className="w-full h-full rounded-xl flex items-center justify-center font-black text-white text-3xl" style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}>
                      {(vendor.name || 'V').charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="mt-14 mb-5">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-black text-gray-900 truncate">{vendor.name}</h3>
                    {vendor.verified && <i className="fas fa-check-circle text-blue-500 text-sm"></i>}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(vendor.category || '').split(',').map((c: string) => c.trim()).filter(Boolean).map((cat: string) => (
                      <span key={cat} className="text-[10px] font-black text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full uppercase tracking-wide">{cat}</span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-1.5 bg-amber-50 px-3 py-1.5 rounded-full">
                    <i className="fas fa-star text-amber-400 text-[11px]"></i>
                    <span className="text-[11px] font-black text-amber-700">{vendor.rating || '—'}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Products</p>
                    <p className="text-sm font-black text-gray-900">{vendor.productsCount}</p>
                  </div>
                </div>

                <button
                  onClick={() => navigate(`/vendors/${vendor.id}`)}
                  className="mt-auto w-full py-3.5 rounded-2xl gradient-primary text-white font-black text-xs uppercase tracking-widest shadow-md shadow-brand-500/20 hover:scale-[1.02] active:scale-95 transition-all"
                >
                  Visit Store
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={page => { setCurrentPage(page); window.scrollTo(0, 0); }}
        />

        {sortedVendors.length === 0 && (
          <div className="text-center py-32">
            <i className="fas fa-store-slash text-5xl text-gray-200 mb-4 block"></i>
            <h3 className="text-xl font-black text-gray-900 mb-2">No vendors found</h3>
            <p className="text-gray-500 font-medium">Try a different search or category.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default VendorsView;
