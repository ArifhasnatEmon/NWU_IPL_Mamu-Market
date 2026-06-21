import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import PageTitle from '../../components/PageTitle';
import { useApp } from '../../context/AppContext';
import { uploadImage, uploadImages } from '../../utils/imageUpload';
import { useSharedCategories } from '../../context/DataContext';
import { useVendorRequests } from '../../hooks/useVendorRequests';
import ImageCropperModal from '../../components/ui/ImageCropperModal';
import { Category } from '../../types';
import { supabase } from '../../lib/supabase';



const AddProductView: React.FC = () => {
  const { user } = useAuth();
  const { setToast } = useApp();
  const navigate = useNavigate();
  const { categories: customCategories } = useSharedCategories();
  const { requests } = useVendorRequests();

  const storeCategory = user?.storeCategory || '';
  const approvedCategoryRequests = requests
    .filter(r => r.request_type === 'category_add' && r.status === 'approved')
    .map(r => r.requested_value)
    .filter(Boolean) as string[];
  const vendorCategories: string[] = React.useMemo(() => {
    // Only exclude a category if its most recent approved removal is NEWER than its most recent approved add
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

  const [form, setForm] = useState({
    productName: '',
    category: vendorCategories[0] || '',
    subCategory: '',
    price: '',
    originalPrice: '',
    units: '',
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
  const latestFormRef = React.useRef<any>({});
  // State Sync
  React.useEffect(() => { latestFormRef.current = form; }, [form]);

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

  const handleSubmit = async () => {
    if (!form.productName || !form.price || !form.units || !form.mainImage) {
      setToast('Please fill: Name, Price, Units, Main Image');
      return;
    }
    const priceNum = Number(form.price);
    const unitsNum = Number(form.units);
    if (isNaN(priceNum) || priceNum <= 0) {
      setToast('Price must be a valid number greater than 0');
      return;
    }
    if (isNaN(unitsNum) || unitsNum < 0 || !Number.isInteger(unitsNum)) {
      setToast('Units must be a valid whole number (0 or more)');
      return;
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
      // Image Upload
      const mainImageUrl = await uploadImage(latestForm.mainImage, 'product-images');
      const extraImageUrls = await uploadImages(
        [latestForm.extraImage1, latestForm.extraImage2, latestForm.extraImage3],
        'product-images'
      );
      // Upload color variant images
      for (const c of colors) {
        if (c.image && c.image.startsWith('data:')) {
          c.image = await uploadImage(c.image, 'product-images');
        }
      }

      setToast('Saving product data...');

      // Build payload for Supabase insertion
      const newProduct = {
        vendor_id: user?.id,
        vendor: user?.name || user?.storeName || user?.email?.split('@')[0] || 'Vendor',
        name: latestForm.productName,
        category: latestForm.category,
        subcategory: latestForm.subCategory,
        price: priceNum,
        original_price: Number(latestForm.originalPrice) || priceNum,
        image: mainImageUrl || 'https://via.placeholder.com/400',
        images: extraImageUrls.filter(Boolean),
        units: unitsNum,
        stock: unitsNum,
        description: latestForm.description,
        short_description: latestForm.shortDescription,
        shipping_return_policy: `Product Warranty: ${latestForm.warranty || 'No Warranty'}\nProduct Guarantee: ${latestForm.guarantee || 'No Guarantee'}\nReturn Policy: ${latestForm.returnPolicy || 'No Returns'}\nEstimated Delivery: ${latestForm.shippingTime || 'Standard Delivery'}`,
        colors: colors,
        deal_type: latestForm.dealType,
        status: 'pending',
        created_at: new Date().toISOString()
      };

      const { error: dbErr } = await supabase.from('products').insert([newProduct]);
      
      if (dbErr) throw dbErr;

      setToast('Product submitted successfully for admin approval!');
      navigate('/dashboard');
      
    } catch(err: unknown) {
      console.error(err);
      setToast((err as Error).message || 'Error submitting product');
    } finally {
      setIsUploading(false);
    }
  };

  const inputClass = "w-full bg-white border-2 border-gray-100 rounded-2xl px-5 py-3.5 font-bold outline-none focus:border-brand-400 transition-all text-gray-900";
  const labelClass = "text-xs font-black text-gray-400 uppercase tracking-widest mb-2 block";
  return (
    <div className="min-h-screen bg-gray-50">
      <PageTitle title="Add Product" />
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/dashboard')} className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-all">
              <i className="fas fa-arrow-left text-gray-600 text-sm"></i>
            </button>
            <div>
              <h1 className="text-xl font-black text-gray-900">Add New Product</h1>
              <p className="text-xs text-gray-400 font-medium">All changes go to admin for approval</p>
            </div>
          </div>
          <button disabled={isUploading} onClick={handleSubmit} className="px-8 py-3 rounded-2xl gradient-primary text-white font-black text-sm shadow-lg shadow-brand-500/20 hover:opacity-90 disabled:opacity-50 transition-all flex items-center gap-2">
            {isUploading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-paper-plane"></i>} Submit for Approval
          </button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="space-y-6">

          {/* Basic Info */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
            <h2 className="text-base font-black text-gray-900 mb-6 flex items-center gap-2">
              <span className="w-7 h-7 rounded-xl gradient-primary flex items-center justify-center text-white text-xs font-black">1</span>
              Basic Info
            </h2>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Product Name *</label>
                <input type="text" value={form.productName} onChange={e => setForm({ ...form, productName: e.target.value })} className={inputClass} placeholder="e.g. Sony WH-1000XM5 Headphones" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Category</label>
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
          </div>

          {/* Shipping & Returns */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
            <h2 className="text-base font-black text-gray-900 mb-6 flex items-center gap-2">
              <span className="w-7 h-7 rounded-xl gradient-primary flex items-center justify-center text-white text-xs font-black">2</span>
              Policies & Shipping
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

          {/* Pricing & Stock */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
            <h2 className="text-base font-black text-gray-900 mb-6 flex items-center gap-2">
              <span className="w-7 h-7 rounded-xl gradient-primary flex items-center justify-center text-white text-xs font-black">3</span>
              Pricing & Stock
            </h2>
            <div className="grid grid-cols-3 gap-4">
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

          {/* Images */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
            <h2 className="text-base font-black text-gray-900 mb-6 flex items-center gap-2">
              <span className="w-7 h-7 rounded-xl gradient-primary flex items-center justify-center text-white text-xs font-black">4</span>
              Images
            </h2>
            <div className="grid grid-cols-4 gap-3">
              {uploadBtn('mainImage', 'Main *')}
              {uploadBtn('extraImage1', 'Extra 1')}
              {uploadBtn('extraImage2', 'Extra 2')}
              {uploadBtn('extraImage3', 'Extra 3')}
            </div>
          </div>

          {/* Color Variants */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
            <h2 className="text-base font-black text-gray-900 mb-6 flex items-center gap-2">
              <span className="w-7 h-7 rounded-xl gradient-primary flex items-center justify-center text-white text-xs font-black">5</span>
              Color Variants <span className="text-xs font-bold text-gray-400 normal-case ml-1">(optional)</span>
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

          {/* Deal Section */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
            <h2 className="text-base font-black text-gray-900 mb-6 flex items-center gap-2">
              <span className="w-7 h-7 rounded-xl gradient-primary flex items-center justify-center text-white text-xs font-black">6</span>
              Deal Section
            </h2>
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
                  onClick={() => setForm({ ...form, dealType: opt.value as any })}
                  className={`p-4 rounded-2xl border-2 text-left transition-all ${form.dealType === opt.value ? 'border-brand-500 bg-brand-50' : 'border-gray-100 bg-gray-50 hover:border-gray-200'}`}
                >
                  <p className="font-black text-gray-900 text-sm">{opt.label}</p>
                  <p className="text-[10px] text-gray-400 font-medium mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <div className="bg-amber-50 rounded-3xl border border-amber-100 p-6 flex items-start gap-4">
            <i className="fas fa-clock text-amber-500 mt-0.5"></i>
            <div>
              <p className="font-black text-amber-800 text-sm">Pending Admin Review</p>
              <p className="text-amber-700 text-xs font-medium mt-0.5">Your product will be reviewed before going live. You'll see it in "Pending" status on your dashboard.</p>
            </div>
          </div>

          <div className="flex gap-3 pb-8">
            <button onClick={() => navigate('/dashboard')} disabled={isUploading} className="px-8 py-4 rounded-2xl bg-white border-2 border-gray-100 text-gray-600 font-black text-sm hover:bg-gray-50 transition-all disabled:opacity-50">
              Cancel
            </button>
            <button onClick={handleSubmit} disabled={isUploading} className="flex-1 py-4 rounded-2xl gradient-primary text-white font-black text-sm shadow-lg shadow-brand-500/20 hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
              {isUploading ? <><i className="fas fa-spinner fa-spin"></i> Submitting...</> : <><i className="fas fa-paper-plane"></i> Submit for Admin Approval</>}
            </button>
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

export default AddProductView;
