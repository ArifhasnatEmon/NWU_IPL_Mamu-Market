
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, AdminDashboardData } from '../../types';
import { mapProduct, mapReportedReview, mapReportedProduct } from '../../lib/dbMappers';
import OrderManagementPanel from '../../components/admin/OrderManagementPanel';
import SupportTicketsPanel from '../../components/admin/SupportTicketsPanel';
import PageTitle from '../../components/PageTitle';
import ApprovalsPanel from '../../components/admin/ApprovalsPanel';
import MarketingPanel from '../../components/admin/MarketingPanel';
import CategoryManagementTab from '../../components/admin/marketing/CategoryManagementTab';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';

import { emailTemplates } from '../../utils/emailTemplates';
import { useOrders } from '../../hooks/useOrders';
import { useVendorRequests } from '../../hooks/useVendorRequests';

import { useSupportTickets } from '../../hooks/useSupport';
import { usePromoCodes } from '../../hooks/useMarketing';
import { useRealtimeSubscription } from '../../hooks/useRealtimeSubscription';
import { supabase } from '../../lib/supabase';

const AdminDashboardView: React.FC = () => {
  const { user, handleLogout } = useAuth();
  const { setToast, toast } = useApp();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Overview');
  const { orders: allOrders } = useOrders(user);
  const { requests, updateRequestStatus, refresh: refreshRequests } = useVendorRequests();
  const { promoCodes, refreshPromoCodes } = usePromoCodes();

  const { tickets: allTickets, fetchTickets: refreshAllTickets } = useSupportTickets();

  const [suspendModal, setSuspendModal] = useState(false);
  const [suspendTarget, setSuspendTarget] = useState<User | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [customReason, setCustomReason] = useState('');

  const [revokeModal, setRevokeModal] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<User | null>(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [customRevokeReason, setCustomRevokeReason] = useState('');

  const [data, setData] = useState<AdminDashboardData>({
    users: [],
    pendingProducts: [],
    pendingUpdates: [],
    removeRequests: [],
    categoryRequests: [],
    categorySuggestions: [],
    storeNameRequests: [],
    verificationRequests: [],
    accountDeleteRequests: [],
    approvedProducts: [],
    reportedReviews: [],
    reportedProducts: [],
    vendorRequests: [],
  });

  const refreshData = async () => {
    // Refresh vendor requests first so we have fresh data
    await refreshRequests();
    await rebuildData();
  };

  // Keep rebuildData fresh in a ref for realtime callbacks without closure staleness
  const rebuildRef = React.useRef<() => Promise<void>>(async () => {});

  // Build admin data whenever requests or other dependencies update
  const rebuildData = async () => {

    let uniqueUsers: any[] = [];
    try {
      const { data: profs, error } = await supabase.from('profiles').select('*');
      if (error) throw error;
      if (profs) {
        uniqueUsers = profs.map(p => ({
          id: p.id,
          name: p.name,
          email: p.email,
          role: p.role,
          status: p.status,
          avatar: p.avatar || '',
          phone: p.phone || '',
          address: p.address || '',
          nickname: p.nickname || '',
          storeName: p.store_name || '',
          storeDescription: p.store_description || '',
          storeCategory: p.store_category || '',
          storeCity: p.store_city || '',
          banner: p.banner || '',
          verified: p.verified || false,
          socialFacebook: p.social_facebook || '',
          socialInstagram: p.social_instagram || '',
          socialYoutube: p.social_youtube || '',
          socialWhatsapp: p.social_whatsapp || '',
          promotion_enabled: p.promotion_enabled || false,
          suspendReason: p.suspend_reason || '',
          addresses: p.addresses || []
        }));
      }
    } catch (e) {
      console.error('Error fetching profiles:', e);
    }

    let pendingProducts: any[] = [];
    let approvedProducts: any[] = [];
    let pendingUpdates: any[] = [];
    let repReviews: any[] = [];
    let reportedProds: any[] = [];

    try {
      const { data: prods, error: prodErr } = await supabase.from('products').select('*');
      if (prodErr) throw prodErr;

      if (prods) {
        pendingProducts = prods.filter(p => p.status === 'pending').map(mapProduct);
        approvedProducts = prods.filter(p => p.status === 'approved').map(mapProduct);
      }

      const { data: upds, error: updErr } = await supabase.from('product_updates').select('*').eq('status', 'pending');
      if (!updErr && upds) {
        pendingUpdates = upds.map(u => ({
          ...u,
          productId: u.product_id,
          vendorId: u.vendor_id,
          changes: u.changes
        }));
      }

      const { data: repRev, error: repRevErr } = await supabase.from('reported_reviews').select('*');
      if (!repRevErr && repRev) {
        repReviews = repRev.map(mapReportedReview);
      }

      const { data: prodReports, error: prodRepErr } = await supabase.from('reported_products').select('*');
      if (!prodRepErr && prodReports) {
        reportedProds = prodReports.map(mapReportedProduct);
      }
    } catch (e) {
      console.error('Error fetching database data:', e);
    }

    // Only show pending requests in each category
    const pendingRequests = requests.filter(r => r.status === 'pending');

    setData({
      users: uniqueUsers as User[],
      pendingProducts,
      pendingUpdates,
      removeRequests: pendingRequests.filter(r => r.request_type === 'product_remove'),
      categoryRequests: pendingRequests.filter(r => r.request_type === 'category_add'),
      categorySuggestions: pendingRequests.filter(r => r.request_type === 'category_suggest'),
      storeNameRequests: pendingRequests.filter(r => r.request_type === 'store_name'),
      verificationRequests: pendingRequests.filter(r => r.request_type === 'verification'),
      accountDeleteRequests: pendingRequests.filter(r => r.request_type === 'account_delete'),
      approvedProducts: approvedProducts,
      reportedReviews: typeof repReviews !== 'undefined' ? repReviews : [],
      reportedProducts: typeof reportedProds !== 'undefined' ? reportedProds : [],
      vendorRequests: uniqueUsers.filter((u: any) => u.role === 'vendor' && u.status === 'pending'),
    });
  };

  useEffect(() => {
    rebuildRef.current = rebuildData;
  });

  useEffect(() => {
    rebuildData();
  }, []);

  // Re-sync data whenever requests change (realtime or after approve/reject)
  useEffect(() => {
    rebuildData();
  }, [requests]);

  // Handle realtime events from tables that AdminDashboardView manually queries
  const handleRealtimeEvent = React.useCallback(() => {
    rebuildRef.current();
  }, []);

  useRealtimeSubscription({ table: 'profiles', channelName: 'rt-admin-profiles', onEvent: handleRealtimeEvent });
  useRealtimeSubscription({ table: 'products', channelName: 'rt-admin-products', onEvent: handleRealtimeEvent });
  useRealtimeSubscription({ table: 'product_updates', channelName: 'rt-admin-updates', onEvent: handleRealtimeEvent });
  useRealtimeSubscription({ table: 'reported_reviews', channelName: 'rt-admin-reported-reviews', onEvent: handleRealtimeEvent });
  useRealtimeSubscription({ table: 'reported_products', channelName: 'rt-admin-reported-products', onEvent: handleRealtimeEvent });

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(''), 3000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  if (user?.role !== 'admin') return null;

  const handleProductReportAction = async (reportId: string, remove: boolean) => {
    const report = data.reportedProducts?.find(r => r.id === reportId);
    if (remove && report) {
    } else {
    }
    refreshData();
  };

  const handleAccountDeleteRequest = async (reqId: string, userId: string, approve: boolean) => {
    try {
      setToast('Processing account deletion request...');
      if (approve) {
        await supabase.from('profiles').delete().eq('id', userId);
      }
      await supabase.from('vendor_requests').update({ status: approve ? 'approved' : 'rejected' }).eq('id', reqId);

      setToast(approve ? 'Account deletion approved.' : 'Request rejected.');
      refreshData();
    } catch (e: any) {
      setToast('Error processing request.');
    }
  };

  const handleVendorAction = async (userId: string, status: 'approved' | 'rejected') => {
    try {
      setToast('Updating vendor status...');

      const { error } = await supabase.from('profiles').update({ status }).eq('id', userId);
      if (error) throw error;

      if (status === 'approved') {

      }
      setToast(`Vendor ${status}`);
      refreshData();
    } catch (e: any) {
      setToast('Error updating vendor status.');
    }
  };

  const handleProductApproval = async (productId: string, approve: boolean, reason?: string) => {
    try {
      setToast(approve ? 'Approving product, please wait...' : 'Rejecting product, please wait...');
      const newStatus = approve ? 'approved' : 'rejected';
      const { error } = await supabase.from('products').update({ status: newStatus }).eq('id', productId);
      if (error) throw error;

      const product = data.pendingProducts.find((p: any) => p.id === productId);
      if (product && product.vendorId) {
        // Fetch the vendor's email address from the database so we know where to send the notification
        const { data: vProfile } = await supabase.from('profiles').select('email, name').eq('id', product.vendorId).single();
        const vendorEmail = vProfile?.email;
        const vendorName = vProfile?.name || 'Vendor';

        if (approve) {
          if (vendorEmail) emailTemplates.productStatusUpdate(vendorEmail, vendorName, product.productName || '', 'Approved').catch(console.error);
        } else {
          if (vendorEmail) emailTemplates.productStatusUpdate(vendorEmail, vendorName, product.productName || '', 'Rejected', reason).catch(console.error);
        }
      }
      refreshData();
      setToast(approve ? 'Product approved successfully!' : 'Product rejected successfully.');
    } catch (e) {
      console.error('Product approval error:', e);
      setToast('Error approving product.');
    }
  };

  const handlePromoCodeAction = async (promoId: string, approve: boolean) => {
    try {
      setToast(approve ? 'Approving promo code...' : 'Rejecting promo code...');
      const newStatus = approve ? 'approved' : 'rejected';
      const isActive = approve ? true : false;
      
      const { error } = await supabase.from('promo_codes').update({ 
        status: newStatus,
        active: isActive 
      }).eq('id', promoId);
      
      if (error) throw error;
      
      // Find promo code to notify vendor
      const promo = promoCodes.find((p: any) => p.id === promoId);
      if (promo && promo.vendor_id) {
        if (approve) {

        }
      }
      
      setToast(`Promo code ${newStatus}`);
      refreshPromoCodes();
    } catch (e: any) {
      console.error('Promo approval error:', e);
      setToast('Error updating promo code status.');
    }
  };

  const handleUpdateApproval = async (updateId: string, approve: boolean) => {
    try {
      const update = data.pendingUpdates.find((u: any) => u.id === updateId);
      if (!update) {
        setToast('Error: Update request not found in state.');
        return;
      }

      if (approve) {
        // Apply changes to the product
        const { error: updateError } = await supabase.from('products').update(update.changes).eq('id', update.productId);
        
        if (updateError) {
          console.error('Product update failed:', updateError);
          setToast(`Failed to apply changes: ${updateError.message || 'Database error'}`);
          return; // Stop execution, do not mark as approved
        }

        const { error: statusErr } = await supabase.from('product_updates').update({ status: 'approved' }).eq('id', updateId);
        if (statusErr) throw statusErr;
      } else {
        const { error: statusErr } = await supabase.from('product_updates').update({ status: 'rejected' }).eq('id', updateId);
        if (statusErr) throw statusErr;
      }
      
      setToast(approve ? 'Update approved successfully!' : 'Update rejected successfully.');
      await refreshData();
    } catch (e: any) {
      console.error('Update approval error:', e);
      setToast(`Error approving update: ${e.message || 'Unknown error'}`);
    }
  };

  const handleRemoveRequest = async (requestId: string, approve: boolean) => {
    const request = requests.find((r: any) => r.id === requestId);
    if (approve && request) {
      try {
        // Actually delete the product from the database
        const productId = request.current_value;
        if (productId) {
          const { error: deleteErr } = await supabase.from('products').delete().eq('id', productId);
          if (deleteErr) {
            console.error('Error deleting product:', deleteErr);
            setToast('Error deleting product: ' + deleteErr.message);
            return;
          }
        }
      } catch (e) {
        console.error("Error deleting product", e);
        setToast('Error processing removal request.');
        return;
      }
    } else if (request) {

    }

    if (request && request.vendor_id) {
      const { data: vProfile } = await supabase.from('profiles').select('email, name').eq('id', request.vendor_id).single();
      if (vProfile?.email) {
        emailTemplates.vendorRequestStatus(vProfile.email, vProfile.name || 'Vendor', 'Product Removal', approve ? 'Approved' : 'Rejected').catch(console.error);
      }
    }

    await updateRequestStatus(requestId, approve ? 'approved' : 'rejected');
    setToast(approve ? 'Product removed successfully' : 'Removal request rejected');
    refreshData();
  };

  const handleUserStatus = async (userId: string, newStatus: string, reason?: string) => {
    refreshData();
  };

  const handleReviewAction = async (reviewId: string, removeFromProduct = false) => {
    try {
      if (removeFromProduct) {
        // Delete review
      } else {
        // Dismiss
      }
      refreshData();
    } catch (e) {
      console.error('Error handling review action:', e);
    }
  };

  const handleCategoryRequest = async (reqId: string, approve: boolean) => {
    const request = requests.find((r: any) => r.id === reqId);
    if (approve && request && request.requested_value && request.vendor_id) {
      // Add the category to the vendor's store_category field
      const { data: vendorProfile } = await supabase.from('profiles').select('store_category').eq('id', request.vendor_id).single();
      const currentCats = (vendorProfile?.store_category || '').split(',').map((c: string) => c.trim()).filter(Boolean);
      if (!currentCats.includes(request.requested_value)) {
        const updatedCats = [...currentCats, request.requested_value].join(', ');
        const { error: updateErr } = await supabase.from('profiles').update({ store_category: updatedCats }).eq('id', request.vendor_id);
        if (updateErr) console.error('Error updating vendor categories:', updateErr);
      }
    } else if (request) {
    }
    if (request && request.vendor_id) {
      const { data: vProfile } = await supabase.from('profiles').select('email, name').eq('id', request.vendor_id).single();
      if (vProfile?.email) {
        emailTemplates.vendorRequestStatus(vProfile.email, vProfile.name || 'Vendor', 'Category Addition', approve ? 'Approved' : 'Rejected').catch(console.error);
      }
    }
    await updateRequestStatus(reqId, approve ? 'approved' : 'rejected');
    refreshData();
  };

  const handleCategorySuggestion = async (reqId: string, approve: boolean) => {
    const request = requests.find((r: any) => r.id === reqId);
    if (approve && request && request.requested_value) {
      // Just acknowledge — don't add to the vendor's profile
      // Insert into categories table so it appears in Category Management
      const { error: catErr } = await supabase.from('categories').insert({ name: request.requested_value, icon: 'fa-tag' });
      if (catErr && catErr.code !== '23505') console.error('Error creating category:', catErr); // ignore duplicate
    } else if (request) {
    }
    if (request && request.vendor_id) {
      const { data: vProfile } = await supabase.from('profiles').select('email, name').eq('id', request.vendor_id).single();
      if (vProfile?.email) {
        emailTemplates.vendorRequestStatus(vProfile.email, vProfile.name || 'Vendor', 'Category Suggestion', approve ? 'Acknowledged' : 'Rejected').catch(console.error);
      }
    }
    await updateRequestStatus(reqId, approve ? 'approved' : 'rejected');
    refreshData();
  };

  const handleStoreNameRequest = async (reqId: string, approve: boolean) => {
    const request = requests.find((r: any) => r.id === reqId);

    if (approve && request) {
      const { error: updateErr } = await supabase.from('profiles').update({ store_name: request.requested_value }).eq('id', request.vendor_id);
      if (updateErr) console.error('Error updating store name:', updateErr);
    } else if (request) {
    }

    if (request && request.vendor_id) {
      const { data: vProfile } = await supabase.from('profiles').select('email, name').eq('id', request.vendor_id).single();
      if (vProfile?.email) {
        emailTemplates.vendorRequestStatus(vProfile.email, vProfile.name || 'Vendor', 'Store Name Change', approve ? 'Approved' : 'Rejected').catch(console.error);
      }
    }

    await updateRequestStatus(reqId, approve ? 'approved' : 'rejected');
    refreshData();
  };

  const handleVerificationRequest = async (reqId: string, approve: boolean) => {
    const request = requests.find((r: any) => r.id === reqId);

    if (approve && request) {
      const { error: verifyErr } = await supabase.from('profiles').update({ verified: true }).eq('id', request.vendor_id);
      if (verifyErr) console.error('Error verifying vendor:', verifyErr);
    } else if (request) {
    }

    if (request && request.vendor_id) {
      const { data: vProfile } = await supabase.from('profiles').select('email, name').eq('id', request.vendor_id).single();
      if (vProfile?.email) {
        emailTemplates.vendorRequestStatus(vProfile.email, vProfile.name || 'Vendor', 'Store Verification', approve ? 'Approved' : 'Rejected').catch(console.error);
      }
    }

    await updateRequestStatus(reqId, approve ? 'approved' : 'rejected');
    refreshData();
  };

  const handleRevokeVerification = (user: any) => {
    setRevokeTarget(user);
    setRevokeModal(true);
    setRevokeReason('');
    setCustomRevokeReason('');
  };

  const confirmRevocation = async () => {
    const finalReason = revokeReason === 'Custom reason' ? customRevokeReason : revokeReason;
    if (!finalReason || !revokeTarget) return;

    try {
      setToast('Revoking verification...');

      const { error } = await supabase.from('profiles').update({ verified: false }).eq('id', revokeTarget.id);
      if (error) throw error;

      setRevokeModal(false);
      setToast('Verification revoked');
      refreshData();
    } catch (e: any) {
      setToast('Error revoking verification');
    }
  };
  const tabs = ["Overview", "Vendor Approvals", "Product Approvals", "Verification Requests", "Remove Requests", "Store Requests", "Account Requests", "User Management", "Vendor Management", "Reviews & Reports", "Product Monitor", "Flash Deals", "Sponsored Picks", "Category Management", "Promo Codes", "Order Management", "Customer Tickets", "Vendor Tickets", "Monitored Chats"];

  let pendingCounts: Record<string, number> = {};
  try {
    pendingCounts = {
      'Vendor Approvals': data.vendorRequests?.filter(r => r.status === 'pending').length || 0,
      'Product Approvals': [
        ...data.pendingProducts.filter((p: any) => p.status !== 'rejected'),
        ...data.pendingUpdates
      ].length,
      'Verification Requests': requests.filter(r => r.request_type === 'verification' && r.status === 'pending').length,
      'Remove Requests': requests.filter(r => r.request_type === 'product_remove' && r.status === 'pending').length,
      'Store Requests': requests.filter(r => ['store_name', 'category_remove', 'city_change', 'email_change'].includes(r.request_type) && r.status === 'pending').length
        + requests.filter(r => ['category_add', 'category_suggest'].includes(r.request_type) && r.status === 'pending').length,
      'Account Requests': requests.filter(r => r.request_type === 'account_delete' && r.status === 'pending').length,
      'Customer Tickets': allTickets.filter((r: any) => r.status === 'open' && r.userRole !== 'vendor').length,
      'Vendor Tickets': allTickets.filter((r: any) => r.status === 'open' && r.userRole === 'vendor').length,
      'Monitored Chats': allTickets.filter((r: any) => r.status === 'open' && r.category === 'vendor_inquiry').length,
      'Order Management': allOrders.filter(
        (o: any) => o.cancelRequest === 'pending' || o.cancelRequest === 'vendor_approved' || o.cancelRequest === 'vendor_rejected'
      ).length,
      'Promo Codes': promoCodes.filter((c: any) => c.status === 'pending').length,
    };
  } catch (err) { console.error('pending counts error', err); }

  return (
    <div className="min-h-screen flex flex-col font-sans">
      <PageTitle title="Admin Dashboard" />
      {/* Top Bar */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-gray-900 px-8 flex items-center justify-between z-50">
        <div className="text-white font-black text-xl tracking-tighter">
          Mamu Market Admin
        </div>
        <div className="flex items-center gap-4">
          <span className="text-white font-bold text-sm">{user.name}</span>
          <button
            onClick={() => { handleLogout(); setToast('Logged out successfully'); setTimeout(() => navigate('/'), 100); }}
            className="bg-white text-gray-900 rounded-xl px-4 py-2 font-black text-sm hover:bg-gray-100 transition-colors"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex flex-1 pt-16">
        {/* Sidebar */}
        <aside className="w-64 bg-[#0f0a1e] pt-6 px-3 fixed h-[calc(100vh-64px)] overflow-y-auto">
          {(() => {
            const groups = [
              {
                label: 'Dashboard',
                items: ['Overview'],
              },
              {
                label: 'Approvals',
                items: ['Vendor Approvals', 'Product Approvals', 'Verification Requests', 'Remove Requests', 'Store Requests', 'Account Requests'],
              },
              {
                label: 'Users & Content',
                items: ['User Management', 'Vendor Management', 'Reviews & Reports', 'Product Monitor', 'Category Management'],
              },
              {
                label: 'Marketing',
                items: ['Hero Banners', 'Top Ticker', 'Flash Deals', 'Sponsored Picks'],
              },
              {
                label: 'Finance',
                items: ['Promo Codes', 'Order Management'],
              },
              {
                label: 'Support',
                items: ['Customer Tickets', 'Vendor Tickets', 'Monitored Chats'],
              },
            ];

            const tabIcons: Record<string, string> = {
              'Overview': 'fa-chart-pie',
              'Vendor Approvals': 'fa-store',
              'Product Approvals': 'fa-box',
              'Verification Requests': 'fa-shield-alt',
              'Remove Requests': 'fa-trash',
              'Store Requests': 'fa-edit',
              'Account Requests': 'fa-user-cog',
              'User Management': 'fa-users',
              'Vendor Management': 'fa-user-tie',
              'Reviews & Reports': 'fa-star',
              'Flash Deals': 'fa-bolt',
              'Sponsored Picks': 'fa-star',
              'Hero Banners': 'fa-image',
              'Top Ticker': 'fa-bullhorn',
              'Promo Codes': 'fa-tag',
              'Category Management': 'fa-tags',
              'Order Management': 'fa-shopping-bag',
              'Product Monitor': 'fa-chart-bar',
              'Customer Tickets': 'fa-headset',
              'Vendor Tickets': 'fa-life-ring',
              'Monitored Chats': 'fa-comments',
            };

            return (
              <div className="space-y-1">
                {groups.map(group => (
                  <div key={group.label} className="mb-4">
                    <p className="text-[9px] font-black uppercase tracking-[0.18em] text-white/25 px-3 mb-2">{group.label}</p>
                    {group.items.map(tab => {
                      const isActive = activeTab === tab;
                      const count = pendingCounts[tab] || 0;
                      return (
                        <button
                          key={tab}
                          onClick={() => setActiveTab(tab)}
                          className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl mb-0.5 transition-all border-l-2 ${isActive
                            ? 'bg-white/10 text-white border-l-[#7c3aed]'
                            : 'text-white/40 hover:text-white/80 hover:bg-white/5 border-l-transparent'
                            }`}
                        >
                          <i className={`fas ${tabIcons[tab]} text-[11px] w-4 text-center ${isActive ? 'text-[#a855f7]' : ''}`}></i>
                          <span className="flex-1 text-[12px] font-bold">{tab}</span>
                          {count > 0 && (
                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center ${isActive ? 'bg-white/20 text-white' : 'bg-red-500 text-white'}`}>
                              {count}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            );
          })()}
        </aside>

        {/* Content Area */}
        <main className="flex-1 bg-gray-50 p-8 ml-64 overflow-y-auto min-h-[calc(100vh-64px)]">
          <h2 className="text-2xl font-black text-gray-900 mb-8 tracking-tight">{activeTab}</h2>

          {activeTab === 'Overview' && (
            <div>
              {(() => {
                const allUsers = data.users;
                const vendors = allUsers.filter((u: any) => u.role === 'vendor');
                const customers = allUsers.filter((u: any) => u.role === 'customer');
                const approvedProducts = data.approvedProducts;
                const pendingProducts = data.pendingProducts;
                const getCommission = (price: number) => price >= 5000 ? 0.10 : price >= 1000 ? 0.15 : 0.20;
                const deliveredOrders = allOrders.filter((o: any) => (o.status || '').toLowerCase() === 'delivered');
                const totalRevenue = deliveredOrders.reduce((sum: number, o: any) => {
                  const orderCommission = (o.items || []).reduce((s: number, item: any) => {
                    const price = Number(item.price) || 0;
                    return s + price * (Number(item.quantity) || 1) * getCommission(price);
                  }, 0);
                  return sum + orderCommission;
                }, 0);
                const totalGMV = deliveredOrders.reduce((sum: number, o: any) => sum + (Number(o.total) || 0), 0);
                const totalPending = [
                  ...data.pendingProducts,
                  ...requests.filter(r => ['verification', 'store_name', 'category_add'].includes(r.request_type) && r.status === 'pending'),
                ];
                return (
                  <div className="space-y-8">
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                      {[
                        { label: 'Platform Revenue', value: '৳' + Math.round(totalRevenue).toLocaleString(), icon: 'fa-taka-sign', color: 'text-emerald-600', bg: 'bg-emerald-50' },
                        { label: 'Total Vendors', value: vendors.length, icon: 'fa-store', color: 'text-purple-600', bg: 'bg-purple-50' },
                        { label: 'Total Customers', value: customers.length, icon: 'fa-users', color: 'text-blue-600', bg: 'bg-blue-50' },
                        { label: 'Active Products', value: approvedProducts.length, icon: 'fa-box', color: 'text-green-600', bg: 'bg-green-50' },
                        { label: 'Pending Actions', value: Object.values(pendingCounts).reduce((a, b) => a + (typeof b === 'number' ? b : 0), 0), icon: 'fa-clock', color: 'text-amber-600', bg: 'bg-amber-50' },
                      ].map(stat => (
                        <div key={stat.label} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                          <div className={`w-12 h-12 rounded-2xl ${stat.bg} flex items-center justify-center mb-4`}>
                            {stat.icon === 'fa-taka-sign' ? (
                              <span className={`text-xl font-black ${stat.color}`}>৳</span>
                            ) : (
                              <i className={`fas ${stat.icon} ${stat.color}`}></i>
                            )}
                          </div>
                          <p className="text-3xl font-black text-gray-900">{stat.value}</p>
                          <p className="text-xs font-black text-gray-400 uppercase tracking-widest mt-1">{stat.label}</p>
                        </div>
                      ))}

                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                        <h3 className="font-black text-gray-900 mb-4 uppercase tracking-widest text-sm">Recent Orders</h3>
                        {allOrders.length === 0 && <p className="text-gray-400 font-bold text-sm">No orders yet</p>}
                        <div className="space-y-3">
                          {allOrders.filter((o: any) => o.status !== 'Cancelled').slice(0, 5).map((order: any) => (
                            <div key={order.id} className="flex items-center justify-between py-2 border-b border-gray-50">
                              <div>
                                <p className="font-black text-gray-900 text-sm">{order.id}</p>
                                <p className="text-xs text-gray-400 font-medium">{order.userName || 'Customer'}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-black text-gray-900 text-sm">৳{order.total?.toLocaleString()}</p>
                                <span className={`inline-flex items-center justify-center h-5 px-2.5 rounded-full text-[10px] font-black leading-none ${order.status === 'Delivered' ? 'bg-green-50 text-green-600' :
                                  order.status === 'Shipped' ? 'bg-blue-50 text-blue-600' :
                                    'bg-amber-50 text-amber-600'
                                  }`}>{order.status}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                        <h3 className="font-black text-gray-900 mb-4 uppercase tracking-widest text-sm">Pending Actions</h3>
                        {Object.values(pendingCounts).reduce((a, b) => a + (typeof b === 'number' ? b : 0), 0) === 0 ? (
                          <p className="text-gray-400 font-bold text-sm">All clear!</p>
                        ) : (
                          <div className="space-y-3">
                            {Object.entries(pendingCounts)
                              .filter(([_, count]) => typeof count === 'number' && count > 0)
                              .map(([category, count]) => (
                                <div key={category} className="flex items-center gap-3 py-2 border-b border-gray-50">
                                  <div className="w-8 h-8 bg-amber-50 rounded-xl flex items-center justify-center shrink-0">
                                    <i className="fas fa-exclamation-circle text-amber-500 text-xs"></i>
                                  </div>
                                  <div>
                                    <p className="font-black text-gray-900 text-sm">{count} {category}</p>
                                    <p className="text-xs text-gray-400 font-medium">Requires your attention</p>
                                  </div>
                                  <button onClick={() => setActiveTab(category)} className="ml-auto text-xs font-black text-brand-600 hover:underline shrink-0">Review</button>
                                </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          <ApprovalsPanel
            activeTab={activeTab}
            data={data}
            setToast={setToast}
            refreshData={refreshData}
            handleAccountDeleteRequest={handleAccountDeleteRequest}
            handleVendorAction={handleVendorAction}
            handleVerificationRequest={handleVerificationRequest}
            handleProductApproval={handleProductApproval}
            handleRemoveRequest={handleRemoveRequest}
            handleUpdateApproval={handleUpdateApproval}
            handleCategoryRequest={handleCategoryRequest}
            handleCategorySuggestion={handleCategorySuggestion}
            handleStoreNameRequest={handleStoreNameRequest}
          />

          {(activeTab === 'User Management' || activeTab === 'Vendor Management') && (() => {
            const displayUsers = data.users.filter((u: any) =>
              activeTab === 'Vendor Management' ? u.role === 'vendor' : u.role === 'customer'
            );
            return (
              <div>
                {displayUsers.length > 0 ? (
                  displayUsers.map((u: any) => (
                    <div key={u.id} className="bg-white rounded-2xl border border-gray-100 p-6 mb-4 shadow-sm flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center font-black text-gray-400">
                          {u.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-black text-gray-900 flex items-center gap-2 flex-wrap">
                            {u.name}
                            {u.verified && <i className="fas fa-check-circle text-blue-500 text-xs" title="Verified Vendor"></i>}
                            {u.role === 'vendor' && u.storeName && <span className="text-xs font-bold text-brand-600">({u.storeName})</span>}
                          </h3>
                          <p className="text-gray-400 text-sm font-medium">{u.email}</p>
                          {(u.phone || u.storeCity) && (
                            <div className="flex gap-3 mt-1 flex-wrap">
                              {u.phone && <span className="text-[11px] text-gray-500 font-medium"><i className="fas fa-phone text-gray-300 mr-1"></i>{u.phone}</span>}
                              {u.storeCity && <span className="text-[11px] text-gray-500 font-medium"><i className="fas fa-map-marker-alt text-gray-300 mr-1"></i>{u.storeCity}</span>}
                              {u.address && <span className="text-[11px] text-gray-500 font-medium truncate max-w-[200px]"><i className="fas fa-home text-gray-300 mr-1"></i>{u.address}</span>}
                            </div>
                          )}
                          {u.role === 'vendor' && u.categories && u.categories.length > 0 && (
                            <div className="flex gap-1 mt-1 flex-wrap">
                              {u.categories.slice(0, 3).map((c: string) => <span key={c} className="text-[9px] font-black text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{c}</span>)}
                            </div>
                          )}
                          <div className="flex gap-2 mt-2 flex-wrap">
                            <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider ${u.role === 'customer' ? 'bg-blue-100 text-blue-600' : 'bg-brand-100 text-brand-600'
                              }`}>
                              {u.role}
                            </span>
                            <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider ${u.status === 'suspended' ? 'bg-red-100 text-red-600' :
                              u.status === 'pending' ? 'bg-yellow-100 text-yellow-600' :
                                'bg-emerald-100 text-emerald-600'
                              }`}>
                              {u.status === 'suspended' ? 'Suspended' : u.status === 'pending' ? 'Pending' : 'Active'}
                            </span>
                            {u.role === 'vendor' && (() => {
                              const getComm = (price: number) => price >= 5000 ? 0.10 : price >= 1000 ? 0.15 : 0.20;
                              
                              const deliveredForVendor = allOrders.filter((o: any) => {
                                const st = (o.vendor_statuses && o.vendor_statuses[u.id]) || (o.vendorStatuses && o.vendorStatuses[u.id]) || o.status || '';
                                return st.toLowerCase() === 'delivered';
                              });

                              const grossRevenue = deliveredForVendor.reduce((sum: number, o: any) => {
                                return sum + (o.items || [])
                                  .filter((i: any) => i.vendorId === u.id)
                                  .reduce((s: number, i: any) => s + (Number(i.price) || 0) * (Number(i.quantity) || 1), 0);
                              }, 0);
                              
                              const commission = deliveredForVendor.reduce((sum: number, o: any) => {
                                return sum + (o.items || [])
                                  .filter((i: any) => i.vendorId === u.id)
                                  .reduce((s: number, i: any) => {
                                    const p = Number(i.price) || 0;
                                    return s + p * (Number(i.quantity) || 1) * getComm(p);
                                  }, 0);
                              }, 0);
                              const netRevenue = grossRevenue - commission;
                              if (grossRevenue === 0) return null;
                              return (
                                <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full" title={`Gross: ৳${Math.round(grossRevenue).toLocaleString()} | Commission: ৳${Math.round(commission).toLocaleString()}`}>
                                  ৳{Math.round(netRevenue).toLocaleString()} earned
                                </span>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 items-end">
                        {u.verified && (
                          <button
                            onClick={() => handleRevokeVerification(u)}
                            className="bg-orange-100 text-orange-600 rounded-xl px-3 py-1 text-xs font-black hover:bg-orange-200 transition-colors mb-1"
                          >
                            Revoke Verification
                          </button>
                        )}
                        {u.status !== 'suspended' ? (
                          <button
                            onClick={() => { setSuspendTarget(u); setSuspendModal(true); setSuspendReason(''); setCustomReason(''); }}
                            className="bg-red-100 text-red-600 rounded-xl px-3 py-1 text-xs font-black hover:bg-red-200 transition-colors"
                          >
                            Suspend
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUserStatus(u.id, 'active')}
                            className="bg-emerald-100 text-emerald-600 rounded-xl px-3 py-1 text-xs font-black hover:bg-emerald-200 transition-colors"
                          >
                            Activate
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-400 text-center py-20 font-bold">No users found</p>
                )}
              </div>
            );
          })()}

          {activeTab === 'Reviews & Reports' && (
            <div className="space-y-10">
              <div>
                <h3 className="text-xl font-black text-gray-900 mb-4 flex items-center gap-3">
                  Reported Reviews
                  <span className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-xs font-black">{data.reportedReviews.length}</span>
                </h3>
                {data.reportedReviews.length > 0 ? data.reportedReviews.map((r: any) => (
                  <div key={r.id} className="bg-white rounded-2xl border border-gray-100 p-6 mb-4 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="font-black text-gray-900">{r.reviewerName}</h4>
                        <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Product: {r.productName}</p>
                      </div>
                      <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase">Reported</span>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4 mb-4">
                      <p className="text-gray-600 text-sm italic">"{r.reviewText}"</p>
                      {r.reportReason && <p className="text-red-500 text-[10px] font-black uppercase tracking-widest mt-3">Reason: {r.reportReason}</p>}
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => handleReviewAction(r.id, true)} className="bg-red-500 text-white rounded-xl px-4 py-2 text-xs font-black hover:bg-red-600 transition-colors">🗑 Remove Review</button>
                      <button onClick={() => handleReviewAction(r.id, false)} className="bg-gray-100 text-gray-600 rounded-xl px-4 py-2 text-xs font-black hover:bg-gray-200 transition-colors">✓ Dismiss</button>
                    </div>
                  </div>
                )) : <p className="text-gray-400 font-bold text-center py-10 bg-white rounded-2xl">No reported reviews</p>}
              </div>

              <div>
                <h3 className="text-xl font-black text-gray-900 mb-4 flex items-center gap-3">
                  Reported Products
                  <span className="bg-orange-100 text-orange-600 px-3 py-1 rounded-full text-xs font-black">{data.reportedProducts?.length || 0}</span>
                </h3>
                {data.reportedProducts?.length > 0 ? data.reportedProducts.map(r => (
                  <div key={r.id} className="bg-white rounded-2xl border border-gray-100 p-6 mb-4 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="font-black text-gray-900">{r.productName}</h4>
                        <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Reported by: {r.reporterName}</p>
                        <p className="text-gray-300 text-xs font-bold">{new Date(r.date).toLocaleDateString()}</p>
                      </div>
                      <span className="bg-orange-100 text-orange-600 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase">Reported</span>
                    </div>
                    {r.reason && (
                      <div className="bg-gray-50 rounded-xl p-4 mb-4">
                        <p className="text-red-500 text-[10px] font-black uppercase tracking-widest">Reason: {r.reason}</p>
                      </div>
                    )}
                    <div className="flex gap-3">
                      <button onClick={() => handleProductReportAction(r.id, true)} className="bg-red-500 text-white rounded-xl px-4 py-2 text-xs font-black hover:bg-red-600 transition-colors">🗑 Remove Product</button>
                      <button onClick={() => handleProductReportAction(r.id, false)} className="bg-gray-100 text-gray-600 rounded-xl px-4 py-2 text-xs font-black hover:bg-gray-200 transition-colors">✓ Dismiss</button>
                    </div>
                  </div>
                )) : <p className="text-gray-400 font-bold text-center py-10 bg-white rounded-2xl">No reported products</p>}
              </div>
            </div>
          )}

          {activeTab === 'Product Monitor' && (() => {
            const approved = data.approvedProducts;
            const pending = data.pendingProducts;
            const allVendors = data.users.filter((u: any) => u.role === 'vendor');
            const vendorStats = allVendors.map((v: any) => {
              const vApproved = approved.filter((p: any) => p.vendorId === v.id);
              const vPending = pending.filter((p: any) => p.vendorId === v.id && p.status !== 'rejected');
              const vRejected = pending.filter((p: any) => p.vendorId === v.id && p.status === 'rejected');
              return { ...v, approved: vApproved, pending: vPending, rejected: vRejected };
            }).filter((v: any) => v.approved.length + v.pending.length + v.rejected.length > 0 || true);
            return (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                    <p className="text-2xl font-black text-gray-900">{approved.length}</p>
                    <p className="text-xs font-black text-emerald-600 uppercase tracking-widest mt-1">Active Products</p>
                  </div>
                  <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                    <p className="text-2xl font-black text-gray-900">{pending.filter((p: any) => p.status !== 'rejected').length}</p>
                    <p className="text-xs font-black text-amber-600 uppercase tracking-widest mt-1">Pending Approval</p>
                  </div>
                  <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                    <p className="text-2xl font-black text-gray-900">{pending.filter((p: any) => p.status === 'rejected').length}</p>
                    <p className="text-xs font-black text-red-500 uppercase tracking-widest mt-1">Rejected</p>
                  </div>
                </div>
                {vendorStats.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
                    <p className="text-gray-400 font-bold">No vendors with products yet</p>
                  </div>
                ) : (
                  vendorStats.map((v: any) => (
                    <div key={v.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                      <div className="flex items-center gap-4 mb-4">
                        {v.avatar && <img src={v.avatar} referrerPolicy="no-referrer" alt={v.name} className="w-10 h-10 rounded-xl object-cover" />}
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-gray-900">{v.storeName || v.name}</p>
                          <p className="text-xs text-gray-400 font-medium">{v.email}</p>
                        </div>
                        <div className="flex items-center gap-3 text-xs font-black">
                          <span className="bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-full">{v.approved.length} Active</span>
                          {v.pending.length > 0 && <span className="bg-amber-50 text-amber-600 px-2.5 py-1 rounded-full">{v.pending.length} Pending</span>}
                          {v.rejected.length > 0 && <span className="bg-red-50 text-red-500 px-2.5 py-1 rounded-full">{v.rejected.length} Rejected</span>}
                        </div>
                      </div>
                      {v.approved.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {v.approved.slice(0, 6).map((p: any) => (
                            <div key={p.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-xl">
                              {p.mainImage && <img src={p.mainImage} referrerPolicy="no-referrer" alt={p.productName} className="w-8 h-8 rounded-lg object-cover shrink-0" />}
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-gray-900 truncate">{p.productName || p.name}</p>
                                <p className="text-[10px] text-gray-400 font-medium">৳{(p.price || 0).toLocaleString()}</p>
                              </div>
                            </div>
                          ))}
                          {v.approved.length > 6 && (
                            <div className="flex items-center justify-center p-2 bg-gray-50 rounded-xl">
                              <p className="text-xs font-black text-gray-400">+{v.approved.length - 6} more</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            );
          })()}

          {/* Marketing Panel handled below */}
          <MarketingPanel activeTab={activeTab} setToast={setToast} refreshData={refreshData} />

          {activeTab === 'Order Management' && (
            <OrderManagementPanel setToast={setToast} />
          )}
          {activeTab === 'Customer Tickets' && (
            <SupportTicketsPanel setToast={setToast} typeFilter="all" onUpdate={refreshAllTickets} />
          )}
          {activeTab === 'Vendor Tickets' && (
            <SupportTicketsPanel setToast={setToast} typeFilter="vendor_tickets" onUpdate={refreshAllTickets} />
          )}
          {activeTab === 'Monitored Chats' && (
            <SupportTicketsPanel setToast={setToast} typeFilter="vendor_inquiry" onUpdate={refreshAllTickets} />
          )}
        </main>
      </div>

      {suspendModal && suspendTarget && (
        <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-10 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-black text-gray-900 mb-2">Suspend User</h3>
            <p className="text-gray-400 text-sm font-bold mb-8">{suspendTarget.name} — {suspendTarget.email}</p>
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-3 block">Select Reason</label>
            <div className="space-y-3 mb-6">
              {[
                'Violation of platform policies',
                'Fraudulent activity detected',
                'Multiple customer complaints',
                'Selling prohibited items',
                'Payment issues',
                'Custom reason'
              ].map(reason => (
                <button
                  key={reason}
                  onClick={() => setSuspendReason(reason)}
                  className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all ${suspendReason === reason ? 'bg-red-500 text-white' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'}`}
                >
                  {reason}
                </button>
              ))}
            </div>
            {suspendReason === 'Custom reason' && (
              <textarea
                value={customReason}
                onChange={e => setCustomReason(e.target.value)}
                placeholder="Write your reason..."
                rows={3}
                className="w-full bg-gray-50 rounded-2xl px-4 py-3 outline-none font-bold border-none text-sm resize-none mb-6"
              />
            )}
            <div className="flex gap-3">
              <button onClick={() => setSuspendModal(false)} className="flex-1 py-3 bg-gray-100 text-gray-900 rounded-2xl font-black text-sm hover:bg-gray-200 transition-all">Cancel</button>
              <button
                onClick={() => {
                  const finalReason = suspendReason === 'Custom reason' ? customReason : suspendReason;
                  if (!finalReason) return;
                  handleUserStatus(suspendTarget.id, 'suspended', finalReason);
                  setSuspendModal(false);
                }}
                className="flex-1 py-3 bg-red-500 text-white rounded-2xl font-black text-sm hover:bg-red-600 transition-all"
              >
                Confirm Suspend
              </button>
            </div>
          </div>
        </div>
      )}
      {revokeModal && revokeTarget && (
        <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-10 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-black text-gray-900 mb-2">Revoke Verification</h3>
            <p className="text-gray-400 text-sm font-bold mb-8">{revokeTarget.name} — {revokeTarget.email}</p>
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-3 block">Select Reason</label>
            <div className="space-y-3 mb-6">
              {[
                'Invalid or expired documents',
                'Violation of verification terms',
                'Fraudulent activity reported',
                'Business no longer active',
                'Custom reason'
              ].map(reason => (
                <button
                  key={reason}
                  onClick={() => setRevokeReason(reason)}
                  className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all ${revokeReason === reason ? 'bg-orange-500 text-white' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'}`}
                >
                  {reason}
                </button>
              ))}
            </div>
            {revokeReason === 'Custom reason' && (
              <textarea
                value={customRevokeReason}
                onChange={e => setCustomRevokeReason(e.target.value)}
                placeholder="Write your reason..."
                rows={3}
                className="w-full bg-gray-50 rounded-2xl px-4 py-3 outline-none font-bold border-none text-sm resize-none mb-6"
              />
            )}
            <div className="flex gap-3">
              <button onClick={() => setRevokeModal(false)} className="flex-1 py-3 bg-gray-100 text-gray-900 rounded-2xl font-black text-sm hover:bg-gray-200 transition-all">Cancel</button>
              <button
                onClick={confirmRevocation}
                className="flex-1 py-3 bg-orange-500 text-white rounded-2xl font-black text-sm hover:bg-orange-600 transition-all"
              >
                Confirm Revoke
              </button>
            </div>
          </div>
        </div>
      )}
      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-8 py-4 rounded-2xl font-black text-sm shadow-2xl z-50 animate-bounce">
          {toast}
        </div>
      )}
    </div>
  );
};

export default AdminDashboardView;
