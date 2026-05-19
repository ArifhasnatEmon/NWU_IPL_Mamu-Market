import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { CartItem } from '../../types';
import { getShippingFee, FREE_SHIPPING_THRESHOLD } from '../../config';

const CartDrawer: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  removeFromCart: (id: string) => void;
  updateCartQuantity: (id: string, delta: number) => void;
}> = ({ isOpen, onClose, cart, removeFromCart, updateCartQuantity }) => {
  const navigate = useNavigate();
  const subtotal = cart.reduce((acc, i) => acc + i.price * i.quantity, 0);
  const shippingFee = getShippingFee(subtotal);
  const total = subtotal + shippingFee;

  const goTo = (path: string) => {
    onClose();
    setTimeout(() => navigate(path), 200);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 z-[80] backdrop-blur-sm"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-white z-[90] flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <div>
                <h2 className="text-xl font-black text-gray-900 tracking-tight">Your Cart</h2>
                <p className="text-xs font-bold text-gray-400 mt-0.5">{cart.length} {cart.length === 1 ? 'item' : 'items'}</p>
              </div>
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
              >
                <i className="fas fa-times text-gray-500 text-sm"></i>
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-16">
                  <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                    <i className="fas fa-shopping-bag text-3xl text-gray-200"></i>
                  </div>
                  <h3 className="text-lg font-black text-gray-900 mb-2">Your cart is empty</h3>
                  <p className="text-gray-400 font-medium text-sm mb-8">Add some items to get started.</p>
                  <button
                    onClick={() => goTo('/products')}
                    className="px-8 py-3 gradient-primary text-white rounded-2xl font-black text-sm shadow-lg shadow-brand-500/20"
                  >
                    Browse Products
                  </button>
                </div>
              ) : (
                cart.map((item) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: 40 }}
                    className="flex items-center gap-4 p-3 bg-gray-50 rounded-2xl"
                  >
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-white flex-shrink-0 border border-gray-100">
                      <img
                        src={item.image || (item as any).mainImage || ''}
                        alt={item.name}
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/64'; }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-gray-900 text-sm truncate">{item.name}</p>
                      <p className="text-brand-600 font-black text-sm mt-0.5">৳{(item.price * item.quantity).toLocaleString()}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => updateCartQuantity(item.id, -1)}
                          className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:border-brand-300 transition-colors"
                        >
                          <i className="fas fa-minus text-[10px] text-gray-500"></i>
                        </button>
                        <span className="w-6 text-center font-black text-sm text-gray-900">{item.quantity}</span>
                        <button
                          onClick={() => updateCartQuantity(item.id, 1)}
                          className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:border-brand-300 transition-colors"
                        >
                          <i className="fas fa-plus text-[10px] text-gray-500"></i>
                        </button>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="w-8 h-8 rounded-xl hover:bg-red-50 flex items-center justify-center transition-colors group flex-shrink-0"
                    >
                      <i className="fas fa-trash-alt text-gray-300 group-hover:text-red-400 text-xs transition-colors"></i>
                    </button>
                  </motion.div>
                ))
              )}
            </div>

            {/* Footer */}
            {cart.length > 0 && (
              <div className="px-6 py-5 border-t border-gray-100 space-y-3">
                <div className="space-y-2 pb-3 border-b border-gray-100">
                  <div className="flex justify-between text-sm">
                    <span className="font-bold text-gray-500">Subtotal</span>
                    <span className="font-black text-gray-900">৳{subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="font-bold text-gray-500">Shipping</span>
                    <span className={`font-black ${shippingFee === 0 ? 'text-emerald-500' : 'text-gray-900'}`}>
                      {shippingFee === 0 ? 'Free' : `৳${shippingFee}`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-black text-gray-900">Total</span>
                    <span className="font-black text-brand-600 text-lg">৳{total.toLocaleString()}</span>
                  </div>
                </div>
                {subtotal < FREE_SHIPPING_THRESHOLD && (
                  <p className="text-[10px] font-bold text-gray-400 text-center">
                    Add ৳{(FREE_SHIPPING_THRESHOLD - subtotal).toLocaleString()} more for free delivery
                  </p>
                )}
                <button
                  onClick={() => goTo('/checkout')}
                  className="w-full py-4 gradient-primary text-white rounded-2xl font-black text-sm shadow-lg shadow-brand-500/20 hover:scale-[1.01] active:scale-95 transition-all"
                >
                  Proceed to Checkout
                </button>
                <button
                  onClick={() => goTo('/cart')}
                  className="w-full py-3 border-2 border-gray-100 text-gray-700 rounded-2xl font-black text-sm hover:bg-gray-50 transition-all"
                >
                  View Full Cart
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CartDrawer;
