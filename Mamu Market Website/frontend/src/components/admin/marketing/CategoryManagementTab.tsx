import React from 'react';
import { useCategories } from '../../../hooks/useSecondary';
import { Category, SubCategory } from '../../../types';

const CategoryManagementTab = ({ setToast }: { setToast: (msg: string) => void }) => {
  const { categories: customCats, loading, addCategory, removeCategory, addSubCategory, removeSubCategory } = useCategories();
  const [newCatName, setNewCatName] = React.useState('');
  const [selectedIcon, setSelectedIcon] = React.useState('fa-tag');
  const [showIconPicker, setShowIconPicker] = React.useState(false);
  const [expandedCat, setExpandedCat] = React.useState<string | null>(null);
  const [newSubName, setNewSubName] = React.useState('');

  const icons = [
    // General / Tags
    'fa-tag', 'fa-tags', 'fa-star', 'fa-fire', 'fa-bolt', 'fa-gem', 'fa-crown', 'fa-certificate',
    // Electronics & Tech
    'fa-mobile-screen', 'fa-laptop', 'fa-desktop', 'fa-tv', 'fa-tablet-screen-button', 'fa-headphones',
    'fa-camera', 'fa-gamepad', 'fa-keyboard', 'fa-microchip', 'fa-hard-drive', 'fa-memory',
    'fa-plug', 'fa-battery-full', 'fa-satellite-dish', 'fa-robot', 'fa-vr-cardboard',
    // Fashion & Accessories
    'fa-shirt', 'fa-shoe-prints', 'fa-glasses', 'fa-hat-cowboy', 'fa-vest', 'fa-socks',
    'fa-ring', 'fa-bag-shopping', 'fa-briefcase', 'fa-suitcase',
    // Home & Living
    'fa-house', 'fa-couch', 'fa-bed', 'fa-kitchen-set', 'fa-blender', 'fa-fan', 'fa-lightbulb',
    'fa-shower', 'fa-faucet', 'fa-chair', 'fa-door-open', 'fa-broom',
    // Health & Beauty
    'fa-heart-pulse', 'fa-spa', 'fa-pump-soap', 'fa-spray-can-sparkles', 'fa-eye-dropper',
    // Sports & Outdoors
    'fa-dumbbell', 'fa-bicycle', 'fa-football', 'fa-baseball-bat-ball', 'fa-table-tennis-paddle-ball',
    'fa-golf-ball-tee', 'fa-person-swimming', 'fa-person-running', 'fa-campground', 'fa-fish',
    // Vehicles
    'fa-car', 'fa-motorcycle', 'fa-truck', 'fa-van-shuttle', 'fa-gas-pump',
    // Food & Grocery
    'fa-utensils', 'fa-mug-hot', 'fa-wine-glass', 'fa-pizza-slice', 'fa-apple-whole',
    'fa-carrot', 'fa-wheat-awn', 'fa-ice-cream', 'fa-cookie',
    // Kids & Toys
    'fa-baby', 'fa-baby-carriage', 'fa-puzzle-piece', 'fa-dice', 'fa-wand-magic-sparkles',
    // Pets
    'fa-paw', 'fa-dog', 'fa-cat', 'fa-dove', 'fa-fish-fins',
    // Books & Education
    'fa-book', 'fa-book-open', 'fa-graduation-cap', 'fa-pen-fancy', 'fa-paint-roller',
    // Music & Art
    'fa-music', 'fa-guitar', 'fa-palette', 'fa-paint-brush', 'fa-film',
    // Misc
    'fa-gift', 'fa-box-open', 'fa-toolbox', 'fa-screwdriver-wrench', 'fa-seedling',
    'fa-leaf', 'fa-tree', 'fa-globe', 'fa-plane', 'fa-umbrella'
  ];

  // Add Category
  const handleAdd = async () => {
    if (!newCatName.trim()) return;
    const exists = customCats.find((c: Category) => c.name.toLowerCase() === newCatName.trim().toLowerCase());
    if (exists) { setToast('Category already exists!'); return; }
    
    const success = await addCategory(newCatName.trim(), selectedIcon);
    if (success) {
      setNewCatName('');
      setSelectedIcon('fa-tag');
      setShowIconPicker(false);
      setToast('Category added!');
    } else {
      setToast('Failed to add category.');
    }
  };

  // Remove Category
  const handleRemoveCat = async (dbId: string) => {
    const success = await removeCategory(dbId);
    if (success) {
      setToast('Category removed!');
    } else {
      setToast('Failed to remove category.');
    }
  };

  // Add Sub-Category
  const handleAddSub = async (catId: string, catDbId: string) => {
    if (!newSubName.trim()) return;
    const parent = customCats.find((c: Category) => c.id === catId);
    if (!parent) return;
    
    const subExists = (parent.subcategories || []).find((s: SubCategory) => s.name.toLowerCase() === newSubName.trim().toLowerCase());
    if (subExists) { setToast('Sub-category already exists!'); return; }
    
    const success = await addSubCategory(catDbId, newSubName.trim());
    if (success) {
      setNewSubName('');
      setToast('Sub-category added!');
    } else {
      setToast('Failed to add sub-category.');
    }
  };

  // Remove Sub-Category
  const handleRemoveSub = async (subDbId: string) => {
    const success = await removeSubCategory(subDbId);
    if (success) {
      setToast('Sub-category removed!');
    } else {
      setToast('Failed to remove sub-category.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <h3 className="font-black text-gray-900 mb-1">All Categories</h3>
        <p className="text-xs text-gray-400 font-medium mb-5">Manage and add categories with sub-categories</p>
        <div className="flex gap-3 mb-6 relative">
          <button 
            onClick={() => setShowIconPicker(!showIconPicker)}
            className="w-14 h-14 bg-gray-50 border border-gray-200 rounded-2xl flex items-center justify-center hover:bg-gray-100 transition-colors shrink-0"
            title="Select Category Icon"
          >
            <i className={`fas ${selectedIcon} text-xl text-gray-700`}></i>
          </button>
          
          {showIconPicker && (
            <div className="absolute top-16 left-0 w-64 bg-white border border-gray-100 shadow-xl rounded-2xl p-4 z-10 grid grid-cols-5 gap-2">
              {icons.map(icon => (
                <button
                  key={icon}
                  onClick={() => { setSelectedIcon(icon); setShowIconPicker(false); }}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${selectedIcon === icon ? 'bg-brand-50 text-brand-600' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                  <i className={`fas ${icon}`}></i>
                </button>
              ))}
            </div>
          )}

          <input type="text" value={newCatName} onChange={e => setNewCatName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAdd()} placeholder="e.g. Groceries, Automotive, Books..." className="flex-1 bg-gray-50 rounded-2xl px-5 py-4 outline-none font-bold text-sm border-none" />
          <button onClick={handleAdd} className="px-6 py-4 bg-gray-900 text-white rounded-2xl font-black text-sm hover:bg-gray-800 transition-all">+ Add</button>
        </div>
        {customCats.length === 0 && <p className="text-gray-400 font-bold text-sm text-center py-8">No custom categories yet</p>}
        <div className="space-y-3">
          {customCats.map((cat: Category) => (
            <div key={cat.id} className="border border-gray-100 rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between bg-gray-50 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-brand-50 rounded-xl flex items-center justify-center">
                    <i className={`fas ${cat.icon || 'fa-tag'} text-brand-600 text-xs`}></i>
                  </div>
                  <span className="font-black text-gray-900 text-sm">{cat.name}</span>
                  <span className="text-[10px] font-black text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{(cat.subcategories || []).length} subs</span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setExpandedCat(expandedCat === cat.id ? null : cat.id)} className="text-xs font-black text-brand-600 hover:bg-brand-50 px-3 py-2 rounded-xl transition-all">{expandedCat === cat.id ? 'Close ↑' : 'Manage →'}</button>
                  <button onClick={() => handleRemoveCat(cat.dbId!)} className="text-xs font-black text-red-500 hover:bg-red-50 px-3 py-2 rounded-xl transition-all">Remove</button>
                </div>
              </div>
              {expandedCat === cat.id && (
                <div className="px-5 py-4 bg-white">
                  <div className="flex gap-2 mb-3">
                    <input type="text" value={newSubName} onChange={e => setNewSubName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddSub(cat.id, cat.dbId!)} placeholder="Add sub-category..." className="flex-1 bg-gray-50 rounded-xl px-4 py-3 outline-none font-bold text-xs border-none" />
                    <button onClick={() => handleAddSub(cat.id, cat.dbId!)} className="px-4 py-3 bg-gray-900 text-white rounded-xl font-black text-xs hover:bg-gray-800 transition-all">+ Add</button>
                  </div>
                  {(cat.subcategories || []).length === 0 && <p className="text-gray-400 font-bold text-xs text-center py-3">No sub-categories yet</p>}
                  <div className="text-xs text-gray-500 font-medium mb-2">
                    {cat.subcategories?.length || 0} sub-categories
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(cat.subcategories || []).map((sub: SubCategory) => (
                      <span key={sub.id} className="flex items-center gap-2 px-3 py-2 bg-brand-50 text-brand-700 rounded-xl font-black text-xs">
                        {sub.name}
                        <button onClick={() => handleRemoveSub(sub.dbId!)} className="text-red-400 hover:text-red-600 transition-colors ml-1">×</button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CategoryManagementTab;
