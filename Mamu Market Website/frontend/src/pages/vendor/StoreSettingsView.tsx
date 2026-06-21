import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ImageCropperModal from '../../components/ui/ImageCropperModal';
import { useAuth } from '../../context/AuthContext';
import PageTitle from '../../components/PageTitle';
import { useApp } from '../../context/AppContext';
import { useSharedCategories } from '../../context/DataContext';
import { useVendorRequests } from '../../hooks/useVendorRequests';
import { uploadImage } from '../../utils/imageUpload';
import { Category } from '../../types';
import { supabase } from '../../lib/supabase';

const StoreSettingsView: React.FC = () => {
  const { user, setUser } = useAuth();
  const { setToast } = useApp();
  const navigate = useNavigate();
  const [storeName, setStoreName] = useState(user?.storeName || user?.name || '');
  const [storeCity, setStoreCity] = useState(user?.storeCity || '');
  const [cityChangeReason, setCityChangeReason] = useState('');
  const [cityModal, setCityModal] = useState(false);
  const [storeDescription, setStoreDescription] = useState(user?.storeDescription || '');
  const [banner, setBanner] = useState(user?.banner || '');
  const [nidTradeLicense, setNidTradeLicense] = useState(user?.nidTradeLicense || '');
  const [saving, setSaving] = useState(false);

  const [categoryModal, setCategoryModal] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [categoryReason, setCategoryReason] = useState('');
  const [removeModal, setRemoveModal] = useState(false);
  const [removeCat, setRemoveCat] = useState('');
  const [removeReason, setRemoveReason] = useState('');
  const [categoryMode, setCategoryMode] = useState<'existing' | 'custom'>('existing');

  const { categories: customCategories } = useSharedCategories();

  const bannerInputRef = useRef<HTMLInputElement>(null);
  const [bannerUpImg, setBannerUpImg] = useState<string | ArrayBuffer | null>(null);
  const [bannerCropModalOpen, setBannerCropModalOpen] = useState(false);

  useEffect(() => {
    if (user) {
      setStoreName(user.storeName || user.name || '');
      setStoreDescription(user.storeDescription || '');
      setBanner(user.banner || '');
      setNidTradeLicense(user.nidTradeLicense || '');
    }
  }, [user]);

  const vendorCats = (user?.storeCategory || '').split(',').map((c: string) => c.trim()).filter(Boolean);
  const { requests, submitRequest } = useVendorRequests();
  const approvedCategoryRequests = requests
    .filter(r => r.request_type === 'category_add' && r.status === 'approved')
    .map(r => r.requested_value);
  // Only exclude a category if its most recent approved removal is NEWER than its most recent approved add
  const isEffectivelyRemoved = (catName: string) => {
    const catLower = catName.toLowerCase();
    const latestRemoval = requests
      .filter(r => r.request_type === 'category_remove' && r.status === 'approved' && (r.current_value || '').toLowerCase() === catLower)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
    if (!latestRemoval) return false;
    const latestAdd = requests
      .filter(r => r.request_type === 'category_add' && r.status === 'approved' && (r.requested_value || '').toLowerCase() === catLower)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
    if (!latestAdd) return true; // removed and never re-added
    return new Date(latestRemoval.created_at).getTime() > new Date(latestAdd.created_at).getTime();
  };
  const vendorCategories = ([...new Set([...vendorCats, ...approvedCategoryRequests])]
    .filter(Boolean) as string[])
    .filter(cat => !isEffectivelyRemoved(cat));

  // Helper: check if a pending request of a given type already exists (prevents duplicate submissions)
  const hasPendingRequest = (type: string, extraCheck?: (r: any) => boolean) => {
    return requests.some(r => r.request_type === type && r.status === 'pending' && (extraCheck ? extraCheck(r) : true));
  };

  const handleSaveStore = async () => {
    if (!user) return;
    if (saving) return; // Prevent double-clicks
    setSaving(true);

    try {
      // Name Change Request
      if (storeName !== (user.storeName || user.name)) {
        if (hasPendingRequest('store_name')) {
          setToast('A store name change request is already pending. Please wait for admin review.');
        } else {
          await submitRequest('store_name', user.storeName || user.name || '', storeName, 'Store name change');
          setToast('Store name change request sent to admin');
        }
      }

      // Upload Banner (only if it's a new blob/base64, otherwise returns the URL as-is)
      let bannerUrl = banner;
      if (banner && (banner.startsWith('data:image') || banner.startsWith('blob:'))) {
        bannerUrl = await uploadImage(banner, 'store-assets');
      }

      // Update other fields directly
      if (user?.id) {
        // Build the update payload — explicitly include banner even when empty (vendor removed it)
        const updatePayload: Record<string, any> = {
          store_description: storeDescription,
          store_city: storeCity,
        };
        // Always include banner in the update: empty string means vendor removed it, otherwise use the uploaded URL
        if (bannerUrl) {
          updatePayload.banner = bannerUrl;
        } else {
          updatePayload.banner = null; // Explicitly clear banner when removed
        }

        const { error } = await supabase.from('profiles').update(updatePayload).eq('id', user.id);
        
        if (error) {
          setToast('Failed to update settings: ' + error.message);
          return;
        }

        // Update the context so the frontend shows the new changes instantly
        setUser({
          ...user,
          storeDescription,
          storeCity,
          banner: bannerUrl || ''
        });
      }
      setToast('Store settings updated');
    } catch (err) {
      console.error('handleSaveStore error:', err);
      setToast('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleVerificationRequest = async () => {
    if (!nidTradeLicense) { setToast('Please enter NID/Trade License number'); return; }
    if (hasPendingRequest('verification')) {
      setToast('A verification request is already pending. Please wait for admin review.');
      return;
    }
    await submitRequest('verification', undefined, nidTradeLicense, 'Store Verification');
    setToast('Verification request sent to admin');
  };

  // Count categories: current + pending approved requests toward the 2-category cap
  const pendingCategoryAdds = requests.filter(r => r.request_type === 'category_add' && r.status === 'pending').length;
  const totalCategorySlots = vendorCategories.length + pendingCategoryAdds;
  const MAX_CATEGORIES = 2;

  const handleCategoryRequest = async () => {
    if (!newCategory || !categoryReason) { setToast('Please fill all fields'); return; }

    const requestType = categoryMode === 'existing' ? 'category_add' : 'category_suggest';
    const dupType = requestType;
    if (hasPendingRequest(dupType, r => r.requested_value === newCategory)) {
      setToast(`A request for "${newCategory}" is already pending. Please wait for admin review.`);
      return;
    }

    // Enforce 2-category cap only for actual category additions (not suggestions)
    if (categoryMode === 'existing' && totalCategorySlots >= MAX_CATEGORIES) {
      setToast(`You can have a maximum of ${MAX_CATEGORIES} categories. Remove one first to request a new one.`);
      return;
    }

    await submitRequest(requestType, categoryMode, newCategory, categoryReason);
    setCategoryModal(false);
    setNewCategory('');
    setCategoryReason('');
    setToast(categoryMode === 'existing' ? 'Category request sent to admin' : 'Category suggestion sent to admin');
  };

  const confirmRemove = async () => {
    if (!removeReason) { setToast('Please select a reason'); return; }
    if (hasPendingRequest('category_remove', r => r.current_value === removeCat)) {
      setToast(`A removal request for "${removeCat}" is already pending. Please wait for admin review.`);
      setRemoveModal(false);
      return;
    }
    await submitRequest('category_remove', removeCat, undefined, removeReason);
    setToast('Category removal request sent to admin!');
    setRemoveModal(false);
    setRemoveCat('');
    setRemoveReason('');
  };

  return (
    <div className="container mx-auto px-4 py-20 font-sans">
      <PageTitle title="Store Settings" />
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-black text-gray-900">Store Settings</h1>
          <button onClick={() => navigate('/dashboard')} className="text-gray-500 font-bold hover:text-gray-900">Back to Dashboard</button>
        </div>

        <div className="bg-white rounded-[2rem] p-10 border border-gray-100 shadow-sm space-y-8">

          {/* Store Info */}
          <section>
            <h3 className="text-xl font-black text-gray-900 mb-6">Store Information</h3>
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2 block">Store Name</label>
                <input
                  type="text"
                  value={storeName}
                  onChange={e => setStoreName(e.target.value)}
                  className="w-full bg-gray-50 rounded-2xl px-6 py-4 outline-none font-bold border-none"
                  placeholder="Enter store name"
                />
                <p className="text-xs text-gray-400 mt-2 font-medium">Changing store name requires admin approval.</p>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2 block">Store Location / City</label>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-gray-50 rounded-2xl px-6 py-4 font-bold text-gray-700">{storeCity || 'Not set'}</div>
                  <button type="button" onClick={() => setCityModal(true)} className="px-5 py-4 bg-brand-400 hover:bg-brand-500 text-white rounded-2xl font-black text-xs transition-all">
                    <i className="fas fa-pencil-alt"></i>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2 block">Store Description</label>
                <textarea
                  value={storeDescription}
                  onChange={e => setStoreDescription(e.target.value)}
                  rows={4}
                  className="w-full bg-gray-50 rounded-2xl px-6 py-4 outline-none font-bold border-none resize-none"
                  placeholder="Tell customers about your store..."
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2 block">Store Banner</label>
                {banner ? (
                  <div className="relative w-full rounded-2xl overflow-hidden group">
                    <img src={banner || 'https://via.placeholder.com/800x400?text=Store+Banner'} referrerPolicy="no-referrer" alt="Store Banner" className="w-full h-48 object-cover rounded-2xl" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => bannerInputRef.current?.click()}
                        className="px-4 py-2 bg-white text-gray-900 rounded-xl font-black text-xs hover:bg-gray-100 transition-all"
                      >
                        <i className="fas fa-crop-alt mr-1"></i> Change & Crop
                      </button>
                      <button
                        type="button"
                        onClick={() => setBanner('')}
                        className="px-4 py-2 bg-red-500 text-white rounded-xl font-black text-xs hover:bg-red-600 transition-all"
                      >
                        <i className="fas fa-trash mr-1"></i> Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => bannerInputRef.current?.click()}
                    className="w-full h-48 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-brand-400 hover:bg-brand-50/30 transition-all"
                  >
                    <i className="fas fa-cloud-upload-alt text-3xl text-gray-300 mb-3"></i>
                    <p className="font-black text-gray-400 text-sm">Click to upload banner</p>
                    <p className="text-xs text-gray-300 font-medium mt-1">PNG, JPG or GIF (Recommended: 1200×400px for a perfect fit)</p>
                  </div>
                )}
                <input
                  ref={bannerInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => {
                      setBannerUpImg(reader.result);
                      setBannerCropModalOpen(true);
                    };
                    reader.readAsDataURL(file);
                    e.target.value = '';
                  }}
                />
              </div>

              <ImageCropperModal
                isOpen={bannerCropModalOpen}
                imageSrc={bannerUpImg}
                title="Crop Store Banner"
                onCancel={() => { setBannerCropModalOpen(false); setBannerUpImg(null); }}
                onCropComplete={(blobUrl) => {
                  setBanner(blobUrl);
                  setBannerCropModalOpen(false);
                  setBannerUpImg(null);
                }}
              />
            </div>
          </section>

          <hr className="border-gray-100" />

          {/* Verification */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-gray-900">Business Verification</h3>
              {user?.verified ? (
                <span className="bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider">Verified ✓</span>
              ) : (
                <span className="bg-gray-100 text-gray-500 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider">Unverified</span>
              )}
            </div>

            {!user?.verified && (
              <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100">
                <p className="text-blue-800 font-bold text-sm mb-4">Submit your NID or Trade License number to get verified badge.</p>
                <div className="flex gap-4">
                  <input
                    type="text"
                    value={nidTradeLicense}
                    onChange={e => setNidTradeLicense(e.target.value)}
                    className="flex-1 bg-white rounded-xl px-4 py-3 outline-none font-bold text-sm border border-blue-100"
                    placeholder="Enter NID / Trade License No."
                  />
                  <button onClick={handleVerificationRequest} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-black text-xs uppercase hover:bg-blue-700 transition-colors">
                    Submit
                  </button>
                </div>
              </div>
            )}
          </section>

          <hr className="border-gray-100" />

          {/* Category Request */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-black text-gray-900">Product Categories</h3>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{vendorCategories.length}/{MAX_CATEGORIES}</span>
                <button onClick={() => setCategoryModal(true)} className="text-brand-600 font-black text-xs uppercase hover:underline">Request New Category</button>
              </div>
            </div>
            <div className="space-y-2">
              {vendorCategories.length === 0 && <p className="text-gray-400 font-medium text-sm">No categories assigned</p>}
              {vendorCategories.map((cat: string, index: number) => {
                const isPrimary = index === 0;
                const removeRequested = requests
                  .find(r => r.request_type === 'category_remove' && (r.current_value || '').toLowerCase() === cat.toLowerCase() && r.status === 'pending');
                return (
                  <div key={cat} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-gray-900 text-sm">{cat}</span>
                      {isPrimary && (
                        <span className="text-[10px] font-black text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full uppercase">Primary</span>
                      )}
                    </div>
                    {isPrimary ? (
                      <span className="text-[10px] font-black text-gray-400 bg-gray-100 px-2 py-1 rounded-full uppercase">Protected</span>
                    ) : removeRequested ? (
                      <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-1 rounded-full uppercase">Removal Pending</span>
                    ) : (
                      <button onClick={() => { setRemoveCat(cat); setRemoveReason(''); setRemoveModal(true); }} className="text-xs font-black text-red-400 hover:text-red-600 bg-red-50 px-3 py-1 rounded-full hover:bg-red-100 transition-all">
                        Request Remove
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          <div className="pt-6">
            <button onClick={handleSaveStore} disabled={saving} className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-xl shadow-black/10 flex items-center justify-center gap-2 ${saving ? 'bg-gray-400 text-gray-200 cursor-not-allowed' : 'bg-gray-900 text-white hover:bg-gray-800'}`}>
              {saving && <i className="fas fa-spinner fa-spin"></i>}
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>

        </div>
      </div>

      {/* Category Request Modal */}
      {cityModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] p-8 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="w-14 h-14 rounded-2xl bg-brand-50 flex items-center justify-center text-brand-500 mb-6">
              <i className="fas fa-map-marker-alt text-xl"></i>
            </div>
            <h3 className="text-xl font-black text-gray-900 mb-2">Request Location Change</h3>
            <p className="text-gray-400 font-medium mb-6">Current: <span className="font-black text-gray-900">{storeCity || 'Not set'}</span></p>
            <div className="space-y-4 mb-6">
              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2 block">New City</label>
                <input type="text" value={storeCity} onChange={e => setStoreCity(e.target.value)} placeholder="e.g. Dhaka, Chittagong, Khulna" className="w-full bg-gray-50 rounded-2xl px-6 py-4 outline-none font-bold border-none" />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2 block">Reason</label>
                <textarea
                  value={cityChangeReason}
                  onChange={e => setCityChangeReason(e.target.value)}
                  placeholder="Please explain why you want to change your store location..."
                  rows={3}
                  className="w-full bg-gray-50 rounded-2xl px-6 py-4 outline-none font-bold border-none resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setCityModal(false)} className="flex-1 py-4 bg-gray-100 text-gray-900 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-gray-200 transition-all">Cancel</button>
              <button onClick={() => {
                if (!storeCity.trim()) { setToast('Please enter a city'); return; }
                if (!cityChangeReason) { setToast('Please select a reason'); return; }
                if (hasPendingRequest('city_change')) {
                  setToast('A location change request is already pending. Please wait for admin review.');
                  setCityModal(false);
                  return;
                }
                submitRequest('city_change', user?.storeCity || '', storeCity, cityChangeReason);
                setToast('Location change request sent to admin!');
                setCityModal(false);
                setCityChangeReason('');
              }} className="flex-1 py-4 bg-brand-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-brand-700 transition-all">Send Request</button>
            </div>
          </div>
        </div>
      )}

      {categoryModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] p-10 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="text-2xl font-black text-gray-900 mb-6">Request Category</h3>
            <div className="space-y-4">
              {/* Toggle: Existing vs New */}
              <div className="flex rounded-2xl bg-gray-100 p-1">
                <button
                  type="button"
                  onClick={() => { setNewCategory(''); setCategoryMode('existing'); }}
                  className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${categoryMode === 'existing' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  Existing Category
                </button>
                <button
                  type="button"
                  onClick={() => { setNewCategory(''); setCategoryMode('custom'); }}
                  className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${categoryMode === 'custom' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  Suggest New
                </button>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2 block">Category Name</label>
                {categoryMode === 'existing' ? (
                  <select
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value)}
                    className="w-full bg-gray-50 rounded-2xl px-6 py-4 outline-none font-bold border-none"
                  >
                    <option value="">Select a category</option>
                    {(() => {
                      const defaultCats = ['Electronics', 'Fashion', 'Home & Living', 'Beauty & Health', 'Sports & Outdoor'];
                      const dbCatNames = customCategories.map((c: Category) => c.name);
                      const allCats = [...new Set([...defaultCats, ...dbCatNames])];
                      const availableCats = allCats.filter(c => !vendorCategories.includes(c));
                      return availableCats.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ));
                    })()}
                  </select>
                ) : (
                  <>
                    <input
                      type="text"
                      value={newCategory}
                      onChange={e => setNewCategory(e.target.value)}
                      className="w-full bg-gray-50 rounded-2xl px-6 py-4 outline-none font-bold border-none"
                      placeholder="e.g. Pet Supplies, Automotive Parts..."
                    />
                    <p className="text-xs text-gray-400 mt-2 font-medium">
                      <i className="fas fa-info-circle mr-1"></i>
                      Suggest a category that doesn't exist yet. Admin will review and add it to the platform.
                    </p>
                  </>
                )}
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2 block">Reason / Justification</label>
                <textarea
                  value={categoryReason}
                  onChange={e => setCategoryReason(e.target.value)}
                  rows={3}
                  className="w-full bg-gray-50 rounded-2xl px-6 py-4 outline-none font-bold border-none resize-none"
                  placeholder="Why do you need this category?"
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button onClick={() => setCategoryModal(false)} className="flex-1 py-4 bg-gray-100 text-gray-900 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-gray-200 transition-all">Cancel</button>
                <button onClick={handleCategoryRequest} className="flex-1 py-4 bg-brand-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:opacity-90 transition-all">Submit Request</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {removeModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] p-8 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center text-red-500 mb-6">
              <i className="fas fa-tag text-xl"></i>
            </div>
            <h3 className="text-xl font-black text-gray-900 mb-2">Request Category Removal</h3>
            <p className="text-gray-400 font-medium mb-6">You are requesting to remove <span className="text-gray-900 font-black">"{removeCat}"</span> from your store. Admin will review this request.</p>
            <div className="mb-6">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2 block">Reason for Removal</label>
              <select value={removeReason} onChange={e => setRemoveReason(e.target.value)} className="w-full bg-gray-50 rounded-2xl px-6 py-4 outline-none font-bold border-none">
                <option value="">Select a reason</option>
                <option value="No longer selling in this category">No longer selling in this category</option>
                <option value="Wrong category assigned">Wrong category assigned</option>
                <option value="Switching to different category">Switching to different category</option>
                <option value="Business decision">Business decision</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setRemoveModal(false)} className="flex-1 py-4 bg-gray-100 text-gray-900 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-gray-200 transition-all">Cancel</button>
              <button onClick={confirmRemove} className="flex-1 py-4 bg-red-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-red-600 transition-all">Send Request</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoreSettingsView;
