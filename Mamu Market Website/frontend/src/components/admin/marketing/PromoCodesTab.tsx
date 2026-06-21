import React, { useState } from 'react';

import { usePromoCodes } from '../../../hooks/useMarketing';
import { PromoCode } from '../../../types';
import { supabase } from '../../../lib/supabase';

interface Props {
  setToast: (msg: string) => void;
  refreshData: () => void;
}

const PromoCodesTab = ({ setToast, refreshData }: Props) => {
  const [adminPromoCode, setAdminPromoCode] = useState('');
  const [adminPromoDiscount, setAdminPromoDiscount] = useState('10');
  const [adminPromoType, setAdminPromoType] = useState<'%' | 'flat'>('%');
  const [adminPromoMinOrder, setAdminPromoMinOrder] = useState('');
  const [adminPromoMaxUses, setAdminPromoMaxUses] = useState('');
  const [adminPromoExpiry, setAdminPromoExpiry] = useState('');
  const [adminPromoFreeDelivery, setAdminPromoFreeDelivery] = useState(false);

  const { promoCodes, refreshPromoCodes } = usePromoCodes();

  // Data Processing
  const pendingPromoReqs = promoCodes.filter((r: PromoCode) => r.status === 'pending');
  const allCodes = promoCodes.filter((c: PromoCode) => c.status !== 'pending');
  const adminCodes = allCodes.filter((c: PromoCode) => c.code_type === 'admin' || !c.code_type);
  const vendorCodes = allCodes.filter((c: PromoCode) => c.code_type === 'vendor');

  return (
    <div className="space-y-6">
      {/* Pending Requests */}
      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-8">
        <h3 className="font-black text-gray-900 mb-1">Vendor Promo Code Requests</h3>
        <p className="text-xs text-gray-400 font-medium mb-6">Review and approve to create the code for the vendor's store.</p>
        
        {pendingPromoReqs.length === 0 ? (
          <div className="bg-gray-50 border border-dashed border-gray-200 rounded-2xl p-6 text-center">
            <p className="text-gray-400 font-bold text-sm">No pending requests at the moment.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingPromoReqs.map((r: PromoCode) => (
              <div key={r.id} className="bg-gray-50 rounded-2xl p-4 flex gap-4 items-center">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-black text-gray-900 text-sm tracking-widest">{r.code}</span>
                    <span className="text-[10px] font-black bg-brand-100 text-brand-600 px-2 py-0.5 rounded-full">{r.discount_type === 'free_delivery' ? 'FREE DELIVERY' : r.discount_type === '%' ? `${r.discount_value}% OFF` : `৳${r.discount_value} OFF`}</span>
                  </div>
                  <p className="text-[10px] text-gray-500 font-medium mt-0.5">{r.vendor_name} · {r.min_order_value ? `Min ৳${r.min_order_value}` : 'No min order'}{r.expires_at ? ` · Expires ${new Date(r.expires_at).toLocaleDateString('en-BD')}` : ''}</p>
                  {r.note && <p className="text-[10px] text-gray-400 italic mt-0.5">"{r.note}"</p>}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={async () => {
                    try {
                      const { error } = await supabase.from('promo_codes').update({ status: 'active', is_active: true }).eq('id', r.id);
                      if (error) throw error;
                      setToast(`Promo code "${r.code}" created for ${r.vendor_name}.`);
                      refreshPromoCodes();
                      refreshData();
                    } catch (e: unknown) { setToast((e as Error).message); }
                  }} className="bg-emerald-500 text-white rounded-xl px-3 py-1.5 text-xs font-black hover:bg-emerald-600 transition-colors">Approve</button>
                  <button onClick={async () => {
                    try {
                      const { error } = await supabase.from('promo_codes').update({ status: 'rejected' }).eq('id', r.id);
                      if (error) throw error;
                      setToast('Request rejected.');
                      refreshPromoCodes();
                      refreshData();
                    } catch (e: unknown) { setToast((e as Error).message); }
                  }} className="bg-red-100 text-red-500 rounded-xl px-3 py-1.5 text-xs font-black hover:bg-red-200 transition-colors">Reject</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Global Promo Creation */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <h3 className="font-black text-gray-900 mb-1">Create Global Promo Code</h3>
        <p className="text-xs text-gray-400 font-medium mb-5">Works on all products from all vendors</p>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1 block">Code</label>
            <input type="text" value={adminPromoCode} onChange={e => setAdminPromoCode(e.target.value.toUpperCase().replace(/\s/g,''))} maxLength={20} className="w-full bg-gray-50 rounded-xl px-4 py-3 outline-none font-black text-sm border border-gray-100 tracking-widest" placeholder="e.g. WELCOME50" />
          </div>
          <div>
            <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1 block">Discount</label>
            <div className="flex gap-2">
              <input type="number" value={adminPromoDiscount} onChange={e => setAdminPromoDiscount(e.target.value)} min="1" className="flex-1 bg-gray-50 rounded-xl px-4 py-3 outline-none font-black text-sm border border-gray-100" placeholder="10" />
              <div className="flex gap-1">
                <button onClick={() => setAdminPromoType('%')} className={`px-3 py-2 rounded-xl text-xs font-black transition-all ${adminPromoType === '%' ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-500'}`}>%</button>
                <button onClick={() => setAdminPromoType('flat')} className={`px-3 py-2 rounded-xl text-xs font-black transition-all ${adminPromoType === 'flat' ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-500'}`}>৳</button>
              </div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div>
            <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1 block">Min Order</label>
            <input type="number" value={adminPromoMinOrder} onChange={e => setAdminPromoMinOrder(e.target.value)} className="w-full bg-gray-50 rounded-xl px-4 py-3 outline-none font-bold text-sm border border-gray-100" placeholder="Optional" />
          </div>
          <div>
            <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1 block">Max Uses</label>
            <input type="number" value={adminPromoMaxUses} onChange={e => setAdminPromoMaxUses(e.target.value)} className="w-full bg-gray-50 rounded-xl px-4 py-3 outline-none font-bold text-sm border border-gray-100" placeholder="Optional" />
          </div>
          <div>
            <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1 block">Expiry Date</label>
            <input type="date" value={adminPromoExpiry} onChange={e => setAdminPromoExpiry(e.target.value)} className="w-full bg-gray-50 rounded-xl px-4 py-3 outline-none font-bold text-sm border border-gray-100" />
          </div>
        </div>
        <div className="flex items-center justify-between bg-emerald-50 rounded-xl px-4 py-3 mb-4">
          <div>
            <p className="font-black text-emerald-700 text-sm">Free Delivery</p>
            <p className="text-[10px] text-emerald-500 font-medium">Waive delivery fee when this code is applied</p>
          </div>
          <button onClick={() => setAdminPromoFreeDelivery(!adminPromoFreeDelivery)} className={`w-12 h-6 rounded-full transition-all relative shrink-0 ${adminPromoFreeDelivery ? 'bg-emerald-500' : 'bg-gray-200'}`}>
            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${adminPromoFreeDelivery ? 'left-6' : 'left-0.5'}`}></span>
          </button>
        </div>
        <button onClick={async () => {
          if (!adminPromoCode) { setToast('Please enter a code'); return; }
          try {
            const { error } = await supabase.from('promo_codes').insert({
              code: adminPromoCode,
              discount_type: adminPromoFreeDelivery ? 'free_delivery' : adminPromoType,
              discount_value: adminPromoFreeDelivery ? 0 : Number(adminPromoDiscount),
              min_order_value: adminPromoMinOrder ? Number(adminPromoMinOrder) : 0,
              max_uses: adminPromoMaxUses ? Number(adminPromoMaxUses) : null,
              used_count: 0,
              expires_at: adminPromoExpiry ? new Date(adminPromoExpiry).toISOString() : null,
              code_type: 'admin',
              status: 'active',
              is_active: true
            });
            if (error) throw error;
            setToast('Promo code created!');
            setAdminPromoCode(''); setAdminPromoDiscount('10'); setAdminPromoMinOrder(''); setAdminPromoMaxUses(''); setAdminPromoExpiry(''); setAdminPromoFreeDelivery(false);
            refreshPromoCodes();
            refreshData();
          } catch (e: unknown) { setToast((e as Error).message); }
        }} className="bg-brand-600 text-white rounded-xl px-6 py-3 font-black text-sm hover:bg-brand-700 transition-all w-full">Create Code</button>
      </div>

      {/* Active Promo Codes */}
      {allCodes.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h3 className="font-black text-gray-900 mb-4 text-sm uppercase tracking-widest">Active Promo Codes ({allCodes.length})</h3>
          <div className="space-y-2">
            {allCodes.map((c: PromoCode) => {
              const isAdmin = c.code_type === 'admin' || !c.code_type;
              return (
                <div key={c.id} className={`flex items-center gap-3 p-3 rounded-xl ${c.is_active !== false ? 'bg-gray-50' : 'bg-red-50 opacity-60'}`}>
                  <span className="font-black text-sm tracking-widest text-gray-900 w-32 shrink-0">{c.code}</span>
                  <span className={`text-xs font-black px-2 py-0.5 rounded-full shrink-0 ${isAdmin ? 'bg-brand-50 text-brand-600' : 'bg-purple-50 text-purple-600'}`}>
                    {c.discount_type === 'free_delivery' ? 'FREE DELIVERY' : c.discount_type === '%' ? `${c.discount_value}% OFF` : `৳${c.discount_value} OFF`}
                  </span>
                  
                  {/* Tag distinguishing Admin vs Vendor */}
                  <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full shrink-0 ${isAdmin ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
                    {isAdmin ? 'By Admin' : 'By Vendor'}
                  </span>

                  <span className="text-[10px] text-gray-400 font-medium shrink-0 w-24 truncate">{isAdmin ? 'System Wide' : c.vendor_name}</span>
                  <span className="text-[10px] text-gray-400 flex-1">{c.used_count || 0}/{c.max_uses || '∞'} uses{c.min_order_value ? ` · Min ৳${c.min_order_value}` : ''}{c.expires_at ? ` · Exp ${new Date(c.expires_at).toLocaleDateString()}` : ''}</span>
                  
                  <button onClick={() => {
                      setToast(c.is_active !== false ? 'Code disabled.' : 'Code enabled!');
                      refreshPromoCodes();
                      refreshData();
                  }} className={`text-[10px] font-black px-2 py-1 rounded-lg shrink-0 ${c.is_active !== false ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-600'}`}>
                    {c.is_active !== false ? 'Disable' : 'Enable'}
                  </button>
                  {isAdmin && (
                    <button onClick={() => {
                      if (!confirm(`Delete code "${c.code}"?`)) return;
                        setToast('Code deleted.');
                        refreshPromoCodes();
                        refreshData();
                    }} className="text-[10px] font-black text-red-400 hover:text-red-600 px-2 py-1 shrink-0">Delete</button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {allCodes.length === 0 && (
        <p className="text-gray-400 text-center py-16 font-bold">No active promo codes yet.</p>
      )}
    </div>
  );
};

export default PromoCodesTab;
