import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

import { useOrders } from '../../hooks/useOrders';
import { Order, OrderItem } from '../../types';
import { supabase } from '../../lib/supabase';



const deriveOverallStatus = (vendorStatuses: Record<string, string>): string => {
  const statuses = Object.values(vendorStatuses);
  if (statuses.every(s => s === 'Delivered')) return 'Delivered';
  if (statuses.every(s => s === 'Cancelled')) return 'Cancelled';
  if (statuses.some(s => s === 'Shipped' || s === 'Delivered')) return 'Shipped';
  return 'Processing';
};

const normalizeStatus = (status?: string): string => {
  if (!status) return 'Processing';
  const n = status.toLowerCase();
  if (n === 'pending' || n === 'processing') return 'Processing';
  if (n === 'shipped') return 'Shipped';
  if (n === 'delivered') return 'Delivered';
  if (n === 'cancelled' || n === 'failed') return 'Cancelled';
  return status.charAt(0).toUpperCase() + status.slice(1);
};

const OrderManagementPanel: React.FC<{ setToast: (msg: string) => void }> = ({ setToast }) => {
  const { user } = useAuth();
  const [orderSearch, setOrderSearch] = useState('');
  const [orderFilter, setOrderFilter] = useState('All');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const ordersPerPage = 10;
  
  const { orders: allOrders, refreshOrders } = useOrders(user);



  // Forward cancel request
  const handleForwardToVendor = async (orderId: string) => {
    try {
      refreshOrders();
      setToast(`Cancel request forwarded to vendor for order ${orderId}`);
    } catch (e) {
      console.error(e);
      setToast('Error forwarding to vendor.');
    }
  };

  const restoreInventory = async (order: Order) => {
    if (!order.items) return;
    const itemsToRestore = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
    try {
      await supabase.functions.invoke('update-inventory', {
        body: {
          action: 'increment',
          items: itemsToRestore.map((i: any) => ({ product_id: i.id, quantity: i.quantity }))
        }
      });
    } catch (err) {
      console.error('Failed to restore inventory', err);
    }
  };

  // Approve cancel
  const handleAdminApprove = async (orderId: string) => {
    const order = allOrders.find((o: Order) => o.id === orderId);
    if (!order) return;
    
    try {
      const { error } = await supabase.from('orders').update({
        status: 'Cancelled',
        cancel_request: { ...(typeof order.cancelRequest === 'object' ? order.cancelRequest : {}), status: 'approved' }
      }).eq('id', orderId);
      if (error) throw error;

      refreshOrders();
      await restoreInventory(order as Order);

      setToast(`Order ${orderId} cancelled. Customer notified`);
    } catch (e) {
      console.error(e);
      setToast('Error approving cancellation.');
    }
  };

  // Reject cancel
  const handleAdminReject = async (orderId: string) => {
    const order = allOrders.find((o: Order) => o.id === orderId);
    
    try {
      const { error } = await supabase.from('orders').update({
        cancel_request: { ...(typeof order?.cancelRequest === 'object' ? order.cancelRequest : {}), status: 'rejected' }
      }).eq('id', orderId);
      if (error) throw error;
      
      refreshOrders();

      setToast(`Cancel request rejected for ${orderId}. Customer notified`);
    } catch (e) {
      console.error(e);
      setToast('Error rejecting cancellation.');
    }
  };

  // Finalize decision
  const handleFinalizeVendorDecision = async (orderId: string, vendorDecision: 'vendor_approved' | 'vendor_rejected') => {
    const order = allOrders.find((o: Order) => o.id === orderId);
    
    try {
      if (vendorDecision === 'vendor_approved') {
        const { error } = await supabase.from('orders').update({
          status: 'Cancelled',
          cancel_request: { ...(typeof order?.cancelRequest === 'object' ? order.cancelRequest : {}), status: 'approved' }
        }).eq('id', orderId);
        if (error) throw error;

        refreshOrders();
        await restoreInventory(order as Order);

        setToast(`Order ${orderId} cancelled. Customer notified`);
      } else {
        const { error } = await supabase.from('orders').update({
          cancel_request: { ...(typeof order?.cancelRequest === 'object' ? order.cancelRequest : {}), status: 'rejected' }
        }).eq('id', orderId);
        if (error) throw error;

        refreshOrders();

        setToast(`Cancel rejected for ${orderId}. Customer notified`);
      }
    } catch (e) {
      console.error(e);
      setToast('Error finalizing vendor decision.');
    }
  };

  // Update status
  const handleStatusChange = async (orderId: string, newStatus: string) => {
    const order = allOrders.find((o: Order) => o.id === orderId);
    if (!order) return;
    
    const newVendorStatuses = order.vendorStatuses
      ? Object.fromEntries(Object.keys(order.vendorStatuses).map(vid => [vid, newStatus]))
      : {};
      
    try {
      const { error } = await supabase.from('orders').update({
        status: newStatus,
        vendor_statuses: newVendorStatuses
      }).eq('id', orderId);
      if (error) throw error;
      
      refreshOrders();
      if (newStatus === 'Cancelled') {
        await restoreInventory(order as Order);
      }

      setToast(`Order ${orderId} → ${newStatus}`);
    } catch (e) {
      console.error(e);
      setToast('Error updating status.');
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this order from the database? This action cannot be undone.')) return;
    
    try {
      const { error } = await supabase.from('orders').delete().eq('id', orderId);
      if (error) throw error;
      
      refreshOrders();
      setToast(`Order ${orderId} permanently deleted.`);
    } catch (e) {
      console.error(e);
      setToast('Error deleting order.');
    }
  };

  const cancelRequests = allOrders.filter((o: Order) => ['pending', 'vendor_approved', 'vendor_rejected'].includes(o.cancelRequest as string));

  const getCommission = (price: number) => price >= 5000 ? 0.10 : price >= 1000 ? 0.15 : 0.20;

  const filtered = allOrders.filter((o: Order) => {
    const matchSearch = o.id?.toLowerCase().includes(orderSearch.toLowerCase());
    const matchFilter = orderFilter === 'All' || normalizeStatus(o.status) === orderFilter;
    return matchSearch && matchFilter;
  });

  const totalPages = Math.ceil(filtered.length / ordersPerPage);
  const displayedOrders = filtered.slice((currentPage - 1) * ordersPerPage, currentPage * ordersPerPage);

  const totalGMV = allOrders.filter((o: Order) => normalizeStatus(o.status) === 'Delivered').reduce((s: number, o: Order) => s + (o.total || 0), 0);
  const totalCommission = allOrders.filter((o: Order) => normalizeStatus(o.status) === 'Delivered').reduce((s: number, o: Order) => {
    return s + (o.items || []).reduce((si: number, item: OrderItem) => {
      return si + (item.price || 0) * (item.quantity || 1) * getCommission(item.price || 0);
    }, 0);
  }, 0);
  const statusCounts = { Processing: 0, Shipped: 0, Delivered: 0, Cancelled: 0 } as Record<string, number>;
  allOrders.forEach((o: Order) => { 
    const normStatus = normalizeStatus(o.status);
    if (statusCounts[normStatus] !== undefined) statusCounts[normStatus]++; 
  });

  const statusColor: Record<string, string> = {
    Processing: 'bg-amber-100 text-amber-600',
    Shipped: 'bg-blue-100 text-blue-600',
    Delivered: 'bg-emerald-100 text-emerald-600',
    Cancelled: 'bg-red-100 text-red-500',
  };

  return (
    <div className="space-y-6">

      {/* Cancel Request Alerts */}
      {cancelRequests.length > 0 && (
        <div className="bg-white border border-red-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="bg-red-50 px-5 py-3 flex items-center gap-2 border-b border-red-100">
            <i className="fas fa-bell text-red-400 text-xs"></i>
            <p className="text-[10px] font-black uppercase tracking-widest text-red-500">
              Cancel Requests — {cancelRequests.length} need attention
            </p>
          </div>
          <div className="divide-y divide-gray-50">
            {cancelRequests.map((o: Order) => (
              <div key={o.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-black text-gray-900 text-sm">{o.id}</p>
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                      o.cancelRequest === 'pending' ? 'bg-amber-100 text-amber-600' :
                      o.cancelRequest === 'vendor_approved' ? 'bg-emerald-100 text-emerald-600' :
                      'bg-red-100 text-red-500'
                    }`}>
                      {o.cancelRequest === 'pending' ? 'Awaiting Action' : o.cancelRequest === 'vendor_approved' ? 'Vendor Approved' : 'Vendor Rejected'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 font-medium">
                    {o.userName || o.userId || '—'} · ৳{(o.total || 0).toLocaleString()} · Order: {normalizeStatus(o.status)}
                  </p>
                  {o.cancelReason && (
                    <p className="text-xs text-red-400 font-bold mt-1">
                      <i className="fas fa-quote-left text-[8px] mr-1 opacity-50"></i>{o.cancelReason}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  {o.cancelRequest === 'pending' && (
                    <>
                      <button onClick={() => handleForwardToVendor(o.id)} className="px-3 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all">
                        <i className="fas fa-share mr-1"></i>Forward to Vendor
                      </button>
                      <button onClick={() => handleAdminApprove(o.id)} className="px-3 py-2 bg-red-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 transition-all">
                        Approve
                      </button>
                      <button onClick={() => handleAdminReject(o.id)} className="px-3 py-2 bg-gray-100 text-gray-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-200 transition-all">
                        Reject
                      </button>
                    </>
                  )}
                  {(o.cancelRequest === 'vendor_approved' || o.cancelRequest === 'vendor_rejected') && (
                    <button
                      onClick={() => handleFinalizeVendorDecision(o.id, o.cancelRequest as 'vendor_approved' | 'vendor_rejected')}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                        o.cancelRequest === 'vendor_approved'
                          ? 'bg-red-500 text-white hover:bg-red-600'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <i className="fas fa-paper-plane mr-1"></i>
                      {o.cancelRequest === 'vendor_approved' ? 'Confirm Cancel & Notify' : 'Notify Rejection'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Total Orders', value: allOrders.length, icon: 'fa-receipt', color: 'text-brand-600', bg: 'bg-brand-50' },
          { label: 'Total GMV', value: '৳' + Math.round(totalGMV).toLocaleString(), icon: 'fa-taka-sign', color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Processing', value: statusCounts.Processing, icon: 'fa-clock', color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Shipped', value: statusCounts.Shipped, icon: 'fa-truck', color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Delivered', value: statusCounts.Delivered, icon: 'fa-check-circle', color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Cancelled', value: statusCounts.Cancelled, icon: 'fa-times-circle', color: 'text-red-500', bg: 'bg-red-50' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center mb-3`}>
              <i className={`fas ${s.icon} text-sm ${s.color}`}></i>
            </div>
            <p className="text-xl font-black text-gray-900">{s.value}</p>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="🔍 Search by Order ID..."
          value={orderSearch}
          onChange={e => setOrderSearch(e.target.value)}
          className="flex-1 min-w-[180px] bg-gray-50 rounded-xl px-4 py-2.5 text-sm font-bold outline-none border border-gray-100 focus:border-brand-400"
        />
        {['All', 'Processing', 'Shipped', 'Delivered', 'Cancelled'].map(f => (
          <button
            key={f}
            onClick={() => setOrderFilter(f)}
            className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all border ${orderFilter === f ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-gray-400 border-gray-200 hover:border-brand-400 hover:text-brand-600'}`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Order List */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <p className="text-center text-gray-400 font-bold py-12">No orders found</p>
        ) : (
          <div>
            {/* Table header */}
            <div className="grid grid-cols-6 gap-2 px-5 py-3 bg-gray-50 border-b border-gray-100">
              {['Order ID', 'Date', 'Status', 'Items', 'Total', 'Commission'].map(h => (
                <p key={h} className="text-[10px] font-black uppercase tracking-widest text-gray-400">{h}</p>
              ))}
            </div>

            {displayedOrders.map((order: Order) => {
              const isExpanded = expandedOrder === order.id;
              const commission = (order.items || []).reduce((s: number, item: OrderItem) => {
                return s + (item.price || 0) * (item.quantity || 1) * getCommission(item.price || 0);
              }, 0);

              return (
                <div key={order.id}>
                  <div
                    onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                    className={`grid grid-cols-6 gap-2 px-5 py-4 border-b border-gray-50 cursor-pointer transition-all hover:bg-gray-50 ${isExpanded ? 'bg-brand-50' : ''}`}
                  >
                    <p className="font-black text-gray-900 text-sm">{order.id}</p>
                    <p className="text-xs font-medium text-gray-500">{order.date}</p>
                    <span className={`inline-flex items-center justify-center h-6 px-3 rounded-full text-[10px] font-black leading-none w-fit ${statusColor[normalizeStatus(order.status)] || 'bg-gray-100 text-gray-500'}`}>
                      {normalizeStatus(order.status)}
                    </span>
                    <p className="text-xs font-medium text-gray-500">{(order.items || []).length} item{(order.items || []).length !== 1 ? 's' : ''}</p>
                    <p className="text-sm font-black text-gray-900">৳{(order.total || 0).toLocaleString()}</p>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-black text-emerald-600">৳{Math.round(commission).toLocaleString()}</p>
                      <i className={`fas fa-chevron-down text-[10px] text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}></i>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-5 py-5 bg-brand-50 border-b-2 border-brand-100">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {/* Items */}
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Order Items</p>
                          <div className="space-y-2">
                            {(order.items || []).map((item: OrderItem, i: number) => (
                              <div key={i} className="flex items-center gap-3 bg-white rounded-xl p-3 border border-brand-100">
                                {item.image ? (
                                  <img src={item.image || 'https://via.placeholder.com/150'} referrerPolicy="no-referrer" className="w-10 h-10 rounded-lg object-cover shrink-0" alt="" onError={e => (e.currentTarget.style.display='none')} />
                                ) : (
                                  <div className="w-10 h-10 rounded-lg bg-brand-100 flex items-center justify-center shrink-0">
                                    <i className="fas fa-box text-brand-400 text-xs"></i>
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-black text-gray-900 truncate">{item.name}</p>
                                  <p className="text-[10px] text-gray-400 font-medium">{item.vendorName || '—'} · Qty: {item.quantity}</p>
                                </div>
                                <p className="text-xs font-black text-brand-600 shrink-0">৳{((item.price || 0) * (item.quantity || 1)).toLocaleString()}</p>
                              </div>
                            ))}
                          </div>
                          <div className="mt-3 rounded-xl border border-gray-100 overflow-hidden">
                            <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-100 flex items-center gap-2">
                              <i className="fas fa-shield-halved text-brand-500 text-xs"></i>
                              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Admin Control</p>
                            </div>
                            <div className="bg-white p-4">
                              {/* Pending → forward to vendor or direct action */}
                              {order.cancelRequest === 'pending' && (
                                <div className="mb-3 p-3 bg-amber-50 rounded-xl border border-amber-100">
                                  <p className="text-xs font-black text-amber-700 mb-2">
                                    <i className="fas fa-hourglass-half mr-1.5"></i>
                                    Customer cancel request{order.cancelReason ? <span className="font-medium"> — "{order.cancelReason}"</span> : ''}
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                    <button onClick={e => { e.stopPropagation(); handleForwardToVendor(order.id); }} className="px-4 py-2 bg-blue-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all">
                                      <i className="fas fa-share mr-1.5"></i>Forward to Vendor
                                    </button>
                                    <button onClick={e => { e.stopPropagation(); handleAdminApprove(order.id); }} className="px-4 py-2 bg-red-500 text-white rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-red-600 transition-all">
                                      Approve & Cancel
                                    </button>
                                    <button onClick={e => { e.stopPropagation(); handleAdminReject(order.id); }} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-gray-200 transition-all">
                                      Reject
                                    </button>
                                  </div>
                                </div>
                              )}
                              {/* Forwarded — waiting for vendor */}
                              {order.cancelRequest === 'vendor_review' && (
                                <div className="mb-3 p-3 bg-blue-50 rounded-xl border border-blue-100 flex items-center gap-2">
                                  <i className="fas fa-clock text-blue-400 text-xs"></i>
                                  <p className="text-xs font-bold text-blue-600">Cancel request forwarded — waiting for vendor decision</p>
                                </div>
                              )}
                              {/* Vendor decided — admin must finalize + notify */}
                              {(order.cancelRequest === 'vendor_approved' || order.cancelRequest === 'vendor_rejected') && (
                                <div className={`mb-3 p-3 rounded-xl border ${order.cancelRequest === 'vendor_approved' ? 'bg-emerald-50 border-emerald-100' : 'bg-orange-50 border-orange-100'}`}>
                                  <p className={`text-xs font-black mb-2 ${order.cancelRequest === 'vendor_approved' ? 'text-emerald-700' : 'text-orange-600'}`}>
                                    <i className={`fas ${order.cancelRequest === 'vendor_approved' ? 'fa-check' : 'fa-times'} mr-1.5`}></i>
                                    Vendor {order.cancelRequest === 'vendor_approved' ? 'approved' : 'rejected'} the cancel request
                                  </p>
                                  <button
                                    onClick={e => { e.stopPropagation(); handleFinalizeVendorDecision(order.id, order.cancelRequest as 'vendor_approved' | 'vendor_rejected'); }}
                                    className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${order.cancelRequest === 'vendor_approved' ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                                  >
                                    <i className="fas fa-paper-plane mr-1.5"></i>
                                    {order.cancelRequest === 'vendor_approved' ? 'Confirm Cancel & Notify Customer' : 'Notify Customer of Rejection'}
                                  </button>
                                </div>
                              )}
                              {/* Normal status update */}
                              <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2">Update Order Status</p>
                              <div className="flex flex-wrap gap-2">
                                {(['Processing', 'Shipped', 'Delivered', 'Cancelled'] as const).map(s => (
                                  <button
                                    key={s}
                                    onClick={e => { e.stopPropagation(); handleStatusChange(order.id, s); }}
                                    disabled={normalizeStatus(order.status) === s || normalizeStatus(order.status) === 'Cancelled' || (normalizeStatus(order.status) === 'Delivered' && s === 'Cancelled')}
                                    className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border ${
                                      normalizeStatus(order.status) === s
                                        ? 'bg-brand-600 text-white border-brand-600 cursor-default'
                                        : (normalizeStatus(order.status) === 'Cancelled' || (normalizeStatus(order.status) === 'Delivered' && s === 'Cancelled'))
                                        ? 'opacity-40 cursor-not-allowed bg-white text-gray-400 border-gray-200'
                                        : s === 'Cancelled'
                                        ? 'bg-white text-red-400 border-red-200 hover:bg-red-50'
                                        : 'bg-white text-gray-400 border-gray-200 hover:border-brand-400 hover:text-brand-600'
                                    }`}
                                  >
                                    {normalizeStatus(order.status) === s && <i className="fas fa-check mr-1"></i>}
                                    {s}
                                  </button>
                                ))}
                              </div>
                              {normalizeStatus(order.status) === 'Cancelled' && (
                                <div className="mt-4 pt-4 border-t border-gray-100">
                                  <button
                                    onClick={e => { e.stopPropagation(); handleDeleteOrder(order.id); }}
                                    className="px-4 py-2 bg-red-50 text-red-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-100 hover:text-red-700 transition-all border border-red-100"
                                  >
                                    <i className="fas fa-trash-alt mr-2"></i>Delete Order Permanently
                                  </button>
                                  <p className="text-[9px] font-medium text-gray-400 mt-2">This will completely remove the order from the database. Cannot be undone.</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Info */}
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Order Info</p>
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              { k: 'Order ID', v: order.id },
                              { k: 'Date', v: order.date },
                              { k: 'Total Amount', v: '৳' + (order.total || 0).toLocaleString(), highlight: true },
                              { k: 'Commission', v: '৳' + Math.round(commission).toLocaleString(), green: true },
                              { k: 'Customer', v: order.userName || order.userId || '—' },
                              { k: 'Status', v: normalizeStatus(order.status) },
                            ].map(row => (
                              <div key={row.k} className="bg-white rounded-xl p-3 border border-brand-100">
                                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">{row.k}</p>
                                <p className={`text-xs font-black mt-1 ${row.highlight ? 'text-brand-600' : row.green ? 'text-emerald-600' : 'text-gray-900'}`}>{row.v}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-4 mt-8 mb-8">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-gray-100 text-gray-500 hover:text-brand-600 hover:border-brand-200 hover:shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <i className="fas fa-chevron-left"></i>
                </button>
                <div className="flex items-center gap-2">
                  {Array.from({ length: totalPages }).map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentPage(idx + 1)}
                      className={`w-8 h-8 rounded-lg font-black text-xs transition-all ${
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
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-gray-100 text-gray-500 hover:text-brand-600 hover:border-brand-200 hover:shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <i className="fas fa-chevron-right"></i>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400 font-medium text-center">
        Total Platform Commission from all orders: <span className="text-emerald-600 font-black">৳{Math.round(totalCommission).toLocaleString()}</span>
      </p>
    </div>
  );
};

export default OrderManagementPanel;
