import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CartItem, User } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import PageTitle from '../../components/PageTitle';
import { useApp } from '../../context/AppContext';
import { supabase } from '../../lib/supabase';
import { getShippingFee } from '../../config';
import { emailTemplates } from '../../utils/emailTemplates';


const CITIES = ['Dhaka', 'Chittagong', 'Khulna', 'Rajshahi', 'Sylhet', 'Barishal', 'Rangpur', 'Mymensingh', 'Comilla', 'Narayanganj'];

const PAYMENT_METHODS = [
  { id: 'cod', label: 'Cash on Delivery', icon: 'fa-money-bill-wave', desc: 'Pay cash when your order is delivered to your doorstep' },
  { id: 'online', label: 'Online Payment', icon: 'fa-credit-card', desc: 'Pay securely via bKash, Nagad, Rocket, Visa, Mastercard & more' },
];

const STEP_MAP: Record<string, number> = {
  '/checkout/delivery': 1,
  '/checkout/payment': 2,
  '/checkout/confirmation': 3,
};

const STEP_PATHS = ['/checkout/delivery', '/checkout/payment', '/checkout/confirmation'];
const STEP_LABELS = ['Delivery', 'Payment', 'Confirmation'];

const CheckoutView: React.FC = () => {
  const { cart, clearCart, cartLoaded } = useCart();
  const { user } = useAuth();
  const { setToast } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const promoData = location.state?.promoData || null;
  const appliedPromo = promoData?.code || null;
  const productDiscount = promoData?.discount || 0;
  const deliveryDiscount = promoData?.deliveryDiscount || 0;

  // Derive step
  const step = STEP_MAP[location.pathname] || 1;

  const [orderPlaced, setOrderPlaced] = useState(false);
  const [stockError, setStockError] = useState(false);

  // Default Address
  const [address, setAddress] = useState(() => {
    const savedAddresses = user?.addresses || [];
    const defaultAddr = savedAddresses.find(a => a.isDefault) || savedAddresses[0];
    
    if (defaultAddr?.address) {
      // Parse Saved
      const parts = defaultAddr.address.split(',').map((p: string) => p.trim());
      return {
        name: user?.name || '',
        phone: user?.phone || '',
        street: parts[0] || '',
        area: parts.length > 2 ? parts[1] : '',
        city: parts[parts.length - 1] || '',
      };
    }
    
    return {
      name: user?.name || '',
      phone: user?.phone || '',
      street: user?.address || '',
      area: '',
      city: '',
    };
  });

  const [selectedSavedAddress, setSelectedSavedAddress] = useState<string | null>(null);
  const [payment, setPayment] = useState('cod');
  const [placing, setPlacing] = useState(false);

  const savedAddresses = user?.addresses || [];

  const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const shippingFee = getShippingFee(subtotal);
  const effectiveShipping = shippingFee - deliveryDiscount;
  const grandTotal = subtotal - productDiscount + effectiveShipping;

  useEffect(() => {
    if (orderPlaced) return;
    if (!user) {
      navigate('/user-login');
    } else if (cartLoaded && cart.length === 0) {
      navigate('/cart');
    }
  }, [user, cartLoaded, cart.length, navigate, orderPlaced]);

  // Loading state
  if (!orderPlaced && (!user || !cartLoaded || cart.length === 0)) {
    // Handle empty cart
    if (!orderPlaced && user && cartLoaded && cart.length === 0) {
      return null; // Redirecting
    }
    return (
      <div className="flex items-center justify-center min-h-screen">
        <i className="fas fa-spinner fa-spin text-3xl text-gray-300" />
      </div>
    );
  }

  const canProceedStep1 = address.name.trim() && /^01[3-9]\d{8}$/.test(address.phone.trim()) && address.street.trim() && address.city;

  const goToStep = (targetStep: number) => {
    navigate(STEP_PATHS[targetStep - 1]);
  };

  const handleSelectSavedAddress = (addr: NonNullable<User['addresses']>[0]) => {
    setSelectedSavedAddress(addr.id);
    const parts = addr.address.split(',').map((p: string) => p.trim());
    setAddress({
      name: user?.name || '',
      phone: user?.phone || '',
      street: parts[0] || '',
      area: parts.length > 2 ? parts[1] : '',
      city: parts[parts.length - 1] || '',
    });
  };

  const placeOrder = async () => {
    setPlacing(true);
    const orderId = crypto.randomUUID();
    const displayOrderId = 'ORD-' + Date.now().toString().slice(-6);

    // Validate user is authenticated
    if (!user?.id) {
      setToast('Please sign in to place an order.');
      setPlacing(false);
      return;
    }

    // Validate all cart items have vendor IDs
    const itemsWithoutVendor = cart.filter(i => !i.vendorId);
    if (itemsWithoutVendor.length > 0) {
      setToast('Some products are missing vendor information. Please remove and re-add them.');
      setPlacing(false);
      return;
    }

    const uniqueVendorIds = [...new Set(cart.map((i: CartItem) => i.vendorId).filter(Boolean))];

    // Validate all vendor IDs are valid UUIDs (prevents foreign key violations)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const invalidVendors = uniqueVendorIds.filter(id => !uuidRegex.test(id));
    if (invalidVendors.length > 0) {
      setToast('Some products have invalid vendor data. Please remove them and re-add from the catalog.');
      setPlacing(false);
      return;
    }

    setToast('Processing your order...');

    // Build order payloads
    const ordersToInsert = uniqueVendorIds.map(vid => {
      const vendorItems = cart.filter(i => i.vendorId === vid);
      const vendorTotal = vendorItems.reduce((a, i) => a + i.price * i.quantity, 0);
      return {
        parent_order_id: orderId,
        vendor_id: vid,
        user_id: user.id,
        user_name: user.name || '',
        items: vendorItems,
        total: vendorTotal + getShippingFee(vendorTotal),
        subtotal: vendorTotal,
        delivery_fee: getShippingFee(vendorTotal),
        payment_method: payment,
        payment_status: payment === 'cod' ? 'unpaid' : 'pending',
        address: `${address.street}, ${address.area}, ${address.city}`,
        shipping_address: `${address.street}, ${address.area}, ${address.city}`,
        status: 'pending',
        date: new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString()
      };
    });

    // Reserve inventory for all payment methods
    const { error: reserveError } = await supabase.rpc('reserve_inventory', {
      p_order_id: orderId,
      p_items: cart.map(i => ({ id: i.id, quantity: i.quantity, vendor_id: i.vendorId }))
    });

    if (reserveError) {
      if (reserveError.message.includes('Insufficient stock') || reserveError.message.includes('not found')) {
        setStockError(true);
        setPlacing(false);
        return;
      }
      console.error('Reservation failed:', reserveError);
      setToast(`Order failed: ${reserveError.message}`);
      setPlacing(false);
      return;
    }

    // Insert orders into Supabase for all payment methods
    const { error: dbErr } = await supabase.from('orders').insert(ordersToInsert);

    if (dbErr) {
      // Rollback reservation if order creation fails
      await supabase.rpc('release_inventory_locks', { p_order_id: orderId });
      console.error('Order insert failed:', dbErr);
      setToast(`Order failed: ${dbErr.message}`);
      setPlacing(false);
      return;
    }



    if (payment === 'cod') {
      // COD — permanent deduction. Delete the 15-minute lock so it doesn't restore.
      await supabase.from('inventory_locks').delete().eq('order_id', orderId);

      // Permanently decrement the stock using the secure Edge Function
      try {
        await supabase.functions.invoke('update-inventory', {
          body: {
            action: 'decrement',
            items: cart.map(i => ({ product_id: i.id, quantity: i.quantity }))
          }
        });
      } catch (err) {
        console.error('Failed to decrement inventory:', err);
      }

      // Fire Order Confirmation Email (non-blocking)
      if (user.email) {
        const itemsHtml = cart.map((i: any) => `<p>${i.name} (x${i.quantity}) - ৳${(i.price * i.quantity).toLocaleString()}</p>`).join('');
        const totalAmount = (cart.reduce((a: any, i: any) => a + i.price * i.quantity, 0) + getShippingFee(cart.reduce((a: any, i: any) => a + i.price * i.quantity, 0))).toLocaleString();
        emailTemplates.orderConfirmation(user.email, user.name || 'Customer', displayOrderId, itemsHtml, totalAmount).catch(e => console.error('Email error:', e));
      }

      // Only clear cart AFTER confirmed DB insert
      clearCart();
      setOrderPlaced(true);
      setPlacing(false);
      navigate('/checkout/success', { state: { orderId: displayOrderId } });
    } else {
      // SSLCommerz online payment flow
      try {
        const { data, error } = await supabase.functions.invoke('process-payment', {
          body: {
            order_id: orderId,
            amount: grandTotal,
            customer_name: address.name,
            customer_email: user.email || 'guest@example.com',
            customer_phone: address.phone,
            customer_address: `${address.street}, ${address.area}, ${address.city}`,
            items: cart.map(i => ({ name: i.name, quantity: i.quantity, price: i.price }))
          }
        });
        
        if (error) {
          const errBody = typeof error.context?.json === 'function' ? await error.context.json() : null;
          const isStockError = errBody?.error === 'INSUFFICIENT_STOCK' || error.message?.includes('INSUFFICIENT_STOCK');
          
          if (isStockError) {
            setToast('ERROR: INSUFFICIENT_STOCK');
            setStockError(true);
            setPlacing(false);
            return;
          }
          throw error;
        }
        if (!data.success) throw new Error(data.error || 'Failed to initialize payment gateway');
        
        // Clear cart before redirect since orders are already in DB
        clearCart();
        
        // Redirect to SSLCommerz gateway
        window.location.href = data.gatewayUrl;
      } catch (err: any) {
        console.error('Payment initiation failed:', err);
        const isStockError = err.message?.includes('INSUFFICIENT_STOCK') || err.message?.includes('Insufficient stock');
        if (isStockError) {
          setStockError(true);
        } else {
          setToast(`Payment failed to start: ${err.message}`);
        }
        setPlacing(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F8]">
      <PageTitle title="Checkout" />
      <div className="max-w-4xl mx-auto px-4 py-10">

        {/* Header */}
        <div className="mb-8">
          <button onClick={() => step === 1 ? navigate('/cart') : goToStep(step - 1)} className="flex items-center gap-2 text-gray-400 hover:text-gray-700 font-bold text-sm mb-4 transition-colors">
            <i className="fas fa-arrow-left"></i> {step === 1 ? 'Back to Cart' : 'Back'}
          </button>
          <h1 className="text-3xl font-black text-gray-900 tracking-tighter">Checkout</h1>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-3 mb-10">
          {STEP_LABELS.map((label, i) => (
            <React.Fragment key={label}>
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black transition-all ${step > i + 1 ? 'bg-emerald-500 text-white' : step === i + 1 ? 'gradient-primary text-white' : 'bg-gray-200 text-gray-400'}`}>
                  {step > i + 1 ? <i className="fas fa-check text-xs"></i> : i + 1}
                </div>
                <span className={`text-sm font-bold hidden sm:block ${step === i + 1 ? 'text-gray-900' : 'text-gray-400'}`}>{label}</span>
              </div>
              {i < 2 && <div className={`flex-1 h-0.5 rounded-full transition-all ${step > i + 1 ? 'bg-emerald-500' : 'bg-gray-200'}`} />}
            </React.Fragment>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">

            {/* Step 1: Delivery Address */}
            {step === 1 && (
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
                <h2 className="text-lg font-black text-gray-900 mb-6">Delivery Address</h2>

                {/* Saved addresses selector */}
                {savedAddresses.length > 0 && (
                  <div className="mb-6">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 block">Saved Addresses</label>
                    <div className="space-y-2">
                      {savedAddresses.map(addr => (
                        <button
                          key={addr.id}
                          onClick={() => handleSelectSavedAddress(addr)}
                          className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${
                            selectedSavedAddress === addr.id
                              ? 'border-brand-500 bg-brand-50'
                              : 'border-gray-100 hover:border-gray-200'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                              selectedSavedAddress === addr.id ? 'border-brand-500 bg-brand-500' : 'border-gray-300'
                            }`}>
                              {selectedSavedAddress === addr.id && <div className="w-2 h-2 bg-white rounded-full" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-black text-gray-900 text-sm">{addr.label}</span>
                                {addr.isDefault && <span className="text-[9px] font-black text-brand-600 bg-brand-100 px-2 py-0.5 rounded-full uppercase">Default</span>}
                              </div>
                              <p className="text-xs text-gray-500 font-medium mt-0.5 truncate">{addr.address}</p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-4 my-4">
                      <div className="flex-1 h-px bg-gray-100" />
                      <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">or enter manually</span>
                      <div className="flex-1 h-px bg-gray-100" />
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Full Name</label>
                    <input value={address.name} onChange={e => setAddress({ ...address, name: e.target.value })}
                      className="w-full bg-gray-50 rounded-2xl px-4 py-3.5 outline-none font-bold text-sm border-2 border-transparent focus:border-brand-400 transition-all"
                      placeholder="Your full name" />
                  </div>
                  <div>
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Phone Number</label>
                    <input value={address.phone} onChange={e => setAddress({ ...address, phone: e.target.value })}
                      className="w-full bg-gray-50 rounded-2xl px-4 py-3.5 outline-none font-bold text-sm border-2 border-transparent focus:border-brand-400 transition-all"
                      placeholder="01XXXXXXXXX" type="tel" />
                  </div>
                  <div>
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Street Address</label>
                    <input value={address.street} onChange={e => setAddress({ ...address, street: e.target.value })}
                      className="w-full bg-gray-50 rounded-2xl px-4 py-3.5 outline-none font-bold text-sm border-2 border-transparent focus:border-brand-400 transition-all"
                      placeholder="House no, road, block" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Area / Thana</label>
                      <input value={address.area} onChange={e => setAddress({ ...address, area: e.target.value })}
                        className="w-full bg-gray-50 rounded-2xl px-4 py-3.5 outline-none font-bold text-sm border-2 border-transparent focus:border-brand-400 transition-all"
                        placeholder="e.g. Gulshan" />
                    </div>
                    <div>
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 block">City</label>
                      <select value={address.city} onChange={e => setAddress({ ...address, city: e.target.value })}
                        className="w-full bg-gray-50 rounded-2xl px-4 py-3.5 outline-none font-bold text-sm border-2 border-transparent focus:border-brand-400 transition-all appearance-none">
                        <option value="" disabled>Select your city</option>
                        {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
                <button onClick={() => goToStep(2)} disabled={!canProceedStep1}
                  className="w-full mt-8 py-4 gradient-primary text-white rounded-2xl font-black text-base shadow-lg shadow-brand-500/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-40 disabled:scale-100 disabled:cursor-not-allowed">
                  Continue to Payment
                </button>
              </div>
            )}

            {/* Step 2: Payment */}
            {step === 2 && (
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
                <h2 className="text-lg font-black text-gray-900 mb-2">Payment Method</h2>
                <p className="text-xs text-gray-400 font-medium mb-6">Choose how you'd like to pay for your order</p>
                <div className="space-y-3">
                  {PAYMENT_METHODS.map(m => (
                    <button key={m.id}
                      onClick={() => setPayment(m.id)}
                      className={`w-full flex items-center gap-4 p-5 rounded-2xl border-2 transition-all text-left ${payment === m.id ? 'border-brand-500 bg-gradient-to-r from-brand-50 to-purple-50 shadow-md shadow-brand-100' : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'}`}>
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg shrink-0 ${payment === m.id ? 'gradient-primary text-white shadow-lg shadow-brand-500/30' : 'bg-gray-100 text-gray-400'}`}>
                        <i className={`fas ${m.icon}`}></i>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-gray-900 text-sm">{m.label}</p>
                        <p className="text-xs text-gray-400 font-medium mt-0.5">{m.desc}</p>
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${payment === m.id ? 'border-brand-500 bg-brand-500' : 'border-gray-300'}`}>
                        {payment === m.id && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                      </div>
                    </button>
                  ))}
                </div>

                {/* Online Payment Info */}
                {payment === 'online' && (
                  <div className="mt-5 p-5 bg-gradient-to-br from-gray-50 to-blue-50/50 rounded-2xl border border-gray-100">
                    <div className="flex items-center gap-2 mb-3">
                      <i className="fas fa-shield-alt text-emerald-500 text-sm"></i>
                      <span className="text-xs font-black text-gray-700 uppercase tracking-wider">Secure Payment via SSLCommerz</span>
                    </div>
                    <p className="text-xs text-gray-500 font-medium mb-4">You'll be redirected to SSLCommerz secure payment gateway to complete your payment.</p>
                    <div className="flex flex-wrap gap-2">
                      {['bKash', 'Nagad', 'Rocket', 'Visa', 'Mastercard', 'DBBL', 'City Bank'].map(name => (
                        <span key={name} className="px-3 py-1.5 bg-white rounded-lg text-[11px] font-bold text-gray-600 border border-gray-100 shadow-sm">
                          {name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* COD Info */}
                {payment === 'cod' && (
                  <div className="mt-5 p-5 bg-gradient-to-br from-amber-50 to-orange-50/50 rounded-2xl border border-amber-100">
                    <div className="flex items-center gap-2 mb-2">
                      <i className="fas fa-info-circle text-amber-500 text-sm"></i>
                      <span className="text-xs font-black text-gray-700 uppercase tracking-wider">Cash on Delivery</span>
                    </div>
                    <p className="text-xs text-gray-500 font-medium">Pay in cash when your order is delivered. Please keep exact change ready for the delivery person.</p>
                  </div>
                )}

                <button onClick={() => goToStep(3)}
                  className="w-full mt-8 py-4 gradient-primary text-white rounded-2xl font-black text-base shadow-lg shadow-brand-500/20 hover:scale-[1.02] active:scale-95 transition-all">
                  Review Order
                </button>
              </div>
            )}

            {/* Step 3: Confirmation */}
            {step === 3 && (
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
                <h2 className="text-lg font-black text-gray-900 mb-6">Order Confirmation</h2>
                <div className="bg-gray-50 rounded-2xl p-4 mb-4 flex items-start gap-3">
                  <div className="w-8 h-8 bg-brand-100 text-brand-600 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                    <i className="fas fa-map-marker-alt text-sm"></i>
                  </div>
                  <div>
                    <p className="font-black text-gray-900 text-sm">{address.name} · {address.phone}</p>
                    <p className="text-xs text-gray-500 font-medium mt-0.5">{address.street}{address.area ? `, ${address.area}` : ''}, {address.city}</p>
                  </div>
                  <button onClick={() => goToStep(1)} className="ml-auto text-brand-500 text-xs font-black hover:underline">Edit</button>
                </div>
                <div className="bg-gray-50 rounded-2xl p-4 mb-6 flex items-center gap-3">
                  <div className="w-8 h-8 bg-brand-100 text-brand-600 rounded-xl flex items-center justify-center shrink-0">
                    <i className={`fas ${PAYMENT_METHODS.find(m => m.id === payment)?.icon || 'fa-money-bill-wave'} text-sm`}></i>
                  </div>
                  <p className="font-black text-gray-900 text-sm">
                    {PAYMENT_METHODS.find(m => m.id === payment)?.label || payment}
                  </p>
                  <button onClick={() => goToStep(2)} className="ml-auto text-brand-500 text-xs font-black hover:underline">Edit</button>
                </div>
                <div className="space-y-3 mb-6">
                  {cart.map(item => (
                    <div key={item.id} className="flex items-center gap-3">
                      <img src={item.image || undefined} referrerPolicy="no-referrer" alt={item.name} className="w-12 h-12 rounded-xl object-cover bg-gray-100" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate">{item.name}</p>
                        <p className="text-xs text-gray-400 font-medium">Qty: {item.quantity}</p>
                      </div>
                      <p className="text-sm font-black text-gray-900">৳{(item.price * item.quantity).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
                <button onClick={placeOrder} disabled={placing}
                  className="w-full py-4 gradient-primary text-white rounded-2xl font-black text-base shadow-lg shadow-brand-500/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-70">
                  {placing ? <><i className="fas fa-spinner fa-spin mr-2"></i>Processing...</> : payment === 'online' ? <><i className="fas fa-lock mr-2 text-sm"></i>Pay Now</> : 'Place Order'}
                </button>
              </div>
            )}
          </div>

          {/* Order summary sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sticky top-24">
              <h3 className="font-black text-gray-900 mb-4">Order Summary</h3>
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 font-medium">Subtotal ({cart.reduce((a, i) => a + i.quantity, 0)} items)</span>
                  <span className="font-bold text-gray-900">৳{subtotal.toLocaleString()}</span>
                </div>
                {productDiscount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-emerald-600 font-medium">Promo ({appliedPromo?.code})</span>
                    <span className="font-bold text-emerald-600">-৳{productDiscount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 font-medium">Shipping</span>
                  <div className="text-right">
                    {deliveryDiscount > 0 && <p className="text-[10px] text-gray-400 line-through">৳{shippingFee}</p>}
                    <span className="font-bold text-gray-900">৳{effectiveShipping}</span>
                  </div>
                </div>
                <p className="text-[10px] text-gray-400 font-medium">
                  {subtotal >= 10000 ? 'Free delivery on orders ৳10,000+' : subtotal >= 500 ? 'Delivery: ৳120 (orders ৳500–৳1,999)' : 'Delivery: ৳80 (orders under ৳500)'}
                  {deliveryDiscount > 0 ? ` · ৳${deliveryDiscount} discount applied` : ''}
                </p>
              </div>
              <div className="border-t border-gray-100 pt-4">
                <div className="flex justify-between">
                  <span className="font-black text-gray-900">Total</span>
                  <span className="font-black text-xl text-gradient">৳{grandTotal.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Out of Stock Error Modal */}
      {stockError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-gray-100 text-center animate-in fade-in zoom-in duration-200">
            <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-exclamation-triangle text-2xl"></i>
            </div>
            <h3 className="text-xl font-black text-gray-900 mb-2">Item Reserved!</h3>
            <p className="text-sm text-gray-500 font-medium mb-6">
              Sorry, one or more items in your cart were just reserved by someone else! Please review your cart.
            </p>
            <button onClick={() => { setStockError(false); navigate('/cart'); }} className="w-full py-3.5 bg-gray-900 text-white rounded-xl font-bold text-sm hover:bg-gray-800 transition-colors">
              Return to Cart
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CheckoutView;
