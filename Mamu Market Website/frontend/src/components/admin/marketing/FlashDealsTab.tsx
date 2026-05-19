import React, { useState } from 'react';

import { useApprovedProducts } from '../../../hooks/useProducts';
import { useGlobalSettings } from '../../../hooks/useMarketing';
import { Product } from '../../../types';

const FlashDealsTab = ({ setToast }: { setToast: (msg: string) => void }) => {
  const [flashSearch, setFlashSearch] = useState('');
  const { setting, isLoading, updateSetting } = useGlobalSettings('flash_pinned_products');
  const [flashPinned, setFlashPinned] = useState<{id: string, pinnedAt: string}[]>([]);

  // Sync Settings
  React.useEffect(() => {
    if (setting) {
      const raw = setting;
      let validItems: {id: string, pinnedAt: string}[] = [];
      if (raw.length > 0 && typeof raw[0] === 'string') {
        validItems = raw.map((id: string) => ({ id, pinnedAt: new Date().toISOString() }));
      } else {
        const now = Date.now();
        validItems = raw.filter((x: {id: string, pinnedAt: string}) => !x.pinnedAt || (now - new Date(x.pinnedAt).getTime()) < 3 * 24 * 60 * 60 * 1000);
      }
      setFlashPinned(validItems);
    }
  }, [setting]);

  // Merge Products
  const { products: dynamicProducts } = useApprovedProducts();
  const allApproved: Product[] = dynamicProducts;
  const filtered = allApproved.filter((p: Product) =>
    (p.productName || p.name || '').toLowerCase().includes(flashSearch.toLowerCase())
  );
  const pinnedIds = flashPinned.map(x => x.id);
  const now = Date.now();

  // Toggle Pin State
  const togglePin = async (id: string) => {
    let updated: {id: string, pinnedAt: string}[];
    if (pinnedIds.includes(id)) {
      updated = flashPinned.filter(x => x.id !== id);
    } else {
      if (flashPinned.length >= 3) { setToast('Max 3 products in Flash Deal'); return; }
      updated = [...flashPinned, { id, pinnedAt: new Date().toISOString() }];
    }
    setFlashPinned(updated);
    const success = await updateSetting(updated);
    if (success) setToast('Flash Deal updated!');
    else setToast('Failed to update flash deal.');
  };

  if (isLoading) return <div className="p-8 text-center text-gray-500 font-bold">Loading...</div>;

  return (
    <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-8">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-black text-gray-900">Flash Deal Manager</h3>
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600 bg-amber-50 px-3 py-1 rounded-full">{flashPinned.length}/3 Pinned</span>
      </div>
      <p className="text-gray-400 text-sm font-medium mb-6">Pin up to 3 products to the homepage Flash Deal section. Auto-removes after 3 days.</p>
      {flashPinned.length > 0 && (
        <div className="mb-6 p-4 bg-amber-50 rounded-2xl border border-amber-100">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600 mb-3 block">Currently Pinned</label>
          <div className="flex flex-wrap gap-2">
            {flashPinned.map((item) => {
              const p = allApproved.find((x: Product) => x.id === item.id);
              const name = p ? (p.productName || p.name || item.id) : item.id;
              const daysLeft = Math.max(0, Math.ceil((new Date(item.pinnedAt).getTime() + 3 * 24 * 60 * 60 * 1000 - now) / (1000 * 60 * 60 * 24)));
              return (
                <span key={item.id} className="flex items-center gap-2 bg-white border border-amber-200 rounded-full px-3 py-1.5 text-xs font-black text-gray-800">
                  {name}
                  <span className="text-amber-500 font-medium">{daysLeft}d left</span>
                  <button onClick={() => togglePin(item.id)} className="text-red-400 hover:text-red-600 font-black">✕</button>
                </span>
              );
            })}
          </div>
        </div>
      )}
      <input value={flashSearch} onChange={e => setFlashSearch(e.target.value)} placeholder="Search approved products..." className="w-full bg-gray-50 rounded-2xl px-5 py-3 outline-none font-bold border-none text-sm mb-4" />
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
              <div key={p.id} className={`flex items-center gap-4 p-3 rounded-2xl border transition-all ${isPinned ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-100'}`}>
                {img ? <img src={img} referrerPolicy="no-referrer" className="w-10 h-10 rounded-xl object-cover shrink-0" alt={name} /> : <div className="w-10 h-10 rounded-xl bg-gray-200 flex items-center justify-center shrink-0"><i className="fas fa-box text-gray-400 text-xs"></i></div>}
                <div className="flex-1 min-w-0">
                  <p className="font-black text-gray-900 text-sm truncate">{name}</p>
                  <p className="text-gray-400 text-xs font-medium">৳{price.toLocaleString()}</p>
                </div>
                <button onClick={() => togglePin(p.id)} className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all shrink-0 ${isPinned ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-gray-900 text-white hover:bg-gray-800'}`}>
                  {isPinned ? 'Unpin' : 'Pin'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default FlashDealsTab;
