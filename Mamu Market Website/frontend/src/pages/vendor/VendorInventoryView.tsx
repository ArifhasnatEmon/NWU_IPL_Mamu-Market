import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import PageTitle from '../../components/PageTitle';
import { useApp } from '../../context/AppContext';
import { useVendorProducts } from '../../hooks/useProducts';
import { useVendorRequests } from '../../hooks/useVendorRequests';
import { Product } from '../../types';
import { supabase } from '../../lib/supabase';



const VendorInventoryView: React.FC = () => {
  const { user } = useAuth();
  const { setToast } = useApp();
  const navigate = useNavigate();
  const { products: vendorDynamicProducts, loading } = useVendorProducts(user?.id);
  const products = vendorDynamicProducts.filter(p => p.status === 'approved');
  const { requests, submitRequest } = useVendorRequests();

  const openEdit = (p: Product) => {
    navigate('/dashboard/edit-product/' + p.id);
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

    </div>
  );
};

export default VendorInventoryView;
