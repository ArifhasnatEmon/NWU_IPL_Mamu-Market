import React from 'react';

import { useApprovedProducts } from '../../hooks/useProducts';
import { useVendorRequests } from '../../hooks/useVendorRequests';
import { supabase } from '../../lib/supabase';
import { Product, User, VendorRequest, ProductUpdate, AdminDashboardData } from '../../types';

interface ApprovalsPanelProps {
  activeTab: string;
  data: AdminDashboardData;
  setToast: (msg: string) => void;
  refreshData: () => void;
  handleAccountDeleteRequest: (reqId: string, userId: string, approve: boolean) => void;
  handleVendorAction: (userId: string, status: 'approved' | 'rejected') => void;
  handleVerificationRequest: (reqId: string, approve: boolean) => void;
  handleProductApproval: (productId: string, approve: boolean, reason?: string) => void;
  handleRemoveRequest: (requestId: string, approve: boolean) => void;
  handleUpdateApproval: (updateId: string, approve: boolean) => void;
  handleCategoryRequest: (reqId: string, approve: boolean) => void;
  handleCategorySuggestion: (reqId: string, approve: boolean) => void;
  handleStoreNameRequest: (reqId: string, approve: boolean) => void;
}

const ApprovalsPanel: React.FC<ApprovalsPanelProps> = ({ 
  activeTab, data, setToast, refreshData,
  handleAccountDeleteRequest, handleVendorAction, handleVerificationRequest,
  handleProductApproval, handleRemoveRequest, handleUpdateApproval, handleCategoryRequest, handleCategorySuggestion, handleStoreNameRequest
}) => {
  const { products: approvedProducts } = useApprovedProducts();
  const [rejectModal, setRejectModal] = React.useState(false);
  const [rejectTarget, setRejectTarget] = React.useState<Product | null>(null);
  const [rejectReason, setRejectReason] = React.useState('');
  const [customRejectReason, setCustomRejectReason] = React.useState('');
  const [processingId, setProcessingId] = React.useState<string | null>(null);
  const { requests, updateRequestStatus } = useVendorRequests();

  const onApproveProduct = async (pId: string) => {
    if (processingId) return;
    setProcessingId(pId);
    await handleProductApproval(pId, true);
    setProcessingId(null);
  };

  return (
    <>
          {activeTab === 'Account Requests' && (
            <div>
              {data.accountDeleteRequests?.length > 0 ? (
                data.accountDeleteRequests.map((r: VendorRequest) => (
                  <div key={r.id} className="bg-white rounded-2xl border border-gray-100 p-6 mb-4 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-black text-gray-900">{r.vendor_name}</h3>
                        <p className="text-gray-400 text-sm font-medium">{r.current_value || ''}</p>
                        <span className={`inline-block mt-2 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider bg-brand-100 text-brand-600`}>
                          {'Vendor'}
                        </span>
                      </div>
                      <span className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">Deletion Requested</span>
                    </div>
                    <div className="flex gap-3">
                      <button 
                        onClick={() => handleAccountDeleteRequest(r.id, r.vendor_id, true)}
                        className="bg-red-500 text-white rounded-xl px-4 py-2 text-xs font-black hover:bg-red-600 transition-colors"
                      >
                        🗑 Confirm Delete
                      </button>
                      <button 
                        onClick={() => handleAccountDeleteRequest(r.id, r.vendor_id, false)}
                        className="bg-gray-100 text-gray-600 rounded-xl px-4 py-2 text-xs font-black hover:bg-gray-200 transition-colors"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-400 text-center py-20 font-bold">No account deletion requests</p>
              )}
            </div>
          )}

          {activeTab === 'Vendor Approvals' && (
            <div>
              {data.users.filter((u: User) => u.role === 'vendor' && u.status === 'pending').length > 0 ? (
                data.users.filter((u: User) => u.role === 'vendor' && u.status === 'pending').map((v: User) => (
                  <div key={v.id} className="bg-white rounded-2xl border border-gray-100 p-6 mb-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-black text-lg text-gray-900">{v.name}</h3>
                        <p className="text-gray-400 text-sm font-medium">{v.email}</p>
                      </div>
                      <span className="bg-yellow-100 text-yellow-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">Pending</span>
                    </div>

                    {/* Full application details */}
                    <div className="bg-gray-50 rounded-2xl p-4 mb-4 space-y-3 border border-gray-100">
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Application Details</p>

                      {v.storeName && (
                        <div className="flex items-center gap-3">
                          <i className="fas fa-store text-gray-300 w-4 text-center text-sm"></i>
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Store Name</p>
                            <p className="text-sm font-bold text-gray-900">{v.storeName}</p>
                          </div>
                        </div>
                      )}

                      {v.phone && (
                        <div className="flex items-center gap-3">
                          <i className="fas fa-phone text-gray-300 w-4 text-center text-sm"></i>
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Phone</p>
                            <p className="text-sm font-bold text-gray-900">{v.phone}</p>
                          </div>
                        </div>
                      )}

                      {v.storeCity && (
                        <div className="flex items-center gap-3">
                          <i className="fas fa-map-marker-alt text-gray-300 w-4 text-center text-sm"></i>
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">City</p>
                            <p className="text-sm font-bold text-gray-900">{v.storeCity}</p>
                          </div>
                        </div>
                      )}

                      {v.storeCategory && (
                        <div className="flex items-start gap-3">
                          <i className="fas fa-tags text-gray-300 w-4 text-center text-sm mt-0.5"></i>
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Requested Categories</p>
                            <div className="flex gap-1 flex-wrap">
                              {v.storeCategory.split(',').map((cat: string) => cat.trim()).filter(Boolean).map((cat: string) => (
                                <span key={cat} className="text-xs font-black bg-brand-50 text-brand-600 px-2 py-0.5 rounded-full">{cat}</span>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {v.storeDescription && (
                        <div className="flex items-start gap-3">
                          <i className="fas fa-align-left text-gray-300 w-4 text-center text-sm mt-0.5"></i>
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Store Description</p>
                            <p className="text-sm text-gray-600 font-medium leading-relaxed">{v.storeDescription}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-3">
                      <button 
                        onClick={() => handleVendorAction(v.id, 'approved')}
                        className="bg-emerald-500 text-white rounded-xl px-4 py-2 text-xs font-black hover:bg-emerald-600 transition-colors"
                      >
                        Approve
                      </button>
                      <button 
                        onClick={() => handleVendorAction(v.id, 'rejected')}
                        className="bg-red-500 text-white rounded-xl px-4 py-2 text-xs font-black hover:bg-red-600 transition-colors"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-400 text-center py-20 font-bold">No pending vendor applications</p>
              )}
            </div>
          )}

          {activeTab === 'Verification Requests' && (
            <div>
              {data.verificationRequests?.length > 0 ? (
                data.verificationRequests.map((r: VendorRequest) => (
                  <div key={r.id} className="bg-white rounded-2xl border border-gray-100 p-6 mb-4 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-black text-gray-900">{r.vendor_name}</h3>
                        <p className="text-gray-400 text-sm font-medium">NID / License: <span className="text-gray-900 font-bold">{r.current_value || 'Not Provided'}</span></p>
                        <p className="text-gray-300 text-xs font-bold mt-1">{new Date(r.created_at).toLocaleDateString()}</p>
                      </div>
                      <span className="bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">Verification Request</span>
                    </div>
                    <div className="flex gap-3">
                      <button 
                        onClick={() => handleVerificationRequest(r.id, true)}
                        className="bg-emerald-500 text-white rounded-xl px-4 py-2 text-xs font-black hover:bg-emerald-600 transition-colors"
                      >
                        Approve & Verify
                      </button>
                      <button 
                        onClick={() => handleVerificationRequest(r.id, false)}
                        className="bg-red-500 text-white rounded-xl px-4 py-2 text-xs font-black hover:bg-red-600 transition-colors"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-400 text-center py-20 font-bold">No pending verification requests</p>
              )}
            </div>
          )}

          {activeTab === 'Product Approvals' && (
            <div className="space-y-8">
              <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-8">
                <h3 className="font-black text-gray-900 mb-1">New Products</h3>
                <p className="text-xs text-gray-400 font-medium mb-6">Review and approve new product listings</p>
                {data.pendingProducts.filter((p: Product) => p.status !== 'rejected').length > 0 ? (
                  <div className="space-y-4">
                    {data.pendingProducts.filter((p: Product) => p.status !== 'rejected').map((p: Product) => (
                      <div key={p.id} className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="font-black text-gray-900 mb-1">{p.productName}</h3>
                            {(() => {
                              const vendors = data.users || [];
                              const vendor = vendors.find((v: User) => v.id === p.vendorId);
                              return (
                                <>
                                <div className="flex gap-2 mb-4 flex-wrap">
                                  {vendor && <span className="text-xs font-black text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">{vendor.storeName || vendor.name}</span>}
                                  {p.category && <span className="text-xs font-black text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{p.category}{p.subcategory ? ` › ${p.subcategory}` : ''}</span>}
                                  {(p.dealType && p.dealType !== 'none') && (
                                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                                      p.dealType === 'weekly' ? 'bg-indigo-50 text-indigo-600' :
                                      p.dealType === 'monthly' ? 'bg-emerald-50 text-emerald-600' :
                                      'bg-amber-50 text-amber-600'
                                    }`}>
                                      {p.dealType === 'weekly' ? '📅 Weekly Deal' :
                                       p.dealType === 'monthly' ? '🗓️ Monthly Deal' :
                                       '⚡ Flash/Daily Deal'}
                                    </span>
                                  )}
                                  {p.isSale && (!p.dealType || p.dealType === 'none') && (
                                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">⚡ Flash/Daily Deal</span>
                                  )}
                                </div>
                                </>
                              );
                            })()}
                          </div>
                          <div className="text-right">
                            <p className="font-black text-gray-900">৳{p.price}</p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase">{p.units} Units</p>
                          </div>
                        </div>

                        {/* Product Images Preview */}
                        {(p.mainImage || p.extraImage1 || p.extraImage2 || p.extraImage3) && (
                          <div className="mb-4">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Product Images</p>
                            <div className="flex gap-2 flex-wrap">
                              {[p.mainImage, p.extraImage1, p.extraImage2, p.extraImage3].filter(Boolean).map((img: string, idx: number) => (
                                <div key={idx} className="relative">
                                  <img
                                    src={img}
                                    alt={`Image ${idx + 1}`}
                                    className="w-20 h-20 rounded-xl object-cover border border-gray-200"
                                  />
                                  {idx === 0 && (
                                    <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[8px] font-black px-1 rounded">MAIN</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Color Variants Preview */}
                        {Array.isArray(p.colors) && p.colors.length > 0 && (
                          <div className="mb-4">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Color Variants ({p.colors.length})</p>
                            <div className="flex gap-3 flex-wrap">
                              {p.colors.map((c, idx: number) => (
                                <div key={idx} className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 border border-gray-200 shadow-sm">
                                  <span
                                    className="w-5 h-5 rounded-full border border-gray-300 shrink-0"
                                    style={{ backgroundColor: c.value || '#ccc' }}
                                  />
                                  <span className="text-xs font-bold text-gray-700">{c.name}</span>
                                  {c.image && (
                                    <img src={c.image} alt={c.name} className="w-8 h-8 rounded-lg object-cover border border-gray-200" />
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Description */}
                        {p.description && (
                          <div className="mb-4">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Description</p>
                            <p className="text-xs text-gray-500 font-medium leading-relaxed line-clamp-3">{p.description}</p>
                          </div>
                        )}

                        <div className="flex gap-3">
                          <button 
                            onClick={() => onApproveProduct(p.id)}
                            disabled={processingId === p.id}
                            className="bg-emerald-500 text-white rounded-xl px-4 py-2 text-xs font-black hover:bg-emerald-600 disabled:opacity-50 transition-colors flex items-center gap-2"
                          >
                            {processingId === p.id ? <i className="fas fa-spinner fa-spin"></i> : null}
                            Approve
                          </button>
                          <button 
                            onClick={() => { setRejectTarget(p); setRejectModal(true); setRejectReason(''); setCustomRejectReason(''); }}
                            disabled={!!processingId}
                            className="bg-red-50 text-red-500 rounded-xl px-4 py-2 text-xs font-black hover:bg-red-100 disabled:opacity-50 transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 font-bold text-sm italic py-8 text-center">No pending product requests</p>
                )}
              </div>

              <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-8">
                <h3 className="font-black text-gray-900 mb-1">Update Requests</h3>
                <p className="text-xs text-gray-400 font-medium mb-6">Review vendor requests to update existing products</p>
                {(() => {
                  interface UpdateGroup {
                    productId: string;
                    productName: string;
                    changes: ProductUpdate[];
                  }
                  const updates = data.pendingUpdates || [];
                  const grouped: Record<string, UpdateGroup> = {};
                  updates.forEach((u: ProductUpdate) => {
                    const approved = approvedProducts;
                    const prod = approved.find((p: Product) => p.id === u.productId);
                    if (!grouped[u.productId!]) {
                      grouped[u.productId!] = { 
                        productId: u.productId!, 
                        productName: prod?.name || 'Unknown Product', 
                        changes: [] 
                      };
                    }
                    grouped[u.productId!].changes.push(u);
                  });

                  if (Object.keys(grouped).length === 0) return <p className="text-gray-400 font-bold text-sm italic py-8 text-center">No pending update requests</p>;

                  return (
                    <div className="space-y-4">
                      {Object.values(grouped).map((group: UpdateGroup) => (
                        <div key={group.productId} className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                          <h3 className="font-black text-gray-900 mb-1">{group.productName}</h3>
                          {(() => {
                            const approved = approvedProducts;
                            const prod = approved.find((p: Product) => p.id === group.productId);
                            const vendors = data.users || [];
                            const vendor = vendors.find((v: User) => v.id === prod?.vendorId);
                            return (
                              <>
                              <div className="flex gap-2 mb-4">
                                {vendor && <span className="text-xs font-black text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">{vendor.storeName || vendor.name}</span>}
                                {prod?.category && <span className="text-xs font-black text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{prod.category}</span>}
                              </div>
                              </>
                            );
                          })()}
                          <div className="flex gap-1 mb-3">
                            <span className="text-xs font-bold text-gray-400">({group.changes.length} update request)</span>
                          </div>
                          <div className="space-y-3">
                            {group.changes.map((c: ProductUpdate) => (
                              <div key={c.id} className="bg-white rounded-xl px-4 py-3 border border-gray-100 shadow-sm">
                                <div className="flex items-center gap-3">
                                  <span className="font-black text-brand-600 uppercase text-xs w-28 shrink-0">Updates</span>
                                  <div className="flex-1 text-sm text-gray-600 flex flex-col gap-1">
                                    {c.changes && Object.entries(c.changes).map(([k, v]) => (
                                      <div key={k} className="flex gap-2 truncate text-xs">
                                        <span className="font-bold text-gray-900">{k}:</span>
                                        <span className="text-green-600 font-medium">{String(v).substring(0, 50)}</span>
                                      </div>
                                    ))}
                                  </div>
                                  <div className="flex gap-2 ml-auto shrink-0">
                                    <button onClick={() => handleUpdateApproval(c.id, true)} className="px-3 py-1 bg-green-500 text-white rounded-lg font-black text-xs hover:bg-green-600">
                                      ✓
                                    </button>
                                    <button onClick={() => handleUpdateApproval(c.id, false)} className="px-3 py-1 bg-red-50 text-red-500 rounded-lg font-black text-xs hover:bg-red-100">
                                      ✗
                                    </button>
                                  </div>
                                </div>
                                {c.reason && c.reason !== 'No reason provided' && (
                                  <p className="text-xs text-gray-500 font-medium mt-2">
                                    <i className="fas fa-comment-alt mr-1 text-gray-300"></i>
                                    {c.reason}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {activeTab === 'Remove Requests' && (
            <div>
              {data.removeRequests.length > 0 ? (
                data.removeRequests.map((r: VendorRequest) => (
                  <div key={r.id} className="bg-white rounded-2xl border border-gray-100 p-6 mb-4 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-black text-gray-900 text-lg">{r.requested_value || r.current_value || 'Product'}</h3>
                        <p className="text-gray-400 text-sm font-medium">Vendor: <span className="text-gray-700 font-bold">{r.vendor_name}</span></p>
                        <p className="text-gray-300 text-[10px] font-mono mt-1">ID: {r.current_value}</p>
                        {r.reason && (
                          <p className="text-gray-500 text-sm font-medium mt-3 bg-gray-50 rounded-xl px-3 py-2 border border-gray-100">
                            💬 "{r.reason}"
                          </p>
                        )}
                        {r.created_at && (
                          <p className="text-gray-400 text-xs font-bold mt-2">{new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                        )}
                      </div>
                      <span className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0">Product Removal</span>
                    </div>
                    <div className="flex gap-3">
                      <button 
                        onClick={() => handleRemoveRequest(r.id, true)}
                        className="bg-emerald-500 text-white rounded-xl px-4 py-2 text-xs font-black hover:bg-emerald-600 transition-colors"
                      >
                        Approve & Delete Product
                      </button>
                      <button 
                        onClick={() => handleRemoveRequest(r.id, false)}
                        className="bg-red-50 text-red-500 rounded-xl px-4 py-2 text-xs font-black hover:bg-red-100 transition-colors"
                      >
                        Deny
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-400 text-center py-20 font-bold">No removal requests</p>
              )}
            </div>
          )}

          {activeTab === 'Store Requests' && (
            <div className="space-y-8">
              <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-8">
                <h3 className="font-black text-gray-900 mb-1">Category Requests</h3>
                <p className="text-xs text-gray-400 font-medium mb-6">Vendors requesting to add an existing platform category to their store</p>
                {data.categoryRequests?.length > 0 ? (
                  <div className="space-y-4">
                    {data.categoryRequests.map((r: VendorRequest) => (
                      <div key={r.id} className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="font-black text-gray-900">{r.vendor_name}</h3>
                            <p className="text-gray-400 text-sm font-medium">Wants to add: <span className="text-brand-600 font-bold">{r.requested_value || ''}</span></p>
                            {r.reason && (
                              <p className="text-gray-500 text-sm font-medium mt-1 bg-white rounded-xl px-3 py-2 border border-gray-100 shadow-sm">
                                💬 "{r.reason}"
                              </p>
                            )}
                            {r.created_at && (
                              <p className="text-gray-400 text-xs font-bold mt-1">{new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                            )}
                          </div>
                          <span className="bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">Add to Store</span>
                        </div>
                        <div className="flex gap-3">
                          <button 
                            onClick={() => { handleCategoryRequest(r.id, true); }}
                            className="bg-emerald-500 text-white rounded-xl px-4 py-2 text-xs font-black hover:bg-emerald-600 transition-colors"
                          >
                            Approve & Add Category
                          </button>
                          <button 
                            onClick={() => { handleCategoryRequest(r.id, false); }}
                            className="bg-red-50 text-red-500 rounded-xl px-4 py-2 text-xs font-black hover:bg-red-100 transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 font-bold text-sm italic py-8 text-center">No pending category requests</p>
                )}
              </div>

              <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-8">
                <h3 className="font-black text-gray-900 mb-1">Category Suggestions</h3>
                <p className="text-xs text-gray-400 font-medium mb-6">Vendors suggesting new categories for the platform. Acknowledging will add it to Category Management.</p>
                {data.categorySuggestions?.length > 0 ? (
                  <div className="space-y-4">
                    {data.categorySuggestions.map((r: VendorRequest) => (
                      <div key={r.id} className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="font-black text-gray-900">{r.vendor_name}</h3>
                            <p className="text-gray-400 text-sm font-medium">Suggested Category: <span className="text-purple-600 font-bold">{r.requested_value || ''}</span></p>
                            {r.reason && (
                              <p className="text-gray-500 text-sm font-medium mt-1 bg-white rounded-xl px-3 py-2 border border-gray-100 shadow-sm">
                                💬 "{r.reason}"
                              </p>
                            )}
                            {r.created_at && (
                              <p className="text-gray-400 text-xs font-bold mt-1">{new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                            )}
                          </div>
                          <span className="bg-purple-100 text-purple-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">New Idea</span>
                        </div>
                        <div className="flex gap-3">
                          <button 
                            onClick={() => { handleCategorySuggestion(r.id, true); }}
                            className="bg-purple-500 text-white rounded-xl px-4 py-2 text-xs font-black hover:bg-purple-600 transition-colors"
                          >
                            Acknowledge & Add to Platform
                          </button>
                          <button 
                            onClick={() => { handleCategorySuggestion(r.id, false); }}
                            className="bg-red-50 text-red-500 rounded-xl px-4 py-2 text-xs font-black hover:bg-red-100 transition-colors"
                          >
                            Dismiss
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 font-bold text-sm italic py-8 text-center">No pending category suggestions</p>
                )}
              </div>

              <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-8">
                <h3 className="font-black text-gray-900 mb-1">Store Name Requests</h3>
                <p className="text-xs text-gray-400 font-medium mb-6">Review vendor requests to change their store name</p>
                {data.storeNameRequests?.length > 0 ? (
                  <div className="space-y-4">
                    {data.storeNameRequests.map((r: VendorRequest) => (
                      <div key={r.id} className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="font-black text-gray-900">{r.vendor_name}</h3>
                            <div className="mt-2 text-sm font-medium text-gray-500">
                              Current: <span className="text-gray-400">{r.current_value || ''}</span> → New: <span className="text-brand-600 font-bold">{r.requested_value || ''}</span>
                            </div>
                            {r.created_at && (
                              <p className="text-gray-400 text-xs font-bold mt-1">{new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                            )}
                          </div>
                          <span className="bg-yellow-100 text-yellow-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">Pending</span>
                        </div>
                        <div className="flex gap-3">
                          <button 
                            onClick={() => { handleStoreNameRequest(r.id, true); }}
                            className="bg-emerald-500 text-white rounded-xl px-4 py-2 text-xs font-black hover:bg-emerald-600 transition-colors"
                          >
                            Approve
                          </button>
                          <button 
                            onClick={() => { handleStoreNameRequest(r.id, false); }}
                            className="bg-red-50 text-red-500 rounded-xl px-4 py-2 text-xs font-black hover:bg-red-100 transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 font-bold text-sm italic py-8 text-center">No pending name change requests</p>
                )}
              </div>

              {(() => {
                const cityRequests = requests.filter(r => r.request_type === 'city_change' && r.status === 'pending');
                if (cityRequests.length === 0) return null;
                return (
                  <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-8">
                    <h3 className="font-black text-gray-900 mb-1">Location Change Requests</h3>
                    <p className="text-xs text-gray-400 font-medium mb-6">Review vendor requests to change their store city</p>
                    <div className="space-y-4">
                      {cityRequests.map((r: VendorRequest) => (
                        <div key={r.id} className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                          <p className="font-black text-gray-900">{r.vendor_name}</p>
                          <p className="text-sm text-gray-500">New city: <span className="font-black text-brand-600">{r.requested_value}</span></p>
                          <p className="text-xs text-gray-400 mt-1">Reason: {r.reason}</p>
                          <div className="flex gap-3 mt-4">
                            <button onClick={async () => {
                              await updateRequestStatus(r.id, 'approved');
                              
                              refreshData();
                            }} className="px-4 py-2 bg-emerald-500 text-white rounded-xl font-black text-xs hover:bg-emerald-600">Approve</button>
                            <button onClick={async () => {
                              await updateRequestStatus(r.id, 'rejected');
                              
                              refreshData();
                            }} className="px-4 py-2 bg-red-50 text-red-500 rounded-xl font-black text-xs hover:bg-red-100">Reject</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {(() => {
                const removeRequests = requests.filter(r => r.request_type === 'category_remove' && r.status === 'pending');
                if (removeRequests.length === 0) return null;
                return (
                  <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-8">
                    <h3 className="font-black text-gray-900 mb-1">Category Removal Requests</h3>
                    <p className="text-xs text-gray-400 font-medium mb-6">Review vendor requests to remove categories from their store</p>
                    <div className="space-y-4">
                      {removeRequests.map((r: VendorRequest) => (
                        <div key={r.id} className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                          <p className="font-black text-gray-900">{r.vendor_name}</p>
                          <p className="text-sm text-gray-500 font-medium">Wants to remove: <span className="font-black text-red-500">{r.current_value}</span></p>
                          <p className="text-xs text-gray-400 mt-1">Reason: {r.reason}</p>
                          <div className="flex gap-3 mt-4">
                            <button onClick={async () => {
                              // Actually remove the category from the vendor's profile
                              const { data: vendorProfile } = await supabase
                                .from('profiles')
                                .select('store_category')
                                .eq('id', r.vendor_id)
                                .single();
                              if (vendorProfile) {
                                const currentCats = (vendorProfile.store_category || '')
                                  .split(',')
                                  .map((c: string) => c.trim())
                                  .filter(Boolean)
                                  .filter((c: string) => c.toLowerCase() !== (r.current_value || '').trim().toLowerCase());
                                await supabase
                                  .from('profiles')
                                  .update({ store_category: currentCats.join(', ') })
                                  .eq('id', r.vendor_id);
                              }
                              await updateRequestStatus(r.id, 'approved');
                              refreshData();
                            }} className="px-4 py-2 bg-emerald-500 text-white rounded-xl font-black text-xs hover:bg-emerald-600">Approve</button>
                            <button onClick={async () => {
                              await updateRequestStatus(r.id, 'rejected');
                              refreshData();
                            }} className="px-4 py-2 bg-red-50 text-red-500 rounded-xl font-black text-xs hover:bg-red-100">Reject</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
      {rejectModal && rejectTarget && (
        <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4" onClick={() => setRejectModal(false)}>
          <div className="bg-white rounded-3xl p-10 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-black text-gray-900 mb-2">Reject Product</h3>
            <p className="text-gray-400 text-sm font-bold mb-8">{rejectTarget.productName} — by {rejectTarget.vendorName}</p>
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-3 block">Select Reason</label>
            <div className="space-y-3 mb-6">
              {['Image quality is too low', 'Price is unrealistic', 'Prohibited item', 'Incomplete product information', 'Duplicate product listing', 'Custom reason'].map(reason => (
                <button key={reason} onClick={() => setRejectReason(reason)}
                  className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all ${rejectReason === reason ? 'bg-red-500 text-white' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'}`}>
                  {reason}
                </button>
              ))}
            </div>
            {rejectReason === 'Custom reason' && (
              <textarea value={customRejectReason} onChange={e => setCustomRejectReason(e.target.value)}
                placeholder="Write your reason..." rows={3}
                className="w-full bg-gray-50 rounded-2xl px-4 py-3 outline-none font-bold border-none text-sm resize-none mb-6" />
            )}
            <div className="flex gap-3">
              <button onClick={() => setRejectModal(false)} className="flex-1 py-3 bg-gray-100 text-gray-900 rounded-2xl font-black text-sm hover:bg-gray-200 transition-all">Cancel</button>
              <button onClick={() => {
                const finalReason = rejectReason === 'Custom reason' ? customRejectReason : rejectReason;
                if (!finalReason) return;
                handleProductApproval(rejectTarget.id, false, finalReason);
                setRejectModal(false);
              }} className="flex-1 py-3 bg-red-500 text-white rounded-2xl font-black text-sm hover:bg-red-600 transition-all">
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}

    </>
  );
};

export default ApprovalsPanel;
