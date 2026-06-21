import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import ReactCrop, { Crop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { useVendorRequests } from '../../hooks/useVendorRequests';
import { useVendorProducts } from '../../hooks/useProducts';
import { useSharedProducts, useSharedCategories } from '../../context/DataContext';
import { uploadImage } from '../../utils/imageUpload';
import { useOrders } from '../../hooks/useOrders';
import { useReviews } from '../../hooks/useReviews';
import { usePromoCodes } from '../../hooks/useMarketing';
import PageTitle from '../../components/PageTitle';

import { Product, ProductUpdate, Category, Order, OrderItem, PromoCode } from '../../types';
import { supabase } from '../../lib/supabase';


const DashboardView: React.FC = () => {
  const { user } = useAuth();
  const { setToast } = useApp();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const { categories: customCategories } = useSharedCategories();
  const { products: vendorProducts, loading: productsLoading } = useVendorProducts(user?.id);
  const myProducts = vendorProducts.filter((p: Product) => p.status === 'approved');
  const pendingProducts = vendorProducts.filter((p: Product) => p.status === 'pending' || p.status === 'rejected');
  const [pendingUpdates, setPendingUpdates] = useState<ProductUpdate[]>([]);
  const { requests, submitRequest } = useVendorRequests();

  useEffect(() => {
    if (!user?.id) return;
    const fetchUpdates = async () => {
      const { data, error } = await supabase.from('product_updates').select('*').eq('vendor_id', user.id);
      if (error) console.error('fetchUpdates error:', error);
      if (data) {
        setPendingUpdates(data.map(u => ({
          ...u,
          productId: u.product_id,
          vendorId: u.vendor_id,
          date: u.created_at
        })));
      }
    };
    fetchUpdates();
  }, [user?.id]);
  const [realOrderCount, setRealOrderCount] = useState(0);
  const [activeOrderCount, setActiveOrderCount] = useState(0);
  const [dismissedIds, setDismissedIds] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('dismissedSubmissions') || '[]'); } catch { return []; }
  });
  const { orders: allOrders } = useOrders(user);

  const normalizeStatus = (status?: string): string => {
    if (!status) return 'Processing';
    const n = status.toLowerCase();
    if (n === 'pending' || n === 'processing') return 'Processing';
    if (n === 'shipped') return 'Shipped';
    if (n === 'delivered') return 'Delivered';
    if (n === 'cancelled' || n === 'failed') return 'Cancelled';
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  useEffect(() => {
    // Filter Vendor Orders
    const vendorOrders = allOrders.filter((order: Order) =>
      order.items?.some((item: OrderItem) => item.vendorId === user?.id)
    );
    setRealOrderCount(vendorOrders.length);
    setActiveOrderCount(vendorOrders.filter((o: Order) => {
      const st = normalizeStatus(o.status);
      return st !== 'Cancelled' && st !== 'Delivered';
    }).length);
  }, [user, allOrders]);

  const storeCategory = user?.storeCategory || '';
  const approvedCategoryRequests = requests
    .filter(r => r.request_type === 'category_add' && r.status === 'approved')
    .map(r => r.requested_value);
  // Only exclude a category if its most recent approved removal is NEWER than its most recent approved add
  const isEffectivelyRemoved = (catName: string | undefined) => {
    const catLower = (catName || '').toLowerCase();
    const latestRemoval = requests
      .filter(r => r.request_type === 'category_remove' && r.status === 'approved' && (r.current_value || '').toLowerCase() === catLower)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
    if (!latestRemoval) return false;
    const latestAdd = requests
      .filter(r => r.request_type === 'category_add' && r.status === 'approved' && (r.requested_value || '').toLowerCase() === catLower)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
    if (!latestAdd) return true;
    return new Date(latestRemoval.created_at).getTime() > new Date(latestAdd.created_at).getTime();
  };
  const vendorCategories = (storeCategory
    ? [...new Set([...storeCategory.split(',').map((c: string) => c.trim()), ...approvedCategoryRequests])].filter(Boolean)
    : approvedCategoryRequests.length > 0 ? approvedCategoryRequests : []
  ).filter(cat => cat && !isEffectivelyRemoved(cat)) as string[];

  const [form, setForm] = useState({
    productName: '', category: vendorCategories.length >= 1 ? vendorCategories[0] : '', subCategory: '', price: '', originalPrice: '',
    units: '', description: '', shortDescription: '', shippingReturnPolicy: '', mainImage: '',
    extraImage1: '', extraImage2: '', extraImage3: '',
    color1name: '', color1image: '', color2name: '', color2image: '',
    color3name: '', color3image: '', color4name: '', color4image: '',
    isSale: false,
    dealType: 'none' as 'none' | 'flash' | 'weekly' | 'monthly',
    stockStatus: 'in_stock' as 'in_stock' | 'out_of_stock' | 'discontinued',
  });
  const [updateReason, setUpdateReason] = useState('');
  const [deleteReason, setDeleteReason] = useState('');
  const [customDeleteReason, setCustomDeleteReason] = useState('');
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const { products: approvedProducts } = useSharedProducts();
  const { reviews } = useReviews({ vendorId: user?.id });

  const { promoCodes } = usePromoCodes(user?.id);

  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [currentImageField, setCurrentImageField] = useState('');
  const [upImg, setUpImg] = useState<string | ArrayBuffer | null>();
  const [crop, setCrop] = useState<Crop>({
    unit: '%',
    width: 50,
    height: 50,
    x: 25,
    y: 25
  });
  const imgRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onSelectFile = (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
    if (e.target.files && e.target.files.length > 0) {
      setCurrentImageField(fieldName);
      const reader = new FileReader();
      reader.addEventListener('load', () => setUpImg(reader.result));
      reader.readAsDataURL(e.target.files[0]);
      setCropModalOpen(true);
    }
  };

  const getCroppedImg = () => {
    if (!imgRef.current || !crop.width || !crop.height) return;
    const canvas = document.createElement('canvas');
    const image = imgRef.current;
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    const pixelCropX = (crop.unit === '%' ? (crop.x / 100) * image.width : crop.x) * scaleX;
    const pixelCropY = (crop.unit === '%' ? (crop.y / 100) * image.height : crop.y) * scaleY;
    const pixelCropW = (crop.unit === '%' ? (crop.width / 100) * image.width : crop.width) * scaleX;
    const pixelCropH = (crop.unit === '%' ? (crop.height / 100) * image.height : crop.height) * scaleY;

    canvas.width = pixelCropW;
    canvas.height = pixelCropH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(
      image,
      pixelCropX,
      pixelCropY,
      pixelCropW,
      pixelCropH,
      0,
      0,
      pixelCropW,
      pixelCropH
    );

    const base64Image = canvas.toDataURL('image/webp', 0.95);
    setForm(prev => ({ ...prev, [currentImageField]: base64Image }));
    setCropModalOpen(false);
    setUpImg(null);
  };

  const handleRemoveImage = (fieldName: string) => {
    setForm(prev => ({ ...prev, [fieldName]: '' }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const refreshData = () => {
    // Refresh Handler
    window.location.reload();
  };

  const handleSubmit = async () => {
    const colors = [];
    if (form.color1name) colors.push({ name: form.color1name, image: form.color1image });
    if (form.color2name) colors.push({ name: form.color2name, image: form.color2image });
    if (form.color3name) colors.push({ name: form.color3name, image: form.color3image });
    if (form.color4name) colors.push({ name: form.color4name, image: form.color4image });

    if (editingProduct) {
      const isApproved = myProducts.some((p: Product) => p.id === editingProduct.id);

      if (isApproved) {
        try {
        } catch (e) {
          setToast('Failed to save changes');
          return;
        }

        let hasOtherChanges = false;
        const changes: any = {};

        const fieldMapping: Record<string, string> = {
          'productName': 'product_name',
          'price': 'price',
          'originalPrice': 'original_price',
          'units': 'units',
          'description': 'description',
          'shortDescription': 'short_description',
          'shippingReturnPolicy': 'shipping_return_policy',
          'mainImage': 'main_image'
        };

        ['productName', 'price', 'originalPrice', 'units', 'description', 'shortDescription', 'shippingReturnPolicy', 'mainImage'].forEach(field => {
          const oldVal = String(editingProduct[field as keyof Product] ?? '');
          const newVal = String((form as any)[field] ?? '');
          if (oldVal !== newVal) {
            hasOtherChanges = true;
            changes[fieldMapping[field]] = newVal;
          }
        });

        if (hasOtherChanges) {
          try {
            // Deprecated modal functionality
          } catch (err) {
            console.error(err);
          }
        } else {
          setToast('Deal section updated.');
        }
        setUpdateReason('');
      } else {
        const changes: any = {};
        const fieldMapping: Record<string, string> = {
          'productName': 'product_name',
          'price': 'price',
          'originalPrice': 'original_price',
          'units': 'units',
          'description': 'description',
          'shortDescription': 'short_description',
          'shippingReturnPolicy': 'shipping_return_policy',
          'mainImage': 'main_image'
        };
        ['productName', 'price', 'originalPrice', 'units', 'description', 'shortDescription', 'shippingReturnPolicy', 'mainImage'].forEach(field => {
          if ((form as any)[field] !== editingProduct[field as keyof Product]) {
            changes[fieldMapping[field]] = (form as any)[field];
          }
        });
        if (Object.keys(changes).length > 0) {
          try {
            // Deprecated modal functionality
          } catch (err) {
            console.error(err);
          }
        }
      }
    } else {
      try {
        // Image Upload
        const mainImageUrl = await uploadImage(form.mainImage, 'product-images');
        const extraUrls = await Promise.all(
          [form.extraImage1, form.extraImage2, form.extraImage3].filter(Boolean).map(img => uploadImage(img, 'product-images'))
        );
        for (const c of colors) {
          if (c.image) c.image = await uploadImage(c.image, 'product-images');
        }

        // Deprecated modal functionality
      } catch (err) {
        console.error(err);
      }
    }
    setShowModal(false);
    setForm({ productName: '', category: vendorCategories.length >= 1 ? vendorCategories[0] : '', subCategory: '', price: '', originalPrice: '', units: '', description: '', shortDescription: '', shippingReturnPolicy: '', mainImage: '', extraImage1: '', extraImage2: '', extraImage3: '', color1name: '', color1image: '', color2name: '', color2image: '', color3name: '', color3image: '', color4name: '', color4image: '', isSale: false, dealType: 'none', stockStatus: 'in_stock' });
    refreshData();
  };

  const handleRemove = (product: Product) => {
    setDeleteTarget(product);
    setDeleteReason('');
    setDeleteModal(true);
  };

  const confirmDelete = async () => {
    const finalReason = deleteReason === 'Other' ? customDeleteReason.trim() : deleteReason.trim();
    if (!finalReason) { setToast('Please provide a reason'); return; }
    // Submit Deletion Request
    // Check if already requested
    const alreadyRequested = requests.some(r => r.request_type === 'product_remove' && r.current_value === deleteTarget?.id && r.status !== 'rejected');
    if (alreadyRequested) { setToast('Removal request already submitted!'); setDeleteModal(false); return; }

    if (!deleteTarget) return;
    await submitRequest('product_remove', deleteTarget.id, deleteTarget.productName || deleteTarget.name, finalReason);
    setDeleteModal(false);
    setDeleteTarget(null);
    setDeleteReason('');
    setCustomDeleteReason('');
    setToast('Removal request sent to admin for approval!');
  };

  return (
    <div className="container mx-auto px-4 py-20">
      <PageTitle title="Merchant Dashboard" />
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-16">
          <div>
            <h1 className="text-5xl font-black text-gray-900 tracking-tighter mb-4">Merchant Center</h1>
            <p className="text-xl text-gray-500 font-medium">Manage your store, track sales, and connect with customers.</p>
          </div>
          <div className="flex gap-4">
            <button onClick={() => navigate('/dashboard/add-product')} className="px-8 py-4 bg-gray-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-gray-800 transition-all shadow-xl shadow-black/10">Add New Product</button>
          </div>
        </div>

        {/* Promotion Glassmorphic Banner */}
        <div className="mb-16 p-8 rounded-[2rem] bg-gradient-to-br from-brand-600/5 to-purple-600/5 border border-white/60 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
          <div className="absolute inset-0 bg-white/40 group-hover:bg-white/50 transition-colors"></div>
          
          {/* Decorative shapes */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-brand-600/20 rounded-full blur-3xl group-hover:bg-brand-600/30 transition-colors"></div>
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-600/20 rounded-full blur-3xl group-hover:bg-purple-600/30 transition-colors"></div>

          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6 text-center md:text-left">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-600 to-purple-600 text-white flex items-center justify-center text-2xl shadow-lg shadow-brand-600/30 shrink-0 transform group-hover:scale-110 transition-transform duration-300">
                <i className="fas fa-bullhorn"></i>
              </div>
              <div>
                <h3 className="text-2xl font-black text-gray-900 tracking-tight mb-2">Want to boost your sales?</h3>
                <p className="text-gray-600 font-medium">Feature your top products on the homepage or top ticker to reach more customers instantly.</p>
              </div>
            </div>
            <div className="text-center md:text-right shrink-0">
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">For promotion contact</p>
              <a href="mailto:admin.mamumarket@gmail.com" className="inline-flex items-center gap-3 px-6 py-3 bg-white/80 border border-gray-100 rounded-xl shadow-sm hover:shadow-md hover:border-brand-600 transition-all group-hover:-translate-y-1">
                <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center">
                  <i className="fas fa-envelope"></i>
                </div>
                <span className="font-bold text-gray-900">admin.mamumarket@gmail.com</span>
              </a>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          {(() => {
            const storedUserId = user?.id;
            const approvedProds = myProducts;
            const allPendingProds = pendingProducts;
            const rejectedProds = allPendingProds.filter((p: Product) => p.status === 'rejected');
            const activePendingProds = allPendingProds.filter((p: Product) => p.status === 'pending');
            
            const activePendingUpdates = pendingUpdates.filter(u => u.status === 'pending');
            const activePendingReqs = requests.filter(r => r.status === 'pending');
            const activePendingPromos = promoCodes.filter((c: PromoCode) => c.status === 'pending');
            const totalPending = activePendingProds.length + activePendingUpdates.length + activePendingReqs.length + activePendingPromos.length;

            const rejectedUpdates = pendingUpdates.filter(u => u.status === 'rejected');
            const rejectedReqs = requests.filter(r => r.status === 'rejected');
            const rejectedPromos = promoCodes.filter((c: PromoCode) => c.status === 'rejected');
            const totalRejected = rejectedProds.length + rejectedUpdates.length + rejectedReqs.length + rejectedPromos.length;

            return [
              { label: 'Active Products', value: approvedProds.length, icon: 'fa-box', color: 'text-emerald-500', bg: 'bg-emerald-50' },
              { label: 'Pending Approval', value: totalPending, icon: 'fa-clock', color: 'text-amber-500', bg: 'bg-amber-50' },
              { label: 'Total Orders', value: realOrderCount, icon: 'fa-shopping-cart', color: 'text-brand-600', bg: 'bg-grad-soft', link: '/dashboard/orders' },
              { label: 'Total Reviews', value: reviews.length, icon: 'fa-star', color: 'text-purple-600', bg: 'bg-purple-50', link: '/dashboard/reviews' }
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                onClick={() => (stat as any).link && navigate((stat as any).link)}
                className={`bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all group ${(stat as any).link ? 'cursor-pointer' : ''}`}
              >
                <div className={`w-14 h-14 rounded-2xl ${stat.bg} ${stat.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                  <i className={`fas ${stat.icon} text-xl`}></i>
                </div>
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{stat.label}</p>
                <h3 className="text-3xl font-black text-gray-900 tracking-tight">{stat.value}</h3>
              </motion.div>
            ));
          })()}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white rounded-[3rem] border border-gray-100 shadow-sm p-10">
            <div className="flex items-center justify-between mb-10">
              <h3 className="text-2xl font-black text-gray-900 tracking-tight">Recent Activity</h3>
              <button onClick={() => navigate('/dashboard/inventory')} className="text-xs font-black text-brand-600 uppercase tracking-widest hover:underline">View All</button>
            </div>
            <div className="space-y-8">
              {(() => {
                const recentItems = vendorProducts.slice(0, 3);
                if (recentItems.length === 0) return (
                  <div className="text-center py-12">
                    <i className="fas fa-inbox text-4xl text-gray-200 mb-4 block"></i>
                    <p className="text-gray-400 font-bold">No activity yet</p>
                    <p className="text-gray-300 text-sm font-medium mt-1">Add your first product to get started</p>
                  </div>
                );
                return recentItems.map((p: Product) => (
                  <div key={p.id} className="flex items-center gap-6 p-4 rounded-2xl hover:bg-gray-50 transition-colors group">
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                      {p.mainImage ? <img src={p.mainImage} referrerPolicy="no-referrer" className="w-full h-full object-cover" alt={p.productName} /> : <div className="w-full h-full flex items-center justify-center text-gray-400"><i className="fas fa-box"></i></div>}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-gray-900">{p.productName}</p>
                      <p className="text-xs text-gray-400 font-medium">৳{p.price} • {p.units} units</p>
                      {p.status === 'rejected' && p.rejectReason && (
                        <p className="text-red-500 text-[10px] font-bold mt-1">Reason: {p.rejectReason}</p>
                      )}
                    </div>
                    <span className={`px-4 py-1.5 text-[10px] font-black uppercase rounded-full ${p.status === 'rejected' ? 'bg-red-50 text-red-500' :
                        p.status === 'approved' ? 'bg-emerald-50 text-emerald-600' :
                          'bg-amber-50 text-amber-600'
                      }`}>
                      {p.status === 'rejected' ? 'Rejected' : p.status === 'approved' ? 'Active' : 'Pending'}
                    </span>
                  </div>
                ));
              })()}
            </div>
          </div>
          <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm p-10">
            <h3 className="text-2xl font-black text-gray-900 tracking-tight mb-10">Quick Actions</h3>
            <div className="space-y-4">
              {(() => {
                // Unreplied Review Count
                const unrepliedReviewCount = reviews.filter(r => !r.vendorReply).length;
                const activePromoCount = promoCodes.filter((c: PromoCode) => (c.vendor_id === user?.id || c.assigned_vendor_id === user?.id) && c.is_active !== false && c.status !== 'pending').length;

                return [
                  { label: 'My Orders', icon: 'fa-shopping-bag', action: () => navigate('/dashboard/orders'), count: activeOrderCount },
                  { label: 'Update Inventory', icon: 'fa-boxes', action: () => navigate('/dashboard/inventory') },
                  { label: 'Promo Codes', icon: 'fa-ticket-alt', action: () => navigate('/dashboard/promo'), count: activePromoCount },
                  { label: 'Customer Reviews', icon: 'fa-star', action: () => navigate('/dashboard/reviews'), count: unrepliedReviewCount },
                  { label: 'Store Analytics', icon: 'fa-chart-pie', action: () => navigate('/dashboard/analytics') },
                  { label: 'Store Settings', icon: 'fa-cog', action: () => navigate('/settings/store') }
                ].map((action, i) => (
                  <button key={i} onClick={action.action} className="w-full flex items-center gap-4 p-5 rounded-2xl border border-gray-50 hover:border-brand-600 hover:bg-grad-soft transition-all group relative">
                    <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-white group-hover:text-brand-600 transition-all">
                      <i className={`fas ${action.icon}`}></i>
                    </div>
                    <span className="text-sm font-black text-gray-900">{action.label}</span>
                    {action.count !== undefined && action.count > 0 && (
                      <span className="absolute right-5 top-1/2 -translate-y-1/2 bg-red-500 text-white text-[10px] font-black px-2 py-1 rounded-full shadow-lg shadow-red-500/30">
                        {action.count}
                      </span>
                    )}
                  </button>
                ));
              })()}
            </div>
          </div>
        </div>

        <div id="my-products-section" className="bg-white rounded-[3rem] border border-gray-100 shadow-sm p-10 mt-12">
          <h3 className="text-2xl font-black text-gray-900 tracking-tight mb-8">My Products</h3>
          {myProducts.length > 0 ? (
            <div className="space-y-3">
              {myProducts.map((product: Product) => (
                <div key={product.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-all">
                  {(product.mainImage || product.image) && <img src={product.mainImage || product.image} referrerPolicy="no-referrer" alt={product.productName || product.name} className="w-14 h-14 rounded-xl object-cover shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-gray-900 text-sm truncate">{product.productName || product.name}</p>
                    <p className="text-brand-600 font-bold text-sm">৳{product.price}</p>
                    <p className="text-gray-400 text-xs font-medium">{product.units || product.stock || product.quantity || 0} units</p>
                    {(product.isSale || product.dealType && product.dealType !== 'none') && (
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${product.dealType === 'weekly' ? 'bg-indigo-50 text-indigo-600' :
                          product.dealType === 'monthly' ? 'bg-emerald-50 text-emerald-600' :
                            'bg-amber-50 text-amber-600'
                        }`}>
                        {product.dealType === 'weekly' ? '📅 Weekly Deal' :
                          product.dealType === 'monthly' ? '🗓️ Monthly Deal' :
                            '⚡ Flash/Daily'}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => navigate('/dashboard/inventory')} className="px-3 py-1.5 bg-brand-600 text-white rounded-xl font-black text-xs hover:opacity-90 transition-all">
                      <i className="fas fa-boxes mr-1"></i>Inventory
                    </button>
                    <button onClick={() => handleRemove(product)} className="px-3 py-1.5 bg-red-50 text-red-500 rounded-xl font-black text-xs hover:bg-red-100 transition-all">
                      <i className="fas fa-trash mr-1"></i>Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="text-gray-400 font-bold text-center py-10">No approved products yet</p>}
        </div>





        <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm p-10 mt-8">
          {(() => {
            const newProducts = pendingProducts;
            const activeUpdates = pendingUpdates.filter((u: ProductUpdate) => u.status === 'pending');
            const removeRequests = requests.filter(r => r.request_type === 'product_remove');
            const storeRequests = requests.filter(r => r.request_type === 'store_name');
            const categoryRequests = requests.filter(r => r.request_type === 'category_add');

            const rawItems = [
              ...newProducts.map((p: Product) => ({
                uid: `prod-${p.id}`,
                id: p.id, title: p.productName || p.name, subtitle: `৳${p.price} • ${p.units || p.stock || 0} units`,
                type: 'New Product', image: p.mainImage,
                status: p.status === 'rejected' ? 'REJECTED' : p.status === 'approved' ? 'APPROVED' : 'PENDING',
                color: p.status === 'rejected' ? 'red' : p.status === 'approved' ? 'green' : 'amber',
                reason: p.status, date: p.status
              })),
              ...pendingUpdates.map((u: ProductUpdate) => ({
                uid: `upd-${u.id}`,
                id: u.id, title: myProducts.find(p => p.id === u.productId)?.name || 'Unknown Product', subtitle: `Changes requested`,
                type: 'Product Update', image: null,
                status: u.status === 'approved' ? 'APPROVED' : u.status === 'rejected' ? 'REJECTED' : 'PENDING',
                color: u.status === 'approved' ? 'green' : u.status === 'rejected' ? 'red' : 'blue',
                reason: u.reason || null, date: u.date
              })),
              ...removeRequests.map(r => ({
                uid: `rem-${r.id}`,
                id: r.id, title: myProducts.find(p => p.id === r.current_value)?.name || r.current_value || 'Product', subtitle: `Reason: ${r.reason || 'Not specified'}`,
                type: 'Product Removal', image: null,
                status: r.status === 'approved' ? 'APPROVED' : r.status === 'rejected' ? 'REJECTED' : 'PENDING',
                color: r.status === 'approved' ? 'green' : r.status === 'rejected' ? 'red' : 'amber',
                reason: r.reason, date: r.created_at
              })),
              ...storeRequests.map(r => ({
                uid: `store-${r.id}`,
                id: r.id, title: r.requested_value || 'Store Name Change', subtitle: 'Store name change request',
                type: 'Store Name', image: null,
                status: r.status === 'approved' ? 'APPROVED' : r.status === 'rejected' ? 'REJECTED' : 'PENDING',
                color: r.status === 'approved' ? 'green' : r.status === 'rejected' ? 'red' : 'purple',
                reason: r.reason, date: r.created_at
              })),
              ...categoryRequests.map(r => ({
                uid: `cat-${r.id}`,
                id: r.id, title: r.requested_value || 'Category Request', subtitle: `Reason: ${r.reason || 'Not specified'}`,
                type: 'New Category', image: null,
                status: r.status === 'approved' ? 'APPROVED' : r.status === 'rejected' ? 'REJECTED' : 'PENDING',
                color: r.status === 'approved' ? 'green' : r.status === 'rejected' ? 'red' : 'purple',
                reason: r.reason, date: r.created_at
              })),
            ].sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());

            const allItems = rawItems.filter(item => item.status === 'PENDING' || !dismissedIds.includes(item.uid));
            const hasDismissable = allItems.some(i => i.status !== 'PENDING');

            const handleMarkAsRead = () => {
              const idsToDismiss = allItems.filter(i => i.status !== 'PENDING').map(i => i.uid);
              if (idsToDismiss.length === 0) return;
              const updated = [...new Set([...dismissedIds, ...idsToDismiss])];
              setDismissedIds(updated);
              localStorage.setItem('dismissedSubmissions', JSON.stringify(updated));
            };

            const colorMap: any = {
              red: 'bg-red-100 text-red-700',
              green: 'bg-green-100 text-green-700',
              amber: 'bg-amber-100 text-amber-700',
              blue: 'bg-blue-100 text-blue-700',
              purple: 'bg-purple-100 text-purple-700',
              indigo: 'bg-indigo-100 text-indigo-700',
            };

            const typeColorMap: any = {
              'New Product': 'text-amber-600',
              'Product Update': 'text-blue-600',
              'Product Removal': 'text-red-500',
              'Store Name': 'text-purple-600',
              'Category': 'text-indigo-600',
            };

            return (
              <>
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-2xl font-black text-gray-900 tracking-tight">Submission Status</h3>
                  {hasDismissable && (
                    <button
                      onClick={handleMarkAsRead}
                      className="px-4 py-2 rounded-full bg-gray-100 text-gray-600 font-bold text-xs hover:bg-gray-200 transition-colors"
                    >
                      <i className="fas fa-check-double mr-1.5"></i> Mark resolved as read
                    </button>
                  )}
                </div>

                {allItems.length === 0 ? (
                  <p className="text-gray-400 font-bold text-center py-10">No submissions yet</p>
                ) : (
                  <div className="space-y-3">
                    {allItems.map((item: Record<string, any>, i: number) => (
                  <div key={i} className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    {item.image && <img src={item.image} referrerPolicy="no-referrer" className="w-12 h-12 rounded-xl object-cover shrink-0" alt={item.title} />}
                    {!item.image && (
                      <div className="w-12 h-12 rounded-xl bg-gray-200 flex items-center justify-center shrink-0">
                        <i className={`fas fa-box text-gray-400 text-sm`}></i>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-gray-900 text-sm truncate">{item.title}</p>
                      <p className={`text-xs font-black uppercase tracking-widest ${typeColorMap[item.type]}`}>{item.type}</p>
                      <p className="text-gray-400 text-xs font-medium">{item.subtitle}</p>
                      {item.reason && <p className="text-red-500 text-xs font-bold mt-0.5">↳ {item.reason}</p>}
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full shrink-0 ${colorMap[item.color]}`}>
                      {item.status}
                    </span>
                  </div>
                ))}
                  </div>
                )}
              </>
            );
          })()}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] p-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-black text-gray-900">{editingProduct ? 'Edit Product' : 'Add New Product'}</h3>
              <button onClick={() => setShowModal(false)} className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-all">
                <i className="fas fa-times text-gray-600"></i>
              </button>
            </div>
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2 block">Product Name</label>
                <input type="text" value={form.productName} onChange={e => setForm({ ...form, productName: e.target.value })} className="w-full bg-gray-50 rounded-2xl px-6 py-4 outline-none font-bold border-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2 block">Category</label>
                  {vendorCategories.length === 1 ? (
                    <input type="text" value={form.category} readOnly className="w-full bg-gray-50 rounded-2xl px-6 py-4 outline-none font-bold border-none text-gray-500 cursor-not-allowed" />
                  ) : (
                    <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value, subCategory: '' })} className="w-full bg-gray-50 rounded-2xl px-6 py-4 outline-none font-bold border-none">
                      <option value="">Select Category</option>
                      {vendorCategories.map((c: string) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  )}
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2 block">Sub-category</label>
                  <select value={form.subCategory} onChange={e => setForm({ ...form, subCategory: e.target.value })} className="w-full bg-gray-50 rounded-2xl px-6 py-4 outline-none font-bold border-none" disabled={!form.category}>
                    <option value="">Select Sub-category</option>
                    {form.category && (() => {

                      const customMatch = customCategories.find((c: Category) => c.name.toLowerCase() === form.category?.toLowerCase());
                      const customSubs = (customMatch?.subcategories || []).map((s: { name: string }) => s.name);
                      const allSubs = [...new Set([...customSubs])];
                      if (allSubs.length === 0) allSubs.push('General');
                      return allSubs.map(sc => <option key={sc} value={sc}>{sc}</option>);
                    })()}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2 block">Price (৳)</label>
                  <input type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} className="w-full bg-gray-50 rounded-2xl px-6 py-4 outline-none font-bold border-none" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2 block">Original Price (৳)</label>
                  <input type="number" value={form.originalPrice} onChange={e => setForm({ ...form, originalPrice: e.target.value })} className="w-full bg-gray-50 rounded-2xl px-6 py-4 outline-none font-bold border-none" />
                  <p className="text-[10px] text-gray-400 font-medium mt-1">Set higher than sale price to show discount %</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2 block">Stock / Units</label>
                  <input type="number" value={form.units} onChange={e => setForm({ ...form, units: e.target.value })} className="w-full bg-gray-50 rounded-2xl px-6 py-4 outline-none font-bold border-none" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2 block">Stock Status</label>
                  <select value={form.stockStatus} onChange={e => setForm({ ...form, stockStatus: e.target.value as any })} className="w-full bg-gray-50 rounded-2xl px-6 py-4 outline-none font-bold border-none">
                    <option value="in_stock">In Stock</option>
                    <option value="out_of_stock">Out of Stock</option>
                    <option value="discontinued">Discontinued</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2 block">Short Description</label>
                <textarea value={form.shortDescription} onChange={e => setForm({ ...form, shortDescription: e.target.value })} rows={2} className="w-full bg-gray-50 rounded-2xl px-6 py-4 outline-none font-bold border-none resize-none" placeholder="Brief summary for product card" />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2 block">Detailed Description</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} className="w-full bg-gray-50 rounded-2xl px-6 py-4 outline-none font-bold border-none resize-none" />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2 block">Shipping & Return Policy</label>
                <textarea value={form.shippingReturnPolicy} onChange={e => setForm({ ...form, shippingReturnPolicy: e.target.value })} rows={2} className="w-full bg-gray-50 rounded-2xl px-6 py-4 outline-none font-bold border-none resize-none" placeholder="e.g. Standard shipping takes 3-5 days" />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2 block">Main Image</label>
                <div className="flex items-center gap-4">
                  {form.mainImage && (
                    <div className="relative">
                      {form.mainImage && <img src={form.mainImage} referrerPolicy="no-referrer" className="w-16 h-16 object-cover rounded-xl border border-gray-200" alt="Preview" />}
                      <button onClick={() => handleRemoveImage('mainImage')} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] hover:bg-red-600 shadow-sm">
                        <i className="fas fa-times"></i>
                      </button>
                    </div>
                  )}
                  <button onClick={() => { setCurrentImageField('mainImage'); fileInputRef.current?.click(); }} className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-200 transition-colors">
                    <i className="fas fa-upload mr-2"></i> Upload Image
                  </button>
                </div>
              </div>
              {['extraImage1', 'extraImage2', 'extraImage3'].map((field, i) => (
                <div key={field}>
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2 block">Extra Image {i + 1}</label>
                  <div className="flex items-center gap-4">
                    {(form as any)[field] && (
                      <div className="relative">
                        <img src={(form as any)[field] || 'https://via.placeholder.com/150'} referrerPolicy="no-referrer" className="w-16 h-16 object-cover rounded-xl border border-gray-200" alt="Preview" />
                        <button onClick={() => handleRemoveImage(field)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] hover:bg-red-600 shadow-sm">
                          <i className="fas fa-times"></i>
                        </button>
                      </div>
                    )}
                    <button onClick={() => { setCurrentImageField(field); fileInputRef.current?.click(); }} className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-200 transition-colors">
                      <i className="fas fa-upload mr-2"></i> Upload Image
                    </button>
                  </div>
                </div>
              ))}
              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-4 block">Color Variants</label>
                <div className="space-y-3">
                  {[1, 2, 3, 4].map(n => (
                    <div key={n} className="grid grid-cols-2 gap-4">
                      <input type="text" placeholder={`Color ${n} Name`} value={(form as any)[`color${n}name`]} onChange={e => setForm({ ...form, [`color${n}name`]: e.target.value })} className="w-full bg-gray-50 rounded-2xl px-4 py-3 outline-none font-bold border-none text-sm" />
                      <div className="flex gap-2">
                        <input type="text" placeholder={`Color ${n} Image URL`} value={(form as any)[`color${n}image`]} onChange={e => setForm({ ...form, [`color${n}image`]: e.target.value })} className="w-full bg-gray-50 rounded-2xl px-4 py-3 outline-none font-bold border-none text-sm" />
                        <button onClick={() => { setCurrentImageField(`color${n}image`); fileInputRef.current?.click(); }} className="bg-gray-100 text-gray-700 px-3 rounded-xl hover:bg-gray-200">
                          <i className="fas fa-upload"></i>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-3 block">Deal Section</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'none', label: 'No Deal', desc: 'Regular product' },
                    { value: 'flash', label: 'Flash / Daily', desc: 'Flash Sale & Daily Deals' },
                    { value: 'weekly', label: 'Weekly', desc: 'Weekly Mega Deals' },
                    { value: 'monthly', label: 'Monthly', desc: 'Monthly Super Sale' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setForm({ ...form, dealType: opt.value as any, isSale: opt.value !== 'none' })}
                      className={`p-4 rounded-2xl border-2 text-left transition-all ${form.dealType === opt.value
                          ? 'border-brand-600 bg-grad-soft'
                          : 'border-gray-100 bg-gray-50 hover:border-gray-300'
                        }`}
                    >
                      <p className="font-black text-gray-900 text-sm">{opt.label}</p>
                      <p className="text-[10px] text-gray-400 font-medium mt-0.5">{opt.desc}</p>
                    </button>
                  ))}
                </div>
                {form.dealType !== 'none' && (
                  <p className="text-xs text-brand-600 font-bold mt-3">
                    This product will appear in the selected deals section
                  </p>
                )}
              </div>
              <div className="flex gap-4 pt-4">
                <button onClick={() => setShowModal(false)} className="flex-1 py-4 bg-gray-100 text-gray-900 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-gray-200 transition-all">Cancel</button>
                <button onClick={handleSubmit} className="flex-1 py-4 bg-brand-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:opacity-90 transition-all">Submit</button>
              </div>
              {editingProduct && (
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2 block">Reason for Update</label>
                  <textarea
                    value={updateReason}
                    onChange={e => setUpdateReason(e.target.value)}
                    placeholder="e.g. Price correction, Wrong description, Updated stock..."
                    rows={2}
                    className="w-full bg-gray-50 rounded-2xl px-6 py-4 outline-none font-bold border-none resize-none"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Hidden File Input */}
      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        onChange={(e) => onSelectFile(e, currentImageField)}
        className="hidden"
      />

      {/* Crop Modal */}
      {cropModalOpen && upImg && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] p-8 w-full max-w-xl">
            <h3 className="text-2xl font-black text-gray-900 mb-6">Crop Image</h3>
            <div className="w-full overflow-auto" style={{ maxHeight: '60vh' }}>
              <ReactCrop
                crop={crop}
                onChange={c => setCrop(c)}
                style={{ width: '100%' }}
              >
                <img
                  ref={imgRef}
                  src={(upImg as string) || undefined}
                  referrerPolicy="no-referrer"
                  style={{ width: '100%', display: 'block' }}
                  alt="crop"
                />
              </ReactCrop>
            </div>
            <div className="flex gap-4">
              <button onClick={() => { setCropModalOpen(false); setUpImg(null); }} className="flex-1 py-4 bg-gray-100 text-gray-900 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-gray-200 transition-all">Cancel</button>
              <button onClick={getCroppedImg} className="flex-1 py-4 bg-brand-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:opacity-90 transition-all">Save Image</button>
            </div>
          </div>
        </div>
      )}



      {deleteModal && deleteTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] p-8 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center text-red-500 mb-6">
              <i className="fas fa-trash text-xl"></i>
            </div>
            <h3 className="text-xl font-black text-gray-900 mb-2">Remove Product</h3>
            <p className="text-gray-400 font-medium mb-6">You are about to remove <span className="text-gray-900 font-black">"{deleteTarget.productName || deleteTarget.name}"</span>. Please provide a reason.</p>
            <div className="mb-6">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2 block">Reason for Removal</label>
              <select value={deleteReason} onChange={e => setDeleteReason(e.target.value)} className="w-full bg-gray-50 rounded-2xl px-6 py-4 outline-none font-bold border-none mb-3">
                <option value="">Select a reason</option>
                <option value="Out of stock permanently">Out of stock permanently</option>
                <option value="Pricing issue">Pricing issue</option>
                <option value="Wrong category">Wrong category</option>
                <option value="Discontinuing product">Discontinuing product</option>
                <option value="Other">Other</option>
              </select>
              {deleteReason === 'Other' && (
                <textarea value={customDeleteReason} onChange={e => setCustomDeleteReason(e.target.value)} placeholder="Describe your reason..." rows={2} className="w-full bg-gray-50 rounded-2xl px-6 py-4 outline-none font-bold border-none resize-none" />
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteModal(false)} className="flex-1 py-4 bg-gray-100 text-gray-900 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-gray-200 transition-all">Cancel</button>
              <button onClick={confirmDelete} className="flex-1 py-4 bg-red-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-red-600 transition-all">Remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardView;
