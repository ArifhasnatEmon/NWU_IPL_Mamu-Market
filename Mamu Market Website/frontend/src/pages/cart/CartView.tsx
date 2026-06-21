import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { CartItem, Product, PromoCode } from '../../types';
import { getShippingFee } from '../../config';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import PageTitle from '../../components/PageTitle';
import { usePromoCodes } from '../../hooks/useMarketing';


const CartView: React.FC = () => {
  const { cart, removeFromCart, updateCartQuantity, handleAddToCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { promoCodes } = usePromoCodes();
  const [couponCode, setCouponCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<PromoCode | null>(null);
  const [couponError, setCouponError] = useState('');

  const subtotal = cart.reduce((acc, i) => acc + i.price * i.quantity, 0);
  const shippingFee = getShippingFee(subtotal);

  const handleApplyCoupon = () => {
    const code = couponCode.trim().toUpperCase();
    if (!code) return;
    const codes = promoCodes;
    const found = codes.find((c: PromoCode) => c.code.toUpperCase() === code && c.active !== false);
    if (!found) { setAppliedPromo(null); setCouponError('Invalid or expired promo code.'); return; }
    if (found.expiresAt && new Date(found.expiresAt) < new Date()) { setCouponError('This code has expired.'); return; }
    if (found.maxUses && (found.usedCount || 0) >= found.maxUses) { setCouponError('This code has reached its usage limit.'); return; }
    // Check if cart has items from this vendor
    if (found.vendor_id && found.vendor_id !== 'admin') {
      const hasVendorItems = cart.some(item => item.vendorId === found.vendor_id);
      if (!hasVendorItems) {
        setCouponError('This promo code is not applicable to the items in your cart.');
        return;
      }
    }

    if (found.minOrder && subtotal < found.minOrder) { setCouponError(`Minimum order ৳${found.minOrder.toLocaleString()} required.`); return; }
    setAppliedPromo(found);
    setCouponError('');
  };

  // Applicable Subtotal (only items from the specific vendor)
  const applicableSubtotal = (appliedPromo && appliedPromo.vendor_id && appliedPromo.vendor_id !== 'admin') 
    ? cart.filter(item => item.vendorId === appliedPromo.vendor_id).reduce((acc, i) => acc + i.price * i.quantity, 0)
    : subtotal;

  // Product discount
  const productDiscount = appliedPromo && appliedPromo.appliesTo !== 'delivery'
    ? appliedPromo.discountType === '%'
      ? Math.round(applicableSubtotal * (appliedPromo.discount / 100))
      : Math.min(appliedPromo.discount, applicableSubtotal)
    : 0;

  // Delivery discount
  const deliveryDiscount = appliedPromo && (appliedPromo.appliesTo === 'delivery' || appliedPromo.appliesTo === 'both')
    ? appliedPromo.deliveryDiscountType === 'free'
      ? shippingFee
      : Math.round(shippingFee * ((appliedPromo.deliveryDiscount || 0) / 100))
    : 0;

  const discount = productDiscount; // Display compat
  const effectiveShipping = shippingFee - deliveryDiscount;
  const finalTotal = subtotal + effectiveShipping - productDiscount;

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-32 text-center">
        <i className="fas fa-shopping-cart text-6xl text-gray-200 mb-6 block"></i>
        <h2 className="text-2xl font-black text-gray-900 mb-4">Please Sign In</h2>
        <p className="text-gray-400 font-medium mb-8">You need to be logged in to view your cart.</p>
        <button onClick={() => navigate('/user-login')} className="px-8 py-4 bg-brand-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:opacity-90 transition-all">Sign In</button>
      </div>
    );
  }
  if (user.role === 'vendor') {
    return (
      <div className="container mx-auto px-4 py-32 text-center">
        <i className="fas fa-store text-6xl text-gray-200 mb-6 block"></i>
        <h2 className="text-2xl font-black text-gray-900 mb-4">Vendors Cannot Purchase</h2>
        <p className="text-gray-400 font-medium mb-8">Use a customer account to shop.</p>
        <button onClick={() => navigate('/')} className="px-8 py-4 bg-brand-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:opacity-90 transition-all">Go Home</button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-16">
      <PageTitle title="Shopping Cart" />
      <div className="flex flex-col lg:flex-row gap-16">
        <div className="flex-1 space-y-8">
          <div className="flex items-center justify-between">
            <h1 className="text-4xl font-black text-gray-900 tracking-tight">Shopping Cart</h1>
            <span className="text-sm font-black text-gray-400 uppercase tracking-widest">{cart.length} Items</span>
          </div>
          
          {cart.length > 0 ? (
            <div className="space-y-6">
              {cart.map(item => (
                <motion.div 
                  layout
                  key={item.id} 
                  className="glass p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col sm:flex-row items-center gap-8 group"
                >
                  <div className="w-32 h-32 rounded-[2rem] overflow-hidden bg-gray-50 shrink-0 shadow-lg">
                    <img src={item.image || 'https://via.placeholder.com/400x400?text=Product'} referrerPolicy="no-referrer" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={item.name} />
                  </div>
                  <div className="flex-1 text-center sm:text-left">
                    <p className="text-[11px] font-black text-brand-600 uppercase tracking-widest mb-2 text-gradient">{item.vendor}</p>
                    <h3 className="text-xl font-black text-gray-900 mb-2">{item.name}</h3>
                    <p className="text-sm text-gray-500 font-medium line-clamp-1">{item.description}</p>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="flex items-center bg-gray-50 rounded-2xl p-1 border border-gray-100">
                      <button onClick={() => updateCartQuantity(item.id, -1)} className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-brand-600 transition-colors">
                        <i className="fas fa-minus text-xs"></i>
                      </button>
                      <span className="w-10 text-center font-black text-gray-900">{item.quantity}</span>
                      <button onClick={() => updateCartQuantity(item.id, 1)} className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-brand-600 transition-colors">
                        <i className="fas fa-plus text-xs"></i>
                      </button>
                    </div>
                    <div className="text-right min-w-[100px]">
                      <p className="text-xl font-black text-gray-900">৳{(item.price * item.quantity).toLocaleString()}</p>
                      <p className="text-xs font-bold text-gray-400">৳{item.price.toLocaleString()} each</p>
                    </div>
                    <button onClick={() => removeFromCart(item.id)} className="w-12 h-12 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all">
                      <i className="far fa-trash-alt"></i>
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="py-32 text-center bg-white rounded-[4rem] border-2 border-dashed border-gray-100">
              <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-8">
                <i className="fas fa-shopping-cart text-4xl text-gray-200"></i>
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-3">Your cart is empty</h3>
              <p className="text-gray-500 font-medium max-w-xs mx-auto mb-10">Looks like you haven't added anything to your cart yet.</p>
              <button onClick={() => navigate('/products')} className="px-10 py-4 gradient-primary text-white rounded-2xl font-black shadow-xl shadow-brand-500/20">Start Shopping</button>
            </div>
          )}
        </div>

        {cart.length > 0 && (
          <div className="lg:w-96">
            <div className="glass p-10 rounded-[3rem] border border-gray-100 shadow-xl sticky top-32">
              <h3 className="text-2xl font-black text-gray-900 mb-8 tracking-tight">Order Summary</h3>
              <div className="space-y-5 mb-8">
                <div className="flex justify-between text-gray-500 font-bold">
                  <span>Subtotal</span>
                  <span className="text-gray-900">৳{cart.reduce((acc, i) => acc + i.price * i.quantity, 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-gray-500 font-bold">
                  <span>Shipping</span>
                  <span className="text-gray-900 font-black">৳{shippingFee}</span>
                </div>
                {deliveryDiscount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-bold">
                    <span>Delivery Discount</span>
                    <span>-৳{deliveryDiscount}</span>
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    value={couponCode}
                    onChange={e => { setCouponCode(e.target.value); setCouponError(''); setAppliedPromo(null); }}
                    placeholder="Coupon code"
                    className="flex-1 bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-brand-300 transition-all"
                  />
                  <button
                    onClick={handleApplyCoupon}
                    className="px-4 py-2.5 bg-gray-900 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:opacity-90 transition-all"
                  >
                    Apply
                  </button>
                </div>
                {appliedPromo && (
                  <div className="flex items-center justify-between bg-emerald-50 rounded-xl px-3 py-2">
                    <p className="text-emerald-700 text-xs font-black">
                      {appliedPromo.code}
                      {appliedPromo.appliesTo === 'delivery'
                        ? ` — ${appliedPromo.deliveryDiscountType === 'free' ? 'Free delivery' : `${appliedPromo.deliveryDiscount}% off delivery`}`
                        : appliedPromo.appliesTo === 'both'
                        ? ` — ${appliedPromo.discountType === '%' ? `${appliedPromo.discount}% off` : `৳${appliedPromo.discount} off`} + ${appliedPromo.deliveryDiscountType === 'free' ? 'free delivery' : `${appliedPromo.deliveryDiscount}% off delivery`}`
                        : ` — ${appliedPromo.discountType === '%' ? `${appliedPromo.discount}% off` : `৳${appliedPromo.discount} off`}`}
                      {appliedPromo.vendorName ? ` (${appliedPromo.vendorName})` : ''}
                    </p>
                    <button onClick={() => { setAppliedPromo(null); setCouponCode(''); }} className="text-[10px] text-red-400 font-black hover:text-red-600">✕</button>
                  </div>
                )}
                {couponError && (
                  <p className="text-red-500 text-xs font-black">{couponError}</p>
                )}
                {productDiscount > 0 && (
                  <div className="flex justify-between text-gray-500 font-bold">
                    <span>Product Discount</span>
                    <span className="text-emerald-600">-৳{productDiscount.toLocaleString()}</span>
                  </div>
                )}
                <div className="h-px bg-gray-100 my-2"></div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-lg font-black text-gray-900">Total</span>
                  <span className="text-3xl font-black text-gradient">৳{finalTotal.toLocaleString()}</span>
                </div>
              </div>
              <button onClick={() => {
                navigate('/checkout', {
                  state: {
                    promoData: {
                      code: appliedPromo?.code || null,
                      discount: productDiscount,
                      deliveryDiscount: deliveryDiscount
                    }
                  }
                });
              }} className="w-full py-4 bg-brand-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-brand-700 active:scale-95 transition-all shadow-xl shadow-brand-500/20">
                Proceed to Checkout
              </button>
              <p className="text-center text-[10px] text-gray-400 font-bold mt-6 uppercase tracking-widest">Secure SSL Encrypted Payment</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartView;
