import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import PageTitle from '../../components/PageTitle';
import { useOrders } from '../../hooks/useOrders';
import { VendorStatus, Order, OrderItem } from '../../types';
import { supabase } from '../../lib/supabase';


const getVendorStatus = (order: Order, vendorId: string): string => {
  let statusStr = '';
  if (order.vendorStatuses && order.vendorStatuses[vendorId]) {
    statusStr = String(order.vendorStatuses[vendorId]);
  } else {
    statusStr = order.status || ''; // Fallback
  }
  
  const normalized = statusStr.toLowerCase();
  if (normalized === 'pending' || normalized === 'processing') return 'Processing';
  if (normalized === 'shipped') return 'Shipped';
  if (normalized === 'delivered') return 'Delivered';
  if (normalized === 'cancelled' || normalized === 'failed') return 'Cancelled';
  
  return statusStr ? statusStr.charAt(0).toUpperCase() + statusStr.slice(1) : 'Processing';
};

// Derive overall status
const deriveOverallStatus = (vendorStatuses: Record<string, string | VendorStatus>): string => {
  const statuses = Object.values(vendorStatuses);
  if (statuses.every(s => s === 'Delivered')) return 'Delivered';
  if (statuses.every(s => s === 'Cancelled')) return 'Cancelled';
  if (statuses.some(s => s === 'Shipped' || s === 'Delivered')) return 'Shipped';
  return 'Processing';
};

const VendorOrdersView: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const { orders: allOrders, refreshOrders } = useOrders(user);
  const STATUS_STEPS = ['Processing', 'Shipped', 'Delivered'];

  const vendorId = user?.id || '';
  const vendorOrders = allOrders.filter((order: Order) =>
    order.items?.some((item: OrderItem) => item.vendorId === vendorId)
  );

  const restoreVendorInventory = async (order: Order, vId: string) => {
    if (!order.items) return;
    const itemsToRestore = (typeof order.items === 'string' ? JSON.parse(order.items) : order.items)
      .filter((i: any) => i.vendorId === vId);
    if (itemsToRestore.length === 0) return;
    try {
      await supabase.functions.invoke('update-inventory', {
        body: {
          action: 'increment',
          items: itemsToRestore.map((i: any) => ({ product_id: i.id, quantity: i.quantity }))
        }
      });
    } catch (err) {
      console.error('Failed to restore vendor inventory', err);
    }
  };

  const handleVendorCancelApprove = async (orderId: string) => {
    const order = allOrders.find((o: Order) => o.id === orderId);
    if (!order || !order.items?.some((item: OrderItem) => item.vendorId === vendorId)) return;
    
    const newVendorStatuses = { ...(order.vendorStatuses || {}), [vendorId]: 'Cancelled' };
    const newOverallStatus = deriveOverallStatus(newVendorStatuses);
    
    try {
      const { error } = await supabase.from('orders').update({
        vendor_statuses: newVendorStatuses,
        status: newOverallStatus
      }).eq('id', orderId);
      if (error) throw error;
      refreshOrders();
      await restoreVendorInventory(order as Order, vendorId as string);
    } catch (err) {
      console.error(err);
    }
  };

  const handleVendorCancelReject = async (orderId: string) => {
    const order = allOrders.find((o: Order) => o.id === orderId);
    if (!order || !order.items?.some((item: OrderItem) => item.vendorId === vendorId)) return;
    
    try {
      // Revert the cancel request for this vendor's part
      const newVendorStatuses = { ...(order.vendorStatuses || {}), [vendorId]: 'Processing' };
      const { error } = await supabase.from('orders').update({
        vendor_statuses: newVendorStatuses,
        status: deriveOverallStatus(newVendorStatuses)
      }).eq('id', orderId);
      if (error) throw error;
      refreshOrders();
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkShipped = async (orderId: string) => {
    const order = allOrders.find((o: Order) => o.id === orderId);
    if (!order || !order.items?.some((item: OrderItem) => item.vendorId === vendorId)) return;
    
    const newVendorStatuses = { ...(order.vendorStatuses || {}), [vendorId]: 'Shipped' };
    const newOverallStatus = deriveOverallStatus(newVendorStatuses);
    
    try {
      const { error } = await supabase.from('orders').update({
        vendor_statuses: newVendorStatuses,
        status: newOverallStatus
      }).eq('id', orderId);
      if (error) throw error;
      refreshOrders();
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = vendorOrders.filter((order: Order) => {
    const myStatus = getVendorStatus(order, vendorId);
    const matchFilter = filter === 'All' || myStatus === filter;
    const matchSearch = order.id?.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const statusColor: Record<string, string> = {
    Processing: 'bg-amber-50 text-amber-600',
    Shipped: 'bg-blue-50 text-blue-600',
    Delivered: 'bg-emerald-50 text-emerald-600',
    Cancelled: 'bg-red-50 text-red-500',
  };

  const statusCounts = {
    All: vendorOrders.length,
    Processing: vendorOrders.filter((o: Order) => getVendorStatus(o, vendorId) === 'Processing').length,
    Shipped: vendorOrders.filter((o: Order) => getVendorStatus(o, vendorId) === 'Shipped').length,
    Delivered: vendorOrders.filter((o: Order) => getVendorStatus(o, vendorId) === 'Delivered').length,
    Cancelled: vendorOrders.filter((o: Order) => getVendorStatus(o, vendorId) === 'Cancelled').length,
  };

  const totalRevenue = vendorOrders
    .filter((o: Order) => getVendorStatus(o, vendorId) === 'Delivered')
    .reduce((s: number, order: Order) => {
      const myItems = order.items?.filter((item: OrderItem) => item.vendorId === vendorId) || [];
      return s + myItems.reduce((is: number, i: OrderItem) => is + (i.price || 0) * (i.quantity || 0), 0);
    }, 0);
  return (
    <div className="container mx-auto px-4 py-12">
      <PageTitle title="Store Orders" />
      {/* Header */}
      <div className="flex items-center gap-4 mb-10">
        <button onClick={() => navigate('/dashboard')} className="w-10 h-10 rounded-2xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-all">
          <i className="fas fa-arrow-left text-gray-600 text-sm"></i>
        </button>
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">My Orders</h1>
          <p className="text-sm text-gray-400 font-medium">Orders containing your products</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Orders', value: vendorOrders.length, icon: 'fa-shopping-bag', color: 'text-brand-600', bg: 'bg-brand-50' },
          { label: 'Processing', value: statusCounts.Processing, icon: 'fa-clock', color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Delivered', value: statusCounts.Delivered, icon: 'fa-check-circle', color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Revenue', value: `৳${totalRevenue.toLocaleString()}`, icon: 'fa-taka-sign', color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className={`w-10 h-10 ${stat.bg} rounded-xl flex items-center justify-center mb-3`}>
              <i className={`fas ${stat.icon} ${stat.color} text-sm`}></i>
            </div>
            <p className="text-2xl font-black text-gray-900">{stat.value}</p>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Filters + Search */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex gap-2 flex-wrap">
          {(['All', 'Processing', 'Shipped', 'Delivered', 'Cancelled'] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${filter === s ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
            >
              {s} {statusCounts[s as keyof typeof statusCounts] > 0 && (
                <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[9px] ${filter === s ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-500'}`}>
                  {statusCounts[s as keyof typeof statusCounts]}
                </span>
              )}
            </button>
          ))}
        </div>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by order ID..."
          className="sm:ml-auto bg-gray-50 border border-gray-100 rounded-xl px-4 py-2 text-sm font-bold outline-none focus:border-brand-300 transition-all w-full sm:w-56"
        />
      </div>

      {/* Orders List */}
      {filtered.length === 0 ? (
        <div className="py-32 text-center bg-white rounded-[3rem] border-2 border-dashed border-gray-100">
          <i className="fas fa-shopping-bag text-5xl text-gray-200 mb-6 block"></i>
          <h3 className="text-xl font-black text-gray-900 mb-2">No orders found</h3>
          <p className="text-gray-400 font-medium">Orders containing your products will appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((order: Order) => {
            const myItems = order.items?.filter((item: OrderItem) => item.vendorId === vendorId) || [];
            const myTotal = myItems.reduce((s: number, i: OrderItem) => s + (i.price || 0) * (i.quantity || 0), 0);
            const isExpanded = expanded === order.id;
            const myVendorStatus = getVendorStatus(order, vendorId);
            const stepIndex = STATUS_STEPS.indexOf(myVendorStatus);
            return (
              <div key={order.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Clickable header */}
                <div
                  className="p-6 cursor-pointer hover:bg-gray-50 transition-all"
                  onClick={() => setExpanded(isExpanded ? null : order.id)}
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-black text-gray-900">{order.id}</p>
                        <span className={`inline-flex items-center justify-center h-5 px-2.5 rounded-full text-[9px] font-black uppercase leading-none ${statusColor[getVendorStatus(order, vendorId)] || 'bg-gray-100 text-gray-500'}`}>
                          {getVendorStatus(order, vendorId)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 font-medium">{order.date}</p>
                      {order.userName && <p className="text-xs text-gray-500 font-bold mt-0.5">Customer: {order.userName}</p>}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <p className="font-black text-brand-600 text-lg">৳{myTotal.toLocaleString()}</p>
                      <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'} text-gray-300 text-xs`}></i>
                    </div>
                  </div>

                  {/* Progress bar (non-cancelled only) */}
                  {order.status !== 'Cancelled' && stepIndex >= 0 && (
                    <div className="flex items-center gap-2 mt-4">
                      {STATUS_STEPS.map((s, i) => (
                        <React.Fragment key={s}>
                          <div className="flex items-center gap-1.5">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black transition-all ${i <= stepIndex ? 'gradient-primary text-white' : 'bg-gray-100 text-gray-300'}`}>
                              {i < stepIndex ? <i className="fas fa-check"></i> : i + 1}
                            </div>
                            <span className={`text-[9px] font-bold hidden sm:block ${i <= stepIndex ? 'text-gray-700' : 'text-gray-300'}`}>{s}</span>
                          </div>
                          {i < STATUS_STEPS.length - 1 && (
                            <div className={`flex-1 h-0.5 rounded-full ${i < stepIndex ? 'bg-brand-400' : 'bg-gray-100'}`} />
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  )}
                </div>

                {/* Expandable details */}
                {isExpanded && (
                  <div className="border-t border-gray-50 bg-gray-50/60 p-6">
                    <div className="space-y-2 mb-4">
                      {myItems.map((item: OrderItem, idx: number) => (
                        <div key={idx} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100">
                          {item.image && <img src={item.image} referrerPolicy="no-referrer" alt={item.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />}
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-gray-900 text-sm truncate">{item.name}</p>
                            <p className="text-xs text-gray-400 font-medium">৳{item.price?.toLocaleString()} × {item.quantity}</p>
                          </div>
                          <p className="font-black text-gray-700 text-sm shrink-0">৳{(item.price * item.quantity).toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                    {order.address && (
                      <div className="bg-white rounded-xl border border-gray-100 p-4 mb-3">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Delivery Address</p>
                        <p className="text-sm font-black text-gray-900">{(order.address as unknown as Record<string, string>).name} · {(order.address as unknown as Record<string, string>).phone}</p>
                        <p className="text-xs text-gray-500 font-medium">{(order.address as unknown as Record<string, string>).street}{(order.address as unknown as Record<string, string>).area ? `, ${(order.address as unknown as Record<string, string>).area}` : ''}, {(order.address as unknown as Record<string, string>).city}</p>
                      </div>
                    )}
                    {order.paymentMethod && (
                      <div className="bg-white rounded-xl border border-gray-100 p-4">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Payment Method</p>
                        <p className="text-sm font-black text-gray-900 capitalize">
                          {order.paymentMethod === 'cod' ? 'Cash on Delivery' : order.paymentMethod.charAt(0).toUpperCase() + order.paymentMethod.slice(1)}
                        </p>
                      </div>
                    )}

                    {/* Vendor Action Panel */}
                    <div className="mt-1 space-y-2">

                      {/* Cancel request forwarded by admin — vendor must decide */}
                      {order.cancelRequest === 'vendor_review' && (
                        <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                          <p className="text-xs font-black text-red-600 mb-1">
                            <i className="fas fa-exclamation-triangle mr-1.5"></i>
                            Admin forwarded a cancel request from customer
                          </p>
                          {order.cancelReason && (
                            <p className="text-[11px] text-red-400 font-medium mb-3">Reason: "{order.cancelReason}"</p>
                          )}
                          <div className="flex gap-2">
                            <button
                              onClick={e => { e.stopPropagation(); handleVendorCancelApprove(order.id); }}
                              className="px-5 py-2.5 bg-red-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-600 active:scale-95 transition-all"
                            >
                              <i className="fas fa-check mr-1.5"></i>Approve Cancel
                            </button>
                            <button
                              onClick={e => { e.stopPropagation(); handleVendorCancelReject(order.id); }}
                              className="px-5 py-2.5 bg-gray-100 text-gray-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-200 active:scale-95 transition-all"
                            >
                              <i className="fas fa-times mr-1.5"></i>Cannot Cancel
                            </button>
                          </div>
                          <p className="text-[9px] font-medium text-red-300 mt-2">Customer will be notified automatically after your decision.</p>
                        </div>
                      )}

                      {/* Normal Processing — mark as shipped (only if no cancel pending) */}
                      {getVendorStatus(order, vendorId) === 'Processing' && !['vendor_review', 'pending'].includes(String(order.cancelRequest)) && (
                        <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                          <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 mb-3">
                            <i className="fas fa-box-open mr-1.5"></i>Ready to dispatch?
                          </p>
                          <button
                            onClick={e => { e.stopPropagation(); handleMarkShipped(order.id); }}
                            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 active:scale-95 transition-all shadow-sm"
                          >
                            <i className="fas fa-truck mr-2"></i>Mark as Shipped
                          </button>
                          <p className="text-[9px] font-medium text-amber-400 mt-2">Admin will confirm delivery after shipment.</p>
                        </div>
                      )}

                      {/* Cancel request pending admin review */}
                      {order.cancelRequest === 'pending' && (
                        <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 flex items-center gap-3">
                          <i className="fas fa-clock text-amber-400"></i>
                          <div>
                            <p className="text-xs font-black text-amber-700">Cancel Request Under Review</p>
                            <p className="text-[10px] font-medium text-amber-400">Admin is reviewing the customer's cancellation request.</p>
                          </div>
                        </div>
                      )}

                      {/* Shipped — waiting for admin delivery confirmation */}
                      {getVendorStatus(order, vendorId) === 'Shipped' && (
                        <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 flex items-center gap-3">
                          <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
                            <i className="fas fa-truck text-blue-500 text-sm"></i>
                          </div>
                          <div>
                            <p className="text-xs font-black text-blue-700">In Transit</p>
                            <p className="text-[10px] font-medium text-blue-400">Waiting for admin to confirm delivery.</p>
                          </div>
                        </div>
                      )}

                      {/* Delivered */}
                      {getVendorStatus(order, vendorId) === 'Delivered' && (
                        <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center gap-3">
                          <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center shrink-0">
                            <i className="fas fa-check-circle text-emerald-500 text-sm"></i>
                          </div>
                          <div>
                            <p className="text-xs font-black text-emerald-700">Delivered</p>
                            <p className="text-[10px] font-medium text-emerald-400">Revenue counted in analytics.</p>
                          </div>
                        </div>
                      )}

                      {/* Cancelled */}
                      {getVendorStatus(order, vendorId) === 'Cancelled' && (
                        <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex items-center gap-3">
                          <div className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center shrink-0">
                            <i className="fas fa-ban text-gray-400 text-sm"></i>
                          </div>
                          <div>
                            <p className="text-xs font-black text-gray-600">Order Cancelled</p>
                            <p className="text-[10px] font-medium text-gray-400">This order is no longer active.</p>
                          </div>
                        </div>
                      )}

                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default VendorOrdersView;
