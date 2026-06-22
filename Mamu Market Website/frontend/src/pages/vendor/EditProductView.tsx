import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import PageTitle from '../../components/PageTitle';
import { useApp } from '../../context/AppContext';
import { uploadImage, uploadImages } from '../../utils/imageUpload';
import { useSharedCategories, useSharedProducts } from '../../context/DataContext';
import { useVendorRequests } from '../../hooks/useVendorRequests';
import ImageCropperModal from '../../components/ui/ImageCropperModal';
import { Category, Product } from '../../types';
import { supabase } from '../../lib/supabase';

const STEPS = [
  { id: 'basic-info', label: 'Basic Info', icon: 'fa-info-circle' },
  { id: 'policies', label: 'Policies', icon: 'fa-shield-alt' },
  { id: 'pricing', label: 'Pricing & Stock', icon: 'fa-tag' },
  { id: 'images', label: 'Images', icon: 'fa-image' },
  { id: 'colors', label: 'Colors', icon: 'fa-palette' },
  { id: 'deal', label: 'Deal Section', icon: 'fa-bolt' },
];

const EditProductView: React.FC = () => {
  const { user } = useAuth();
  const { setToast } = useApp();
  const navigate = useNavigate();
  const { step, productId } = useParams<{ step?: string, productId: string }>();
  const { categories: customCategories } = useSharedCategories();
  const { requests } = useVendorRequests();
  const { products } = useSharedProducts();

  const currentStepId = step || 'basic-info';
  const currentStepIndex = STEPS.findIndex(s => s.id === currentStepId) !== -1 ? STEPS.findIndex(s => s.id === currentStepId) : 0;

  const storeCategory = user?.storeCategory || '';
  const approvedCategoryRequests = requests
    .filter(r => r.request_type === 'category_add' && r.status === 'approved')
    .map(r => r.requested_value)
    .filter(Boolean) as string[];

  const vendorCategories: string[] = useMemo(() => {
    const isEffectivelyRemoved = (catName: string) => {
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

    return (storeCategory
      ? [...new Set([...storeCategory.split(',').map((c: string) => c.trim()), ...approvedCategoryRequests])].filter(Boolean)
      : approvedCategoryRequests.length > 0 ? approvedCategoryRequests : ['General']
    ).filter(cat => !isEffectivelyRemoved(cat));
  }, [storeCategory, approvedCategoryRequests, requests]);

  const [isLoading, setIsLoading] = useState(true);
  const [initialFormState, setInitialFormState] = useState<any>({});
  
  const [form, setForm] = useState({
    productName: '',
    category: '',
    subCategory: '',
    price: '',
    originalPrice: '',
    units: '',
    stockStatus: 'in_stock',
    description: '',
    shortDescription: '',
    warranty: '',
    guarantee: '',
    returnPolicy: '',
    shippingTime: '',
    mainImage: '',
    extraImage1: '',
    extraImage2: '',
    extraImage3: '',
    color1name: '', color1image: '', color1hex: '#000000',
    color2name: '', color2image: '', color2hex: '#000000',
    color3name: '', color3image: '', color3hex: '#000000',
    color4name: '', color4image: '', color4hex: '#000000',
    dealType: 'none' as 'none' | 'flash' | 'weekly' | 'monthly',
  });

  useEffect(() => {
    if (!productId || products.length === 0) return;
    const p = products.find(prod => prod.id.toString() === productId);
    if (!p) {
      setToast('Product not found');
      navigate('/dashboard/inventory');
      return;
    }

    const parsePolicy = (policy: string | null) => {
      if (!policy) return { warranty: '', guarantee: '', returnPolicy: '', shippingTime: '' };
      const lines = policy.split('\n');
      const getVal = (prefix: string) => {
        const line = lines.find(l => l.startsWith(prefix));
        if (!line) return '';
        const val = line.replace(prefix, '').trim();
        return val === 'No Warranty' || val === 'No Guarantee' || val === 'No Returns' || val === 'Standard Delivery' ? '' : val;
      };
      return {
        warranty: getVal('Product Warranty: '),
        guarantee: getVal('Product Guarantee: '),
        returnPolicy: getVal('Return Policy: '),
        shippingTime: getVal('Estimated Delivery: '),
      };
    };

    const policies = parsePolicy(p.shippingReturnPolicy || (p as any).shipping_return_policy);
    
    const initialState = {
      productName: p.name || '',
      category: p.category || vendorCategories[0] || '',
      subCategory: p.subcategory || '',
      price: p.price?.toString() || '',
      originalPrice: p.originalPrice?.toString() || '',
      units: p.units?.toString() || '',
      stockStatus: p.stockStatus || 'in_stock',
      description: p.description || '',
      shortDescription: p.shortDescription || (p as any).short_description || '',
      warranty: policies.warranty,
      guarantee: policies.guarantee,
      returnPolicy: policies.returnPolicy,
      shippingTime: policies.shippingTime,
      mainImage: p.image || '',
      extraImage1: p.images?.[0] || '',
      extraImage2: p.images?.[1] || '',
      extraImage3: p.images?.[2] || '',
      color1name: p.colors?.[0]?.name || '', color1image: p.colors?.[0]?.image || '', color1hex: p.colors?.[0]?.value || '#000000',
      color2name: p.colors?.[1]?.name || '', color2image: p.colors?.[1]?.image || '', color2hex: p.colors?.[1]?.value || '#000000',
      color3name: p.colors?.[2]?.name || '', color3image: p.colors?.[2]?.image || '', color3hex: p.colors?.[2]?.value || '#000000',
      color4name: p.colors?.[3]?.name || '', color4image: p.colors?.[3]?.image || '', color4hex: p.colors?.[3]?.value || '#000000',
      dealType: (p.dealType as 'none' | 'flash' | 'weekly' | 'monthly') || 'none',
    };

    setForm(initialState);
    setInitialFormState(initialState);
    setIsLoading(false);
  }, [productId, products]);

  const latestFormRef = useRef<any>({});
  useEffect(() => { latestFormRef.current = form; }, [form]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentField, setCurrentField] = useState('');
  
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [upImg, setUpImg] = useState<string | ArrayBuffer | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const compressableFields = ['mainImage', 'extraImage1', 'extraImage2', 'extraImage3', 'color1image', 'color2image', 'color3image', 'color4image'];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      if (compressableFields.includes(currentField)) {
        setUpImg(ev.target?.result as string);
        setCropModalOpen(true);
      } else {
        setForm(prev => ({ ...prev, [currentField]: ev.target?.result as string }));
      }
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const uploadBtn = (field: string, label: string) => (
    <div>
      <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2">{label}</p>
      <div
        onClick={() => { setCurrentField(field); fileInputRef.current?.click(); }}
        className="w-full h-28 rounded-2xl border-2 border-dashed border-gray-200 hover:border-brand-400 cursor-pointer overflow-hidden flex items-center justify-center bg-gray-50 hover:bg-brand-50 transition-all relative group"
      >
        {(form as any)[field] ? (
          <>
            <img src={(form as any)[field] || 'https://via.placeholder.com/150'} referrerPolicy="no-referrer" className="w-full h-full object-cover" alt={label} />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
              <p className="text-white text-xs font-black">Change</p>
            </div>
          </>
        ) : (
          <div className="text-center">
            <i className="fas fa-image text-2xl text-gray-300 mb-1 block"></i>
            <p className="text-[10px] font-black text-gray-400 uppercase">Upload</p>
          </div>
        )}
      </div>
    </div>
  );

  const validateStep = (index: number) => {
    if (index === 0) {
      if (!form.productName) return 'Product Name is required';
      if (!form.category) return 'Category is required';
    } else if (index === 2) {
      const priceNum = Number(form.price);
      const unitsNum = Number(form.units);
      if (isNaN(priceNum) || priceNum <= 0) return 'Price must be greater than 0';
      if (isNaN(unitsNum) || unitsNum < 0 || !Number.isInteger(unitsNum)) return 'Units must be a valid whole number';
    } else if (index === 3) {
      if (!form.mainImage) return 'Main Image is required';
    }
    return null;
  };

  const handleNext = () => {
    const error = validateStep(currentStepIndex);
    if (error) {
      setToast(error, 'error');
      return;
    }
    if (currentStepIndex < STEPS.length - 1) {
      navigate(`/dashboard/edit-product/${productId}/${STEPS[currentStepIndex + 1].id}`);
      window.scrollTo(0,0);
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      navigate(`/dashboard/edit-product/${productId}/${STEPS[currentStepIndex - 1].id}`);
      window.scrollTo(0,0);
    }
  };

  const handleSubmit = async () => {
    // Final check
    for (let i = 0; i < STEPS.length; i++) {
      const error = validateStep(i);
      if (error) {
        setToast(`Error in ${STEPS[i].label}: ${error}`, 'error');
        navigate(`/dashboard/edit-product/${productId}/${STEPS[i].id}`);
        return;
      }
    }

    const latestForm = { ...form, ...latestFormRef.current };
    const colors = [];
    for (let n = 1; n <= 4; n++) {
      const name = (latestForm as any)[`color${n}name`];
      const image = (latestForm as any)[`color${n}image`];
      const value = (latestForm as any)[`color${n}hex`] || '#000000';
      if (name) colors.push({ name, image, value });
    }

    setIsUploading(true);
    try {
      setToast('Uploading images...');
      const mainImageUrl = await uploadImage(latestForm.mainImage, 'product-images');
      const extraImageUrls = await uploadImages(
        [latestForm.extraImage1, latestForm.extraImage2, latestForm.extraImage3],
        'product-images'
      );
      for (const c of colors) {
        if (c.image && c.image.startsWith('data:')) {
          c.image = await uploadImage(c.image, 'product-images');
        }
      }

      setToast('Saving product changes...');

      const changes = {
        name: latestForm.productName,
        price: Number(latestForm.price),
        original_price: Number(latestForm.originalPrice) || Number(latestForm.price),
        units: Number(latestForm.units),
        stock: Number(latestForm.units),
        stock_status: latestForm.stockStatus,
        deal_type: latestForm.dealType,
        description: latestForm.description,
        short_description: latestForm.shortDescription,
        shipping_return_policy: `Product Warranty: ${latestForm.warranty || 'No Warranty'}\nProduct Guarantee: ${latestForm.guarantee || 'No Guarantee'}\nReturn Policy: ${latestForm.returnPolicy || 'No Returns'}\nEstimated Delivery: ${latestForm.shippingTime || 'Standard Delivery'}`,
        image: mainImageUrl || 'https://via.placeholder.com/400',
        main_image: mainImageUrl || 'https://via.placeholder.com/400',
        images: extraImageUrls.filter(Boolean),
        extra_image_1: extraImageUrls[0] || null,
        extra_image_2: extraImageUrls[1] || null,
        extra_image_3: extraImageUrls[2] || null,
        colors: colors,
      };

      // 1. Instant update to products table
      const instantChangesDb = {
        units: Number(latestForm.units),
        stock: Number(latestForm.units),
        stock_status: latestForm.stockStatus,
        deal_type: latestForm.dealType,
      };

      const { error: instantError } = await supabase
        .from('products')
        .update(instantChangesDb)
        .eq('id', productId);
      
      if (instantError) throw instantError;

      // 2. Check if there are approval changes
      let hasApprovalChanges = false;
      const approvalFields = Object.keys(latestForm).filter(k => !['units', 'stockStatus', 'dealType'].includes(k));
      for (const key of approvalFields) {
        if (latestForm[key] !== initialFormState[key]) {
          hasApprovalChanges = true;
          break;
        }
      }

      if (hasApprovalChanges) {
        const { data: existingPending } = await supabase
          .from('product_updates')
          .select('id')
          .eq('product_id', productId)
          .eq('status', 'pending')
          .maybeSingle();

        if (existingPending) {
          const { error: updateApprovalErr } = await supabase
            .from('product_updates')
            .update({ changes })
            .eq('id', existingPending.id);
          if (updateApprovalErr) throw updateApprovalErr;
        } else {
          const { error: insertApprovalErr } = await supabase
            .from('product_updates')
            .insert({
              product_id: productId,
              vendor_id: user?.id,
              changes: changes,
              status: 'pending'
            });
          if (insertApprovalErr) throw insertApprovalErr;
        }
        setToast('Instant changes saved. Other updates submitted for admin approval!');
      } else {
        setToast('Changes saved successfully!');
      }

      navigate('/dashboard/inventory');
      
    } catch(err: unknown) {
      console.error(err);
      setToast((err as Error).message || 'Error updating product', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const inputClass = "w-full bg-white border-2 border-gray-100 rounded-2xl px-5 py-3.5 font-bold outline-none focus:border-brand-400 transition-all text-gray-900";
  const labelClass = "text-xs font-black text-gray-400 uppercase tracking-widest mb-2 block";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <i className="fas fa-spinner fa-spin text-3xl text-brand-500"></i>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <PageTitle title="Edit Product" />
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/dashboard/inventory')} className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-all">
              <i className="fas fa-arrow-left text-gray-600 text-sm"></i>
            </button>
            <div>
              <h1 className="text-xl font-black text-gray-900">Edit Product</h1>
              <p className="text-xs text-gray-400 font-medium">Step {currentStepIndex + 1} of {STEPS.length}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button disabled={isUploading} onClick={() => navigate('/dashboard/inventory')} className="px-6 py-2.5 rounded-xl bg-gray-100 text-gray-600 font-black text-sm hover:bg-gray-200 transition-all disabled:opacity-50">
              Cancel
            </button>
            {currentStepIndex === STEPS.length - 1 && (
              <button disabled={isUploading} onClick={handleSubmit} className="px-6 py-2.5 rounded-xl gradient-primary text-white font-black text-sm shadow-lg shadow-brand-500/20 hover:opacity-90 disabled:opacity-50 transition-all flex items-center gap-2">
                {isUploading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-save"></i>} Save Changes
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white border-b border-gray-100 sticky top-[73px] z-10 py-3 overflow-x-auto hide-scrollbar">
        <div className="container mx-auto px-4 max-w-3xl flex items-center justify-between min-w-[600px]">
          {STEPS.map((s, idx) => (
            <div key={s.id} className="flex items-center flex-1 last:flex-none">
              <button 
                onClick={() => {
                  if (idx < currentStepIndex) navigate(`/dashboard/edit-product/${productId}/${s.id}`);
                  else if (idx === currentStepIndex + 1) {
                    const error = validateStep(currentStepIndex);
                    if (error) setToast(`You must complete "${STEPS[currentStepIndex].label}" first: ${error}`, 'error');
                    else navigate(`/dashboard/edit-product/${productId}/${s.id}`);
                  }
                }}
                className={`flex flex-col items-center gap-1 w-16 ${idx <= currentStepIndex ? 'text-brand-600' : 'text-gray-300'}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${idx === currentStepIndex ? 'bg-brand-600 text-white shadow-md shadow-brand-500/30' : idx < currentStepIndex ? 'bg-brand-100 text-brand-600' : 'bg-gray-100 text-gray-400'}`}>
                  {idx < currentStepIndex ? <i className="fas fa-check"></i> : <i className={`fas ${s.icon}`}></i>}
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider text-center">{s.label}</span>
              </button>
              {idx < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 rounded-full ${idx < currentStepIndex ? 'bg-brand-200' : 'bg-gray-100'}`}></div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-2xl flex-1">
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 min-h-[400px] flex flex-col">
          
          <div className="flex-1">
            {currentStepIndex === 0 && (
              <div className="space-y-4 animate-fade-in">
                <h2 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
                  <i className="fas fa-info-circle text-brand-500"></i> Basic Information
                </h2>
                <div>
                  <label className={labelClass}>Product Name *</label>
                  <input type="text" value={form.productName} onChange={e => setForm({ ...form, productName: e.target.value })} className={inputClass} placeholder="e.g. Sony WH-1000XM5 Headphones" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Category *</label>
                    {vendorCategories.length === 1 ? (
                      <input type="text" value={form.category} readOnly className={inputClass + ' bg-gray-50 cursor-not-allowed'} />
                    ) : (
                      <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value, subCategory: '' })} className={inputClass}>
                        {vendorCategories.map((c: string) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    )}
                  </div>
                  <div>
                    <label className={labelClass}>Sub-category</label>
                    <select value={form.subCategory} onChange={e => setForm({ ...form, subCategory: e.target.value })} className={inputClass} disabled={!form.category}>
                      <option value="">Select Sub-category</option>
                      {form.category && (() => {
                        const customMatch = customCategories.find((c: Category) => c.name.toLowerCase() === form.category.toLowerCase());
                        const customSubs = (customMatch?.subcategories || []).map((s: {name: string}) => s.name);
                        const allSubs = [...new Set([...customSubs])];
                        if (allSubs.length === 0) allSubs.push('General');
                        return allSubs.map(sc => <option key={sc} value={sc}>{sc}</option>);
                      })()}
                    </select>
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Short Description</label>
                  <textarea value={form.shortDescription} onChange={e => setForm({ ...form, shortDescription: e.target.value })} rows={2} className={inputClass + ' resize-none'} placeholder="A brief summary of the product (shown under the buy button)..." />
                </div>
                <div>
                  <label className={labelClass}>Detailed Description</label>
                  <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={4} className={inputClass + ' resize-none'} placeholder="Full details, features, and specifications..." />
                </div>
              </div>
            )}

            {currentStepIndex === 1 && (
              <div className="space-y-6 animate-fade-in">
                <h2 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
                  <i className="fas fa-shield-alt text-brand-500"></i> Policies & Shipping
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className={labelClass}>Warranty <span className="text-[10px] normal-case text-gray-400 font-bold ml-1">(Optional)</span></label>
                    <div className="flex shadow-sm rounded-xl overflow-hidden border-2 border-gray-100 focus-within:border-brand-400 transition-all">
                      <span className="inline-flex items-center px-4 bg-gray-50 text-gray-500 text-xs font-black border-r border-gray-100">Warranty:</span>
                      <input type="text" value={form.warranty} onChange={e => setForm({ ...form, warranty: e.target.value })} className="w-full bg-white px-4 py-3 font-bold outline-none text-sm" placeholder="e.g. 1 Year" />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Guarantee <span className="text-[10px] normal-case text-gray-400 font-bold ml-1">(Optional)</span></label>
                    <div className="flex shadow-sm rounded-xl overflow-hidden border-2 border-gray-100 focus-within:border-brand-400 transition-all">
                      <span className="inline-flex items-center px-4 bg-gray-50 text-gray-500 text-xs font-black border-r border-gray-100">Guarantee:</span>
                      <input type="text" value={form.guarantee} onChange={e => setForm({ ...form, guarantee: e.target.value })} className="w-full bg-white px-4 py-3 font-bold outline-none text-sm" placeholder="e.g. 100% Authentic" />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Return Policy <span className="text-[10px] normal-case text-gray-400 font-bold ml-1">(Optional)</span></label>
                    <div className="flex shadow-sm rounded-xl overflow-hidden border-2 border-gray-100 focus-within:border-brand-400 transition-all">
                      <span className="inline-flex items-center px-4 bg-gray-50 text-gray-500 text-xs font-black border-r border-gray-100">Returns:</span>
                      <input type="text" value={form.returnPolicy} onChange={e => setForm({ ...form, returnPolicy: e.target.value })} className="w-full bg-white px-4 py-3 font-bold outline-none text-sm" placeholder="e.g. 7 Days Free" />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Delivery Time <span className="text-[10px] normal-case text-gray-400 font-bold ml-1">(Optional)</span></label>
                    <div className="flex shadow-sm rounded-xl overflow-hidden border-2 border-gray-100 focus-within:border-brand-400 transition-all">
                      <span className="inline-flex items-center px-4 bg-gray-50 text-gray-500 text-xs font-black border-r border-gray-100">Delivery:</span>
                      <input type="text" value={form.shippingTime} onChange={e => setForm({ ...form, shippingTime: e.target.value })} className="w-full bg-white px-4 py-3 font-bold outline-none text-sm" placeholder="e.g. 3-5 Days" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentStepIndex === 2 && (
              <div className="space-y-4 animate-fade-in">
                <h2 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
                  <i className="fas fa-tag text-brand-500"></i> Pricing & Stock
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className={labelClass}>Sale Price (৳) *</label>
                    <input type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} className={inputClass} placeholder="0" />
                  </div>
                  <div>
                    <label className={labelClass}>Original Price (৳)</label>
                    <input type="number" value={form.originalPrice} onChange={e => setForm({ ...form, originalPrice: e.target.value })} className={inputClass} placeholder="0" />
                    <p className="text-[10px] text-gray-400 font-medium mt-1">Set higher to show % off</p>
                  </div>
                  <div>
                    <label className={labelClass}>Stock / Units *</label>
                    <input type="number" value={form.units} onChange={e => setForm({ ...form, units: e.target.value })} className={inputClass} placeholder="0" />
                  </div>
                </div>
              </div>
            )}

            {currentStepIndex === 3 && (
              <div className="space-y-4 animate-fade-in">
                <h2 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
                  <i className="fas fa-image text-brand-500"></i> Images
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {uploadBtn('mainImage', 'Main *')}
                  {uploadBtn('extraImage1', 'Extra 1')}
                  {uploadBtn('extraImage2', 'Extra 2')}
                  {uploadBtn('extraImage3', 'Extra 3')}
                </div>
              </div>
            )}

            {currentStepIndex === 4 && (
              <div className="space-y-4 animate-fade-in">
                <h2 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
                  <i className="fas fa-palette text-brand-500"></i> Color Variants <span className="text-xs font-bold text-gray-400 normal-case ml-1">(optional)</span>
                </h2>
                <div className="space-y-3">
                  {[1,2,3,4].map(n => (
                    <div key={n} className="grid grid-cols-1 gap-2 p-4 bg-gray-50 rounded-2xl">
                      <div className="flex gap-3 items-center">
                        <div className="relative">
                          <input
                            type="color"
                            value={(form as any)[`color${n}hex`] || '#000000'}
                            onChange={e => setForm({ ...form, [`color${n}hex`]: e.target.value })}
                            className="w-12 h-12 rounded-xl border-2 border-gray-200 cursor-pointer p-0.5 bg-white"
                            title="Pick color"
                          />
                        </div>
                        <input
                          type="text"
                          placeholder={`Color ${n} Name (e.g. Sky Blue)`}
                          value={(form as any)[`color${n}name`]}
                          onChange={e => setForm({ ...form, [`color${n}name`]: e.target.value })}
                          className={inputClass + ' text-sm flex-1'}
                        />
                        <input
                          type="text"
                          value={(form as any)[`color${n}hex`] || '#000000'}
                          onChange={e => setForm({ ...form, [`color${n}hex`]: e.target.value })}
                          className="w-24 bg-white rounded-2xl px-3 py-3 outline-none font-mono text-sm border border-gray-200 text-center"
                          placeholder="#000000"
                        />
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Color image URL or upload →"
                          value={(form as any)[`color${n}image`]}
                          onChange={e => setForm({ ...form, [`color${n}image`]: e.target.value })}
                          className={inputClass + ' text-sm flex-1'}
                        />
                        <button onClick={() => { setCurrentField(`color${n}image`); fileInputRef.current?.click(); }} className="px-3 bg-white border border-gray-200 rounded-2xl hover:bg-gray-100 transition-all text-gray-600">
                          <i className="fas fa-upload text-sm"></i>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {currentStepIndex === 5 && (
              <div className="space-y-4 animate-fade-in">
                <h2 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
                  <i className="fas fa-bolt text-brand-500"></i> Deal Section
                </h2>
                <div className="grid grid-cols-2 gap-3 mb-6">
                  {[
                    { value: 'none', label: 'No Deal', desc: 'Regular product' },
                    { value: 'flash', label: 'Flash / Daily', desc: 'Flash Sale & Daily Deals' },
                    { value: 'weekly', label: 'Weekly', desc: 'Weekly Mega Deals' },
                    { value: 'monthly', label: 'Monthly', desc: 'Monthly Super Sale' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setForm({ ...form, dealType: opt.value as any })}
                      className={`p-4 rounded-2xl border-2 text-left transition-all ${form.dealType === opt.value ? 'border-brand-500 bg-brand-50' : 'border-gray-100 bg-gray-50 hover:border-gray-200'}`}
                    >
                      <p className="font-black text-gray-900 text-sm">{opt.label}</p>
                      <p className="text-[10px] text-gray-400 font-medium mt-0.5">{opt.desc}</p>
                    </button>
                  ))}
                </div>
                
                <div className="bg-amber-50 rounded-2xl border border-amber-100 p-6 flex items-start gap-4">
                  <i className="fas fa-clock text-amber-500 mt-0.5"></i>
                  <div>
                    <p className="font-black text-amber-800 text-sm">Pending Admin Review</p>
                    <p className="text-amber-700 text-xs font-medium mt-0.5">Some updates (like name or images) require admin approval and will go to 'Pending' status. Stock and pricing update instantly.</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Navigation Buttons */}
          <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-between">
            <button 
              onClick={handlePrev} 
              disabled={currentStepIndex === 0 || isUploading} 
              className={`px-6 py-3 rounded-xl font-black text-sm transition-all flex items-center gap-2 ${currentStepIndex === 0 ? 'opacity-0 pointer-events-none' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              <i className="fas fa-arrow-left"></i> Previous
            </button>
            
            {currentStepIndex < STEPS.length - 1 ? (
              <button 
                onClick={handleNext} 
                className="px-8 py-3 rounded-xl gradient-primary text-white font-black text-sm shadow-lg shadow-brand-500/20 hover:opacity-90 transition-all flex items-center gap-2"
              >
                Next Step <i className="fas fa-arrow-right"></i>
              </button>
            ) : (
              <button 
                onClick={handleSubmit} 
                disabled={isUploading} 
                className="px-8 py-3 rounded-xl gradient-primary text-white font-black text-sm shadow-lg shadow-brand-500/20 hover:opacity-90 disabled:opacity-50 transition-all flex items-center gap-2"
              >
                {isUploading ? <><i className="fas fa-spinner fa-spin"></i> Saving...</> : <><i className="fas fa-save"></i> Save Changes</>}
              </button>
            )}
          </div>

        </div>
      </div>

      <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
      
      <ImageCropperModal
        isOpen={cropModalOpen}
        imageSrc={upImg}
        title="Crop Product Image"
        onCancel={() => { setCropModalOpen(false); setUpImg(null); }}
        onCropComplete={(blobUrl) => {
          setForm(prev => ({ ...prev, [currentField]: blobUrl }));
          latestFormRef.current = { ...latestFormRef.current, [currentField]: blobUrl };
          setCropModalOpen(false);
          setUpImg(null);
        }}
      />
    </div>
  );
};

export default EditProductView;
