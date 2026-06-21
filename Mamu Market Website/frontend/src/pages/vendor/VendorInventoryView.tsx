import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import PageTitle from '../../components/PageTitle';
import { useApp } from '../../context/AppContext';
import { useVendorProducts } from '../../hooks/useProducts';
import { useVendorRequests } from '../../hooks/useVendorRequests';
import { Product } from '../../types';
import { supabase } from '../../lib/supabase';

interface ImageUploadBoxProps {
  field: string;
  label: string;
  inputRef: React.RefObject<HTMLInputElement>;
  form: Record<string, string>;
  handleImageChange: (field: string, file: File | null) => void;
}

const ImageUploadBox: React.FC<ImageUploadBoxProps> = ({ field, label, inputRef, form, handleImageChange }) => (
  <div>
    <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2">{label}</p>
    <div
      onClick={() => inputRef.current?.click()}
      className="w-full h-28 rounded-2xl border-2 border-dashed border-gray-200 hover:border-brand-400 cursor-pointer overflow-hidden flex items-center justify-center bg-gray-50 hover:bg-brand-50 transition-all relative group"
    >
      {form[field] ? (
        <img src={form[field] || 'https://via.placeholder.com/150'} referrerPolicy="no-referrer" className="w-full h-full object-cover" alt={label} />
      ) : (
        <div className="text-center">
          <i className="fas fa-image text-2xl text-gray-300 mb-1"></i>
          <p className="text-[10px] font-black text-gray-400 uppercase">Upload</p>
        </div>
      )}
      {form[field] && (
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
          <i className="fas fa-camera text-white text-xl"></i>
        </div>
      )}
    </div>
    <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={e => handleImageChange(field, e.target.files?.[0] || null)} />
  </div>
);

const VendorInventoryView: React.FC = () => {
  const { user } = useAuth();
  const { setToast } = useApp();
  const navigate = useNavigate();
  const { products: vendorDynamicProducts, loading } = useVendorProducts(user?.id);
  const products = vendorDynamicProducts.filter(p => p.status === 'approved');
  const { requests, submitRequest } = useVendorRequests();

  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const mainImgRef = useRef<HTMLInputElement>(null);
  const extra1Ref = useRef<HTMLInputElement>(null);
  const extra2Ref = useRef<HTMLInputElement>(null);
  const extra3Ref = useRef<HTMLInputElement>(null);

  const openEdit = (p: Product) => {
    setEditingProduct(p);
    setForm({
      productName: p.productName || '',
      price: String(p.price || ''),
      originalPrice: String(p.originalPrice || p.price || ''),
      units: String(p.units || p.stock || 0),
      stockStatus: p.stockStatus || 'in_stock',
      dealType: p.dealType || (p.isSale ? 'flash' : 'none'),
      description: p.description || '',
      warranty: p.shippingReturnPolicy?.match(/Product Warranty:\s*(.*)/)?.[1] || '',
      guarantee: p.shippingReturnPolicy?.match(/Product Guarantee:\s*(.*)/)?.[1] || '',
      returnPolicy: p.shippingReturnPolicy?.match(/Return Policy:\s*(.*)/)?.[1] || '',
      shippingTime: p.shippingReturnPolicy?.match(/Estimated Delivery:\s*(.*)/)?.[1] || '',
      mainImage: p.mainImage || p.image || '',
      extraImage1: p.extraImage1 || p.images?.[0] || '',
      extraImage2: p.extraImage2 || p.images?.[1] || '',
      extraImage3: p.extraImage3 || p.images?.[2] || '',
      color1name: p.colors?.[0]?.name || '',
      color1hex: p.colors?.[0]?.value || '#000000',
      color1image: p.colors?.[0]?.image || '',
      color2name: p.colors?.[1]?.name || '',
      color2hex: p.colors?.[1]?.value || '#000000',
      color2image: p.colors?.[1]?.image || '',
      color3name: p.colors?.[2]?.name || '',
      color3hex: p.colors?.[2]?.value || '#000000',
      color3image: p.colors?.[2]?.image || '',
      color4name: p.colors?.[3]?.name || '',
      color4hex: p.colors?.[3]?.value || '#000000',
      color4image: p.colors?.[3]?.image || '',
    });
  };

  const toBase64 = (file: File): Promise<string> =>
    new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result as string);
      r.onerror = rej;
      r.readAsDataURL(file);
    });

  const handleImageChange = async (field: string, file: File | null) => {
    if (!file) return;
    const b64 = await toBase64(file);
    setForm((prev) => ({ ...prev, [field]: b64 }));
  };

  const handleSave = async () => {
    if (!editingProduct) return;
    try {
      const colors = [];
      for (let n = 1; n <= 4; n++) {
        const name = form[`color${n}name`];
        const image = form[`color${n}image`];
        const hex = form[`color${n}hex`] || '#000000';
        if (name) colors.push({ name, image, hex, value: hex });
      }

      const changes = {
        name: form.productName,
        price: Number(form.price),
        original_price: Number(form.originalPrice),
        units: Number(form.units),
        stock: Number(form.units),
        stock_status: form.stockStatus,
        deal_type: form.dealType,
        description: form.description,
        short_description: form.shortDescription,
        shipping_return_policy: `Product Warranty: ${form.warranty || 'No Warranty'}\nProduct Guarantee: ${form.guarantee || 'No Guarantee'}\nReturn Policy: ${form.returnPolicy || 'No Returns'}\nEstimated Delivery: ${form.shippingTime || 'Standard Delivery'}`,
        image: form.mainImage,
        main_image: form.mainImage,
        images: [form.extraImage1, form.extraImage2, form.extraImage3].filter(Boolean),
        extra_image_1: form.extraImage1,
        extra_image_2: form.extraImage2,
        extra_image_3: form.extraImage3,
        colors: colors,
      };

      const { error } = await supabase.from('product_updates').insert({
        product_id: editingProduct.id,
        vendor_id: editingProduct.vendorId,
        changes: changes,
        status: 'pending'
      });
      
      if (error) throw error;
      setToast('Update submitted successfully for admin approval!');
      setEditingProduct(null);
    } catch(err: any) {
      console.error(err);
      setToast('Failed to update product: ' + err.message);
    }
  };

  const handleRemove = async (p: Product) => {
    const alreadyPending = requests.some(r => r.request_type === 'product_remove' && r.current_value === p.id && r.status === 'pending');
    if (alreadyPending) { setToast('Removal already pending admin approval.'); return; }
    await submitRequest('product_remove', p.id, undefined, 'Vendor requested removal');
    setToast('Removal request submitted. Awaiting admin approval.');
  };


  return (
    <div className="container mx-auto px-4 py-20">
      <PageTitle title="Inventory Management" />
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-gray-900">Inventory Management</h1>
            <p className="text-gray-500 font-medium mt-1 text-sm">{products.length} active products</p>
          </div>
          <button onClick={() => navigate('/dashboard')} className="text-gray-500 font-bold hover:text-gray-900 flex items-center gap-2">
            <i className="fas fa-arrow-left text-sm"></i> Dashboard
          </button>
        </div>

        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left py-4 px-6 text-xs font-black text-gray-400 uppercase tracking-widest">Product</th>
                <th className="text-left py-4 px-6 text-xs font-black text-gray-400 uppercase tracking-widest">Price</th>
                <th className="text-left py-4 px-6 text-xs font-black text-gray-400 uppercase tracking-widest">Stock</th>
                <th className="text-left py-4 px-6 text-xs font-black text-gray-400 uppercase tracking-widest">Deal</th>
                <th className="text-right py-4 px-6 text-xs font-black text-gray-400 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-4">
                      <img src={p.image || 'https://via.placeholder.com/150?text=Product'} referrerPolicy="no-referrer" className="w-12 h-12 rounded-xl object-cover bg-gray-100" alt={p.name} />
                      <div>
                        <p className="font-black text-gray-900 text-sm">{p.name}</p>
                        <p className="text-xs text-gray-400 font-medium">{p.category}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <p className="font-bold text-gray-900">৳{p.price}</p>
                    {p.originalPrice && Number(p.originalPrice) > Number(p.price) && (
                      <p className="text-xs text-gray-400 line-through">৳{p.originalPrice}</p>
                    )}
                  </td>
                  <td className="py-4 px-6">
                    <span className={`font-bold text-sm ${Number(p.units) < 10 ? 'text-red-500' : 'text-gray-900'}`}>
                      {p.units || 0} units
                      {Number(p.units) < 10 && <span className="ml-1 text-[9px] bg-red-50 text-red-500 px-1.5 py-0.5 rounded-full font-black uppercase">Low</span>}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-full ${
                      p.dealType === 'weekly' ? 'bg-indigo-50 text-indigo-600' :
                      p.dealType === 'monthly' ? 'bg-emerald-50 text-emerald-600' :
                      (p.isSale || p.dealType === 'flash') ? 'bg-amber-50 text-amber-600' :
                      'bg-gray-100 text-gray-400'
                    }`}>
                      {p.dealType === 'weekly' ? 'Weekly' : p.dealType === 'monthly' ? 'Monthly' : (p.isSale || p.dealType === 'flash') ? 'Flash' : 'No Deal'}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openEdit(p)} className="px-3 py-1.5 bg-brand-600 text-white rounded-xl font-black text-xs hover:opacity-90 transition-all">
                        <i className="fas fa-pencil-alt mr-1"></i>Edit
                      </button>
                      <button onClick={() => handleRemove(p)} className="px-3 py-1.5 bg-red-50 text-red-500 rounded-xl font-black text-xs hover:bg-red-100 transition-all">
                        <i className="fas fa-trash mr-1"></i>Request Removal
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {products.length === 0 && (
            <div className="p-16 text-center">
              <i className="fas fa-box-open text-4xl text-gray-200 mb-4 block"></i>
              <p className="text-gray-400 font-bold">No active products found</p>
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editingProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setEditingProduct(null)}>
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-8">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-black text-gray-900">Edit Product</h2>
                <button onClick={() => setEditingProduct(null)} className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-all">
                  <i className="fas fa-times text-gray-600"></i>
                </button>
              </div>

              {/* Instant section */}
              <div className="bg-emerald-50 rounded-2xl p-5 mb-6">
                <p className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <i className="fas fa-bolt"></i> Instant — saves immediately
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2 block">Stock / Units</label>
                    <input
                      type="number"
                      value={form.units}
                      onChange={e => setForm({ ...form, units: e.target.value })}
                      className="w-full bg-white border-2 border-gray-100 rounded-xl px-4 py-3 font-bold outline-none focus:border-emerald-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2 block">Deal Type</label>
                    <select
                      value={form.dealType}
                      onChange={e => setForm({ ...form, dealType: e.target.value })}
                      className="w-full bg-white border-2 border-gray-100 rounded-xl px-4 py-3 font-bold outline-none focus:border-emerald-400"
                    >
                      <option value="none">No Deal</option>
                      <option value="flash">Flash / Daily</option>
                      <option value="weekly">Weekly Deal</option>
                      <option value="monthly">Monthly Deal</option>
                    </select>
                  </div>
                </div>
                <div className="mt-4">
                  <label className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2 block">Stock Status</label>
                  <select
                    value={form.stockStatus}
                    onChange={e => setForm({ ...form, stockStatus: e.target.value })}
                    className="w-full bg-white border-2 border-gray-100 rounded-xl px-4 py-3 font-bold outline-none focus:border-emerald-400"
                  >
                    <option value="in_stock">In Stock</option>
                    <option value="out_of_stock">Out of Stock</option>
                    <option value="discontinued">Discontinued</option>
                  </select>
                </div>
              </div>

              {/* Approval section */}
              <div className="bg-amber-50 rounded-2xl p-5 mb-6">
                <p className="text-xs font-black text-amber-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <i className="fas fa-clock"></i> Needs admin approval
                </p>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2 block">Product Name</label>
                    <input
                      type="text"
                      value={form.productName}
                      onChange={e => setForm({ ...form, productName: e.target.value })}
                      className="w-full bg-white border-2 border-gray-100 rounded-xl px-4 py-3 font-bold outline-none focus:border-amber-400"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2 block">Sale Price (৳)</label>
                      <input
                        type="number"
                        value={form.price}
                        onChange={e => setForm({ ...form, price: e.target.value })}
                        className="w-full bg-white border-2 border-gray-100 rounded-xl px-4 py-3 font-bold outline-none focus:border-amber-400"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2 block">Original Price (৳)</label>
                      <input
                        type="number"
                        value={form.originalPrice}
                        onChange={e => setForm({ ...form, originalPrice: e.target.value })}
                        className="w-full bg-white border-2 border-gray-100 rounded-xl px-4 py-3 font-bold outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2 block">Short Description</label>
                    <textarea
                      value={form.shortDescription}
                      onChange={e => setForm({ ...form, shortDescription: e.target.value })}
                      className="w-full bg-white border-2 border-gray-100 rounded-xl px-4 py-3 font-bold outline-none focus:border-amber-400 resize-none"
                      rows={2}
                      placeholder="Brief summary for product card"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2 block">Detailed Description</label>
                    <textarea
                      value={form.description}
                      onChange={e => setForm({ ...form, description: e.target.value })}
                      className="w-full bg-white border-2 border-gray-100 rounded-xl px-4 py-3 font-bold outline-none focus:border-amber-400 resize-none"
                      rows={4}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2 block">Warranty</label>
                      <div className="flex shadow-sm rounded-xl overflow-hidden border-2 border-gray-100 focus-within:border-brand-400 transition-all">
                        <span className="inline-flex items-center px-4 bg-gray-50 text-gray-500 text-xs font-black border-r border-gray-100">Warranty:</span>
                        <input
                          type="text"
                          value={form.warranty || ''}
                          onChange={e => setForm({ ...form, warranty: e.target.value })}
                          className="w-full bg-white px-4 py-3 font-bold outline-none text-sm"
                          placeholder="e.g. 1 Year"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2 block">Guarantee</label>
                      <div className="flex shadow-sm rounded-xl overflow-hidden border-2 border-gray-100 focus-within:border-brand-400 transition-all">
                        <span className="inline-flex items-center px-4 bg-gray-50 text-gray-500 text-xs font-black border-r border-gray-100">Guarantee:</span>
                        <input
                          type="text"
                          value={form.guarantee || ''}
                          onChange={e => setForm({ ...form, guarantee: e.target.value })}
                          className="w-full bg-white px-4 py-3 font-bold outline-none text-sm"
                          placeholder="e.g. 100% Authentic"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2 block">Return Policy</label>
                      <div className="flex shadow-sm rounded-xl overflow-hidden border-2 border-gray-100 focus-within:border-brand-400 transition-all">
                        <span className="inline-flex items-center px-4 bg-gray-50 text-gray-500 text-xs font-black border-r border-gray-100">Returns:</span>
                        <input
                          type="text"
                          value={form.returnPolicy || ''}
                          onChange={e => setForm({ ...form, returnPolicy: e.target.value })}
                          className="w-full bg-white px-4 py-3 font-bold outline-none text-sm"
                          placeholder="e.g. 7 Days Free"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2 block">Delivery Time</label>
                      <div className="flex shadow-sm rounded-xl overflow-hidden border-2 border-gray-100 focus-within:border-brand-400 transition-all">
                        <span className="inline-flex items-center px-4 bg-gray-50 text-gray-500 text-xs font-black border-r border-gray-100">Delivery:</span>
                        <input
                          type="text"
                          value={form.shippingTime || ''}
                          onChange={e => setForm({ ...form, shippingTime: e.target.value })}
                          className="w-full bg-white px-4 py-3 font-bold outline-none text-sm"
                          placeholder="e.g. 3-5 Days"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Images */}
                  <div>
                    <label className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3 block">Images</label>
                    <div className="grid grid-cols-4 gap-3">
                      <ImageUploadBox field="mainImage" label="Main" inputRef={mainImgRef} form={form} handleImageChange={handleImageChange} />
                      <ImageUploadBox field="extraImage1" label="Extra 1" inputRef={extra1Ref} form={form} handleImageChange={handleImageChange} />
                      <ImageUploadBox field="extraImage2" label="Extra 2" inputRef={extra2Ref} form={form} handleImageChange={handleImageChange} />
                      <ImageUploadBox field="extraImage3" label="Extra 3" inputRef={extra3Ref} form={form} handleImageChange={handleImageChange} />
                    </div>
                  </div>

                  {/* Color Variants */}
                  <div>
                    <label className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3 block">Color Variants <span className="normal-case font-medium opacity-50">(optional)</span></label>
                    <div className="space-y-3">
                      {[1, 2, 3, 4].map(n => (
                        <div key={n} className="grid grid-cols-1 gap-2 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                          <div className="flex gap-3 items-center">
                            <div className="relative">
                              <input
                                type="color"
                                value={form[`color${n}hex`] || '#000000'}
                                onChange={e => setForm({ ...form, [`color${n}hex`]: e.target.value })}
                                className="w-12 h-12 rounded-xl border-2 border-gray-200 cursor-pointer p-0.5 bg-white"
                                title="Pick color"
                              />
                            </div>
                            <input
                              type="text"
                              placeholder={`Color ${n} Name (e.g. Sky Blue)`}
                              value={form[`color${n}name`] || ''}
                              onChange={e => setForm({ ...form, [`color${n}name`]: e.target.value })}
                              className="w-full bg-white border-2 border-gray-100 rounded-xl px-4 py-3 font-bold outline-none focus:border-amber-400 text-sm flex-1"
                            />
                            <input
                              type="text"
                              value={form[`color${n}hex`] || '#000000'}
                              onChange={e => setForm({ ...form, [`color${n}hex`]: e.target.value })}
                              className="w-24 bg-white rounded-2xl px-3 py-3 outline-none font-mono text-sm border-2 border-gray-100 text-center"
                              placeholder="#000000"
                            />
                          </div>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="Color image URL or upload →"
                              value={form[`color${n}image`] || ''}
                              onChange={e => setForm({ ...form, [`color${n}image`]: e.target.value })}
                              className="w-full bg-white border-2 border-gray-100 rounded-xl px-4 py-3 font-bold outline-none focus:border-amber-400 text-sm flex-1"
                            />
                            <label className="px-3 bg-white border-2 border-gray-100 rounded-2xl hover:bg-gray-50 transition-all text-gray-600 flex items-center justify-center cursor-pointer">
                              <i className="fas fa-upload text-sm"></i>
                              <input type="file" className="hidden" accept="image/*" onChange={e => handleImageChange(`color${n}image`, e.target.files?.[0] || null)} />
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={handleSave} className="flex-1 py-4 rounded-2xl gradient-primary text-white font-black text-sm shadow-lg shadow-brand-500/20 hover:opacity-90 transition-all">
                  Save Changes
                </button>
                <button onClick={() => setEditingProduct(null)} className="px-6 py-4 rounded-2xl bg-gray-100 text-gray-600 font-black text-sm hover:bg-gray-200 transition-all">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorInventoryView;
