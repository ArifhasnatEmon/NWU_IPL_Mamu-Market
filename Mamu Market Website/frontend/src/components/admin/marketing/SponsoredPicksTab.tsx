import React, { useState } from 'react';

import { useApprovedProducts } from '../../../hooks/useProducts';
import { useGlobalSettings } from '../../../hooks/useMarketing';
import { Product } from '../../../types';
import { getTimeLeft, computeExpiresAt, computeCustomExpiresAt, DURATION_PRESETS } from '../../../utils/expiry';

const SponsoredPicksTab = ({ setToast }: { setToast: (msg: string) => void }) => {
  const [search, setSearch] = useState('');
  const { setting, isLoading, updateSetting } = useGlobalSettings('sponsored_products');
  const [sponsoredPinned, setSponsoredPinned] = useState<{id: string, expiresAt: string | null}[]>([]);
  const [customDays, setCustomDays] = useState<Record<string, string>>({});
  const [customHours, setCustomHours] = useState<Record<string, string>>({});

  // Sync Settings
  React.useEffect(() => {
    if (setting) {
      const raw = setting;
      let validItems: {id: string, expiresAt: string | null}[] = [];
      if (raw.length > 0 && typeof raw[0] === 'string') {
        validItems = raw.map((id: string) => ({ id, expiresAt: null }));
      } else {
        const now = Date.now();
        validItems = raw.filter((x: {id: string, expiresAt: string | null}) => !x.expiresAt || (new Date(x.expiresAt).getTime() > now));
      }
      setSponsoredPinned(validItems);
    }
  }, [setting]);

  // Merge Products
  const { products: dynamicProducts } = useApprovedProducts();
  const allApproved: Product[] = dynamicProducts;
  const filtered = allApproved.filter((p: Product) =>
    (p.productName || p.name || '').toLowerCase().includes(search.toLowerCase())
  );
  const pinnedIds = sponsoredPinned.map(x => x.id);

  // Toggle Pin State
  const togglePin = async (id: string) => {
    let updated: {id: string, expiresAt: string | null}[];
    if (pinnedIds.includes(id)) {
      updated = sponsoredPinned.filter(x => x.id !== id);
    } else {
      updated = [...sponsoredPinned, { id, expiresAt: null }];
    }
    setSponsoredPinned(updated);
    const success = await updateSetting(updated);
    if (success) setToast('Sponsored Picks updated!');
    else setToast('Failed to update sponsored picks.');
  };

  const handleSetExpiry = async (id: string, durationMs: number) => {
    const expiresAt = computeExpiresAt(durationMs);
    const updated = sponsoredPinned.map(x => x.id === id ? { ...x, expiresAt } : x);
    setSponsoredPinned(updated);
    const success = await updateSetting(updated);
    if (success) setToast('Expiry set successfully!');
  };

  const handleSetCustomExpiry = async (id: string) => {
    const days = parseFloat(customDays[id] || '0') || 0;
    const hours = parseFloat(customHours[id] || '0') || 0;
    if (days === 0 && hours === 0) {
      setToast('Enter days or hours for custom expiry');
      return;
    }
    const expiresAt = computeCustomExpiresAt(days, hours);
    const updated = sponsoredPinned.map(x => x.id === id ? { ...x, expiresAt } : x);
    setSponsoredPinned(updated);
    const success = await updateSetting(updated);
    if (success) setToast(`Expiry set: ${days}d ${hours}h from now`);
  };

  if (isLoading) return <div className="p-8 text-center text-gray-500 font-bold">Loading...</div>;

  return (
    <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-8">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-black text-gray-900">Sponsored Picks Manager</h3>
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-600 bg-brand-50 px-3 py-1 rounded-full">{sponsoredPinned.length} Pinned</span>
      </div>
      <p className="text-gray-400 text-sm font-medium mb-6">Pin products to the "Featured Sponsor Picks" section on the Home Page and give them a Promoted badge across the site. Set an expiration timer so they are removed automatically.</p>
      
      {sponsoredPinned.length > 0 && (
        <div className="mb-8 p-6 bg-brand-50/50 rounded-2xl border border-brand-100/50">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-600 mb-4 block">Active Sponsored Products</label>
          <div className="space-y-4">
            {sponsoredPinned.map((item) => {
              const p = allApproved.find((x: Product) => x.id === item.id);
              const name = p ? (p.productName || p.name || item.id) : item.id;
              const img = p ? (p.mainImage || p.image || '') : '';
              const timeLeft = getTimeLeft(item.expiresAt);
              
              return (
                <div key={item.id} className="flex flex-col md:flex-row md:items-center gap-4 bg-white border border-brand-100 rounded-xl p-4 shadow-sm">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {img ? <img src={img} referrerPolicy="no-referrer" className="w-12 h-12 rounded-lg object-cover shrink-0" alt={name} /> : <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center shrink-0"><i className="fas fa-box text-gray-400"></i></div>}
                    <div className="min-w-0 flex-1">
                      <p className="font-black text-gray-900 text-sm truncate">{name}</p>
                      {timeLeft ? (
                        <p className={`text-[10px] font-bold mt-1 ${timeLeft === 'Expired' ? 'text-red-500' : 'text-amber-500'}`}>
                          ⏳ {timeLeft === 'Expired' ? 'Expired' : `${timeLeft} left`}
                        </p>
                      ) : (
                        <p className="text-[10px] font-bold text-emerald-500 mt-1">♾️ No Expiry</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 flex-wrap md:justify-end shrink-0">
                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">Set Expiry:</span>
                    {DURATION_PRESETS.map(preset => (
                      <button
                        key={preset.label}
                        onClick={() => handleSetExpiry(item.id, preset.ms)}
                        className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all ${
                          (preset.ms === 0 && !item.expiresAt)
                            ? 'bg-brand-600 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {preset.label === '∞' ? '♾️' : preset.label}
                      </button>
                    ))}
                    <div className="flex items-center gap-1 ml-1 bg-gray-50 p-1 rounded-lg border border-gray-100">
                      <input
                        type="number" min="0" placeholder="d"
                        value={customDays[item.id] || ''}
                        onChange={e => setCustomDays({ ...customDays, [item.id]: e.target.value })}
                        className="w-8 bg-white rounded px-1 py-1 text-[10px] font-bold text-center border border-gray-200 outline-none"
                      />
                      <input
                        type="number" min="0" max="23" placeholder="h"
                        value={customHours[item.id] || ''}
                        onChange={e => setCustomHours({ ...customHours, [item.id]: e.target.value })}
                        className="w-8 bg-white rounded px-1 py-1 text-[10px] font-bold text-center border border-gray-200 outline-none"
                      />
                      <button
                        onClick={() => handleSetCustomExpiry(item.id)}
                        className="px-2 py-1 bg-brand-100 text-brand-700 rounded text-[10px] font-bold hover:bg-brand-200 transition-colors"
                      >
                        Set
                      </button>
                    </div>
                    <button onClick={() => togglePin(item.id)} className="ml-2 w-8 h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 transition-colors">
                      <i className="fas fa-trash text-xs"></i>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products to sponsor..." className="w-full bg-gray-50 rounded-2xl px-5 py-3 outline-none font-bold border-none text-sm mb-4" />
      {filtered.length === 0 ? (
        <p className="text-gray-400 text-sm font-bold text-center py-6">No approved products found</p>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {filtered.map((p: Product) => {
            const isPinned = pinnedIds.includes(p.id);
            const name = p.productName || p.name || 'Product';
            const price = p.price || 0;
            const img = p.mainImage || p.image || '';
            return (
              <div key={p.id} className={`flex items-center gap-4 p-3 rounded-2xl border transition-all ${isPinned ? 'bg-brand-50 border-brand-200' : 'bg-gray-50 border-gray-100'}`}>
                {img ? <img src={img} referrerPolicy="no-referrer" className="w-10 h-10 rounded-xl object-cover shrink-0" alt={name} /> : <div className="w-10 h-10 rounded-xl bg-gray-200 flex items-center justify-center shrink-0"><i className="fas fa-box text-gray-400 text-xs"></i></div>}
                <div className="flex-1 min-w-0">
                  <p className="font-black text-gray-900 text-sm truncate">{name}</p>
                  <p className="text-gray-400 text-xs font-medium">৳{price.toLocaleString()}</p>
                </div>
                <button onClick={() => togglePin(p.id)} className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all shrink-0 ${isPinned ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-gray-900 text-white hover:bg-gray-800'}`}>
                  {isPinned ? 'Unsponsor' : 'Sponsor'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SponsoredPicksTab;
