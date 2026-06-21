import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { User, CartItem, Order } from '../../types';
import { useAuth } from '../../context/AuthContext';
import PageTitle from '../../components/PageTitle';
import { useOrders } from '../../hooks/useOrders';
import { useSharedVendors } from '../../context/DataContext';

import { supabase } from '../../lib/supabase';


const STATUS_STEPS = ['Processing', 'Shipped', 'Out for Delivery', 'Delivered'];

const normalizeStatus = (status?: string): string => {
  if (!status) return 'Processing';
  const n = status.toLowerCase();
  if (n === 'pending' || n === 'processing') return 'Processing';
  if (n === 'shipped') return 'Shipped';
  if (n === 'delivered') return 'Delivered';
  if (n === 'cancelled' || n === 'failed') return 'Cancelled';
  return status.charAt(0).toUpperCase() + status.slice(1);
};




const statusColor: Record<string, string> = {
  Processing: 'bg-amber-50 text-amber-600 border-amber-100',
  Shipped: 'bg-blue-50 text-blue-600 border-blue-100',
  Delivered: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  Cancelled: 'bg-red-50 text-red-500 border-red-100',
};

const OrderHistoryView: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { orders, refreshOrders } = useOrders(user);
  const { vendors } = useSharedVendors();

  const [cancelModalOrderId, setCancelModalOrderId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const ordersPerPage = 5;

  const totalPages = Math.ceil(orders.length / ordersPerPage);
  const displayedOrders = orders.slice((currentPage - 1) * ordersPerPage, currentPage * ordersPerPage);

  // Cancel request
  const handleSendCancelRequest = async (orderId: string) => {
    if (!cancelReason.trim()) return;
    
    try {
      const { error } = await supabase.from('orders').update({
        cancel_request: { reason: cancelReason, status: 'pending', date: new Date().toISOString() },
        cancel_reason: cancelReason
      }).eq('id', orderId);
      
      if (error) throw error;
      
      refreshOrders();
      setCancelModalOrderId(null);
      setCancelReason('');
    } catch (err) {
      console.error(err);
    }
  };

  // Analytics
  const totalOrders = orders.length;
  const totalSpent = orders.filter(o => o.status !== 'Cancelled').reduce((sum, o) => sum + o.total, 0);
  const lastOrderDate = orders.length > 0
    ? new Date(orders[0].createdAt || orders[0].date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    : '—';
  const deliveredCount = orders.filter(o => normalizeStatus(o.status) === 'Delivered').length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="container mx-auto px-4 py-12"
    >
      <PageTitle title="My Orders" />
      <div className="max-w-4xl mx-auto">
        {/* Header + Stats */}
        <div className="mb-10">
          <h1 className="text-4xl font-black text-gray-900 mb-2 tracking-tight">Order History</h1>
          <p className="text-gray-400 font-medium">Track and manage all your purchases</p>
        </div>

        {orders.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            {[
              { label: 'Total Orders', value: totalOrders.toString(), icon: 'fa-box', color: 'from-brand-500 to-purple-500' },
              { label: 'Total Spent', value: `৳${totalSpent.toLocaleString()}`, icon: 'fa-wallet', color: 'from-emerald-500 to-teal-500' },
              { label: 'Delivered', value: deliveredCount.toString(), icon: 'fa-check-circle', color: 'from-blue-500 to-indigo-500' },
              { label: 'Last Order', value: lastOrderDate, icon: 'fa-calendar', color: 'from-amber-500 to-orange-500' },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center mb-3`}>
                  <i className={`fas ${stat.icon} text-white text-sm`}></i>
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">{stat.label}</p>
                <p className="text-lg font-black text-gray-900">{stat.value}</p>
              </motion.div>
            ))}
          </div>
        )}


        
        {orders.length > 0 ? (
          <div className="space-y-8">
            {displayedOrders.map((order) => (
              <div key={order.id} className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-8 hover:shadow-md transition-shadow">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 pb-6 border-b border-gray-50 gap-4">
                  <div>
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Order ID</p>
                    <h3 className="text-xl font-black text-gray-900">#{order.id}</h3>
                  </div>
                  <div>
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Date Placed</p>
                    <p className="font-bold text-gray-700">
                      {order.createdAt
                        ? new Date(order.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                        : order.date}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Total Amount</p>
                    <p className="font-black text-brand-600 text-lg">৳{order.total.toLocaleString()}</p>
                  </div>
                  <div className="flex flex-col items-end gap-3">
                    {/* Cancelled or in-progress tracker */}
                    {normalizeStatus(order.status) === 'Cancelled' ? (
                      <span className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-red-100 text-red-500">
                        Cancelled
                      </span>
                    ) : (
                      <div className="flex items-start justify-between w-full mt-1">
                        {STATUS_STEPS.map((step, i) => {
                          const activeIdx = STATUS_STEPS.indexOf(normalizeStatus(order.status));
                          const done = i <= activeIdx;
                          const isCurrent = i === activeIdx;
                          return (
                            <React.Fragment key={step}>
                              <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black transition-all border-2 ${
                                  done ? 'bg-brand-600 border-brand-600 text-white shadow-md shadow-brand-200' : 'bg-white border-gray-200 text-gray-300'
                                } ${isCurrent ? 'ring-4 ring-brand-100 scale-110' : ''}`}>
                                  {done && (!isCurrent || i === STATUS_STEPS.length - 1) ? <i className="fas fa-check text-[10px]"></i> : i + 1}
                                </div>
                                <p className={`text-[8px] font-black uppercase tracking-wide text-center leading-tight max-w-[56px] ${done ? 'text-brand-600' : 'text-gray-300'}`}>{step}</p>
                              </div>
                              {i < STATUS_STEPS.length - 1 && (
                                <div className={`flex-1 h-0.5 mt-[15px] mx-1 rounded-full ${i < activeIdx ? 'bg-brand-600' : 'bg-gray-100'}`} />
                              )}
                            </React.Fragment>
                          );
                        })}
                      </div>
                    )}

                    {/* Cancel request states — only relevant during Processing */}
                    {normalizeStatus(order.status) === 'Processing' && (
                      <div className="text-right">
                        {!order.cancelRequest && (
                          <button
                            onClick={() => { setCancelModalOrderId(order.id); setCancelReason(''); }}
                            className="text-[10px] font-black uppercase tracking-widest text-red-400 hover:text-red-600 transition-colors"
                          >
                            Request Cancel
                          </button>
                        )}
                        {order.cancelRequest === 'pending' && (
                          <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">
                            <i className="fas fa-clock mr-1"></i>Awaiting Review
                          </span>
                        )}
                        {order.cancelRequest === 'vendor_review' && (
                          <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">
                            <i className="fas fa-clock mr-1"></i>Vendor Reviewing
                          </span>
                        )}
                        {(order.cancelRequest === 'rejected' || order.cancelRequest === 'vendor_rejected') && (
                          <span className="text-[10px] font-black uppercase tracking-widest text-orange-400">
                            <i className="fas fa-times mr-1"></i>Cannot Be Cancelled
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Shipping Address</p>
                    <p className="text-xs font-medium text-gray-700 leading-relaxed max-w-sm">
                      <i className="fas fa-map-marker-alt text-brand-500 mr-1.5"></i>
                      {order.shippingAddress || 'Address not available'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Payment Information</p>
                    <div className="flex flex-wrap gap-2 items-center">
                      <span className="text-xs font-black text-gray-700 bg-white px-3 py-1.5 rounded-xl border border-gray-200">
                        {order.paymentMethod ? order.paymentMethod.toUpperCase() : 'UNKNOWN'}
                      </span>
                      <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${
                        order.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-600' :
                        order.paymentStatus === 'failed' ? 'bg-red-100 text-red-600' :
                        'bg-amber-100 text-amber-600'
                      }`}>
                        {order.paymentStatus || 'pending'}
                      </span>
                    </div>
                  </div>
                </div>
                
                {order.promoCode && (
                  <div className="mb-4 flex items-center gap-3 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
                    <i className="fas fa-tag text-emerald-500"></i>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Promo Applied</p>
                      <p className="text-xs font-black text-gray-900">
                        {order.promoCode}
                        {order.discount ? <span className="text-emerald-600 font-bold ml-2">— saved ৳{order.discount.toLocaleString()}</span> : null}
                      </p>
                    </div>
                  </div>
                )}
                <div className="space-y-4">
                  {(() => {
                    // Vendor grouping
                    const groups: Record<string, typeof order.items> = {};
                    order.items.forEach((item: any) => {
                      const vid = item.vendorId || 'unknown';
                      if (!groups[vid]) groups[vid] = [];
                      groups[vid].push(item);
                    });
                    return Object.entries(groups).map(([vid, items]) => {
                      const vendorStatus = order.vendorStatuses?.[vid] || order.status;
                      const foundVendor = vendors.find(v => v.id === vid);
                      const vendorName = foundVendor?.name || 'Vendor';
                      return (
                        <div key={vid} className="border border-gray-100 rounded-2xl overflow-hidden">
                          {/* Vendor header with status */}
                          <div className="flex items-center justify-between px-4 py-3 bg-gray-50">
                            <div className="flex items-center gap-2">
                              <i className="fas fa-store text-gray-400 text-xs"></i>
                              <span className="text-xs font-black text-gray-700">{vendorName}</span>
                            </div>
                            <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-full border ${statusColor[normalizeStatus(vendorStatus as string)] || 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                              {normalizeStatus(vendorStatus as string)}
                            </span>
                          </div>
                          {/* Items from this vendor */}
                          <div className="divide-y divide-gray-50">
                            {(items as any[]).map((item: any, index: number) => (
                              <div key={index} className="flex items-center gap-4 bg-white p-4">
                                <img src={item.image || 'https://via.placeholder.com/150?text=Product'} referrerPolicy="no-referrer" alt={item.name} className="w-14 h-14 object-cover rounded-lg bg-gray-50" />
                                <div className="flex-1">
                                  <h4 className="font-bold text-gray-900 text-sm">{item.name}</h4>
                                  <p className="text-xs text-gray-500 font-medium">Qty: {item.quantity} × ৳{item.price.toLocaleString()}</p>
                                  {normalizeStatus(vendorStatus as string) === 'Delivered' && (
                                    <button
                                      onClick={() => navigate(`/products/${item.id}`)}
                                      className="text-[10px] font-black uppercase tracking-widest text-brand-600 hover:text-brand-700 transition-colors mt-1"
                                    >
                                      ✍️ Write a Review
                                    </button>
                                  )}
                                </div>
                                <p className="font-black text-gray-900 text-sm">৳{(item.price * item.quantity).toLocaleString()}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            ))}
            
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-4 mt-12 mb-8">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white border border-gray-100 text-gray-500 hover:text-brand-600 hover:border-brand-200 hover:shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <i className="fas fa-chevron-left"></i>
                </button>
                <div className="flex items-center gap-2">
                  {Array.from({ length: totalPages }).map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentPage(idx + 1)}
                      className={`w-10 h-10 rounded-xl font-black text-xs transition-all ${
                        currentPage === idx + 1 
                          ? 'bg-brand-600 text-white shadow-md shadow-brand-200' 
                          : 'bg-white text-gray-500 border border-gray-100 hover:border-brand-200 hover:text-brand-600'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white border border-gray-100 text-gray-500 hover:text-brand-600 hover:border-brand-200 hover:shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <i className="fas fa-chevron-right"></i>
                </button>
              </div>
            )}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[2rem] border border-gray-100 shadow-[0_4px_24px_rgba(0,0,0,0.02)] p-12 md:p-20 text-center"
          >
            <div className="w-24 h-24 bg-gradient-to-br from-brand-50 to-purple-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
              <i className="fas fa-shopping-bag text-4xl text-brand-400"></i>
            </div>
            <h3 className="text-3xl font-black text-gray-900 mb-4 tracking-tight">No orders yet</h3>
            <p className="text-gray-500 font-medium max-w-sm mx-auto mb-10 leading-relaxed">
              Looks like you haven't made your first purchase. Discover our amazing products and start shopping today!
            </p>
            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-3 px-8 py-4 gradient-primary text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-brand-500/20 hover:scale-[1.02] active:scale-95 transition-all"
            >
              Start Shopping <i className="fas fa-arrow-right"></i>
            </button>
          </motion.div>
        )}
      </div>

      {/* Cancel Request Modal */}
      {cancelModalOrderId && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
          onClick={() => setCancelModalOrderId(null)}
        >
          <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center mb-5">
              <i className="fas fa-ban text-red-500 text-xl"></i>
            </div>
            <h3 className="text-xl font-black text-gray-900 mb-2">Request Cancellation</h3>
            <p className="text-sm text-gray-400 font-medium mb-6 leading-relaxed">
              Your request will be reviewed by our team and the vendor. The order will <strong className="text-gray-700">not be cancelled</strong> until approved.
            </p>
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">
              Reason <span className="text-red-400">*</span>
            </label>
            <textarea
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
              placeholder="e.g. Changed my mind, ordered wrong item..."
              rows={3}
              className="w-full bg-gray-50 rounded-2xl px-5 py-4 outline-none font-medium text-sm border border-gray-100 focus:border-brand-300 resize-none mb-6 transition-all"
            />
            <div className="flex gap-3">
              <button
                onClick={() => handleSendCancelRequest(cancelModalOrderId)}
                disabled={!cancelReason.trim()}
                className="flex-1 py-4 bg-red-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-red-600 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Send Request
              </button>
              <button
                onClick={() => setCancelModalOrderId(null)}
                className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-gray-200 active:scale-95 transition-all"
              >
                Keep Order
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default OrderHistoryView;
