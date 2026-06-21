import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import PageTitle from '../../components/PageTitle';
import { useApp } from '../../context/AppContext';
import { usePromoCodes } from '../../hooks/useMarketing';
import { PromoCode } from '../../types/promotion';
import { supabase } from '../../lib/supabase';

const VendorPromoCodesView: React.FC = () => {
  const { user } = useAuth();
  const { setToast } = useApp();
  const navigate = useNavigate();
  const { promoCodes, refreshPromoCodes } = usePromoCodes();

  const [showPromoModal, setShowPromoModal] = useState(false);
  const [promoForm, setPromoForm] = useState<{code: string, discountType: '%'|'flat'|'free_delivery', discount: number, minOrder: number, maxUses: number, expiresAt: string}>({ code: '', discountType: '%', discount: 0, minOrder: 0, maxUses: 0, expiresAt: '' });
  const [isSubmittingPromo, setIsSubmittingPromo] = useState(false);

  // Filter vendor's promo codes
  const myCodes = promoCodes.filter((c: PromoCode) =>
    c.vendor_id === user?.id || c.assigned_vendor_id === user?.id
  );

  const handleRequestPromo = async () => {
    if (!promoForm.code.trim()) {
      setToast('Please provide a valid code.');
      return;
    }
    if (promoForm.discountType !== 'free_delivery' && promoForm.discount <= 0) {
      setToast('Please provide a valid discount amount.');
      return;
    }
    
    setIsSubmittingPromo(true);
    try {
      const { error } = await supabase.from('promo_codes').insert({
        code: promoForm.code.toUpperCase(),
        discount_type: promoForm.discountType,
        discount_value: promoForm.discount,
        min_order_value: promoForm.minOrder || 0,
        status: 'pending',
        is_active: false,
        vendor_id: user?.id,
        vendor_name: user?.storeName || user?.name || 'Vendor',
        code_type: 'vendor',
        used_count: 0,
        max_uses: promoForm.maxUses || null,
        expires_at: promoForm.expiresAt ? new Date(promoForm.expiresAt).toISOString() : null
      });
      if (error) throw error;
      setToast('Promo code request sent to admin for approval!');
      setShowPromoModal(false);
      setPromoForm({ code: '', discountType: '%', discount: 0, minOrder: 0, maxUses: 0, expiresAt: '' });
    } catch (e: any) {
      setToast('Failed to request promo code: ' + e.message);
    } finally {
      setIsSubmittingPromo(false);
    }
  };
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <PageTitle title="Promo Codes" />
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40 shadow-sm">
        <div className="container mx-auto px-4 h-20 flex items-center gap-4">
          <button onClick={() => navigate('/dashboard')} className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors">
            <i className="fas fa-arrow-left"></i>
          </button>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Promo Codes</h1>
            <p className="text-sm font-bold text-gray-500">Manage your store discounts</p>
          </div>
        </div>
      </header>

      <div className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm p-10">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-2xl font-black text-gray-900 tracking-tight">My Promo Codes</h3>
            <button
              onClick={() => {
                if (myCodes.length >= 3) {
                  setToast('You have reached the limit of 3 promo codes.');
                } else {
                  setShowPromoModal(true);
                }
              }}
              className="text-xs font-black text-brand-600 uppercase tracking-widest hover:underline"
            >
              Request Code →
            </button>
          </div>
          
          {myCodes.length === 0 ? (
            <div className="bg-gray-50 rounded-[2rem] p-10 border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 bg-brand-50 text-brand-500 rounded-full flex items-center justify-center mb-6">
                <i className="fas fa-ticket-alt text-3xl"></i>
              </div>
              <h4 className="text-gray-900 font-black text-xl mb-3">Boost Sales with Promo Codes</h4>
              <p className="text-gray-500 font-medium text-sm max-w-md mb-8">
                Offer store-wide discounts or free delivery to attract more customers. Request a custom code to get started!
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <button 
                  onClick={() => { setPromoForm({...promoForm, discountType: '%'}); setShowPromoModal(true); }} 
                  className="px-8 py-4 bg-brand-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-brand-700 transition-colors shadow-lg shadow-brand-500/30"
                >
                  Request Discount
                </button>
                <button 
                  onClick={() => { setPromoForm({...promoForm, discountType: 'free_delivery'}); setShowPromoModal(true); }} 
                  className="px-8 py-4 bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/30"
                >
                  Free Delivery Code
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {myCodes.map((c: PromoCode, i: number) => {
              const isActive = c.active !== false && (!c.expiresAt || new Date(c.expiresAt) > new Date());
              const isAdminCreated = !c.vendor_id || c.type === 'admin';
              return (
                <div key={i} className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center shrink-0">
                    <i className="fas fa-tag text-purple-600 text-sm"></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-black text-gray-900 text-sm font-mono">{c.code}</p>
                      {isAdminCreated && (
                        <span className="text-[9px] font-black uppercase tracking-widest bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">By Admin</span>
                      )}
                    </div>
                    <p className="text-gray-400 text-xs font-medium">
                      {c.discountType === 'free_delivery' || c.discount_type === 'free_delivery' ? 'Free Delivery' : c.discountType === '%' || c.discount_type === '%' ? `${c.discount || c.discount_value}% off` : `৳${c.discount || c.discount_value} off`}
                      {(c.minOrder || c.min_order_value) ? ` · Min ৳${c.minOrder || c.min_order_value}` : ''}
                      {(c.maxUses || c.max_uses) ? ` · ${c.usedCount || c.used_count || 0}/${c.maxUses || c.max_uses} used` : ''}
                      {(c.expiresAt || c.expires_at) ? ` · Exp ${new Date(c.expiresAt || c.expires_at!).toLocaleDateString()}` : ''}
                    </p>
                  </div>
                  <div className="flex gap-2 items-center">
                    <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full shrink-0 ${c.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {c.status === 'pending' ? 'Pending' : isActive ? 'Active' : 'Inactive'}
                    </span>
                    {!isAdminCreated && c.status !== 'pending' && (
                      <button onClick={async () => {
                        try {
                          const { error } = await supabase.from('promo_codes').update({ is_active: c.is_active === false ? true : false }).eq('id', c.id);
                          if (error) throw error;
                          setToast(c.is_active === false ? 'Promo code re-enabled.' : 'Promo code disabled.');
                          // Refresh to show updated UI
                          refreshPromoCodes();
                        } catch (e: any) {
                          setToast('Error: ' + e.message);
                        }
                      }} className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full shrink-0 ${c.is_active === false ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-red-100 text-red-700 hover:bg-red-200'} transition-colors`}>
                        {c.is_active === false ? 'Enable' : 'Disable'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            </div>
          )}
        </div>
      </div>

      {showPromoModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => !isSubmittingPromo && setShowPromoModal(false)}>
          <div className="bg-white rounded-[3rem] p-10 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="text-2xl font-black text-gray-900 mb-2">Request Store-Wide Promo</h3>
            <p className="text-sm font-bold text-gray-400 mb-8">Create a custom promo code that applies to all products in your store. Max 3 active codes allowed.</p>
            
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2 block">Promo Code</label>
                <input 
                  type="text" 
                  value={promoForm.code} 
                  onChange={e => setPromoForm({ ...promoForm, code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') })} 
                  placeholder="e.g. FREESHIP"
                  maxLength={15}
                  className="w-full bg-gray-50 rounded-2xl px-6 py-4 outline-none font-black text-gray-900 uppercase border-none focus:ring-2 focus:ring-brand-500" 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className={promoForm.discountType === 'free_delivery' ? 'col-span-2' : ''}>
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2 block">Discount Type</label>
                  <select 
                    value={promoForm.discountType} 
                    onChange={e => setPromoForm({ ...promoForm, discountType: e.target.value as '%' | 'flat' | 'free_delivery' })} 
                    className="w-full bg-gray-50 rounded-2xl px-6 py-4 outline-none font-bold text-gray-900 border-none appearance-none"
                  >
                    <option value="%">Percentage (%)</option>
                    <option value="flat">Flat Amount (৳)</option>
                    <option value="free_delivery">Free Delivery</option>
                  </select>
                </div>
                {promoForm.discountType !== 'free_delivery' && (
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2 block">Amount</label>
                    <input 
                      type="number" 
                      value={promoForm.discount || ''} 
                      onChange={e => setPromoForm({ ...promoForm, discount: Number(e.target.value) })} 
                      min={1}
                      max={promoForm.discountType === '%' ? 100 : 10000}
                      className="w-full bg-gray-50 rounded-2xl px-6 py-4 outline-none font-bold text-gray-900 border-none" 
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2 block truncate">Min Order</label>
                  <input 
                    type="number" 
                    value={promoForm.minOrder || ''} 
                    onChange={e => setPromoForm({ ...promoForm, minOrder: Number(e.target.value) })} 
                    placeholder="৳0"
                    min={0}
                    className="w-full bg-gray-50 rounded-2xl px-6 py-4 outline-none font-bold text-gray-900 border-none" 
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2 block truncate">Max Uses</label>
                  <input 
                    type="number" 
                    value={promoForm.maxUses || ''} 
                    onChange={e => setPromoForm({ ...promoForm, maxUses: Number(e.target.value) })} 
                    placeholder="Unlimited"
                    min={1}
                    className="w-full bg-gray-50 rounded-2xl px-6 py-4 outline-none font-bold text-gray-900 border-none" 
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2 block truncate">Expiry Date</label>
                <input 
                  type="date" 
                  value={promoForm.expiresAt} 
                  onChange={e => setPromoForm({ ...promoForm, expiresAt: e.target.value })} 
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full bg-gray-50 rounded-2xl px-6 py-4 outline-none font-bold text-gray-900 border-none" 
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  onClick={() => setShowPromoModal(false)} 
                  disabled={isSubmittingPromo}
                  className="flex-1 py-4 bg-gray-100 text-gray-900 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-gray-200 transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleRequestPromo} 
                  disabled={isSubmittingPromo}
                  className="flex-1 py-4 bg-brand-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:opacity-90 transition-all disabled:opacity-50"
                >
                  {isSubmittingPromo ? 'Sending...' : 'Request'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorPromoCodesView;
