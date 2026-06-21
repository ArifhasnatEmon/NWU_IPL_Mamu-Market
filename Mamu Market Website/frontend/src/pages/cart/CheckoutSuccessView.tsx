import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useOrders } from '../../hooks/useOrders';
import PageTitle from '../../components/PageTitle';
import { useCart } from '../../context/CartContext';
import { Order } from '../../types';

const CheckoutSuccessView: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [orderData, setOrderData] = useState<Order | null>(null);
  const { orders } = useOrders();
  const { clearCart } = useCart();

  useEffect(() => {
    // Clear cart upon reaching success page
    clearCart();

    // Use navigation state
    if (location.state?.orderData) {
      setOrderData(location.state.orderData);
    } else if (orders && orders.length > 0) {
      setOrderData(orders[0]);
    }
  }, [location.state, orders]);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="min-h-[70vh] py-16 px-4 bg-[#F5F5F8] flex items-center justify-center">
      <PageTitle title="Order Confirmed" />
      <div className="max-w-md w-full bg-white rounded-[2rem] p-10 text-center shadow-[0_8px_32px_rgba(0,0,0,0.08)]">
        <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-8 relative">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.2 }}
            className="absolute inset-0 bg-emerald-500 rounded-full opacity-20 animate-ping"
          />
          <i className="fas fa-check text-emerald-500 text-4xl relative z-10"></i>
        </div>

        <h1 className="text-3xl font-black text-gray-900 mb-3 tracking-tight">Order Confirmed!</h1>
        <p className="text-gray-500 font-medium mb-8">
          Thank you for shopping with Mamu Market. Your order has been received and is being processed.
        </p>

        {orderData && (
          <div className="bg-gray-50 rounded-2xl p-6 text-left mb-8 border border-gray-100">
            <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-200">
              <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Order ID</span>
              <span className="font-black text-gray-900">{orderData.id}</span>
            </div>
            <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-200">
              <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Total Amount</span>
              <span className="font-black text-brand-600 text-lg">৳{orderData.total.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-200">
              <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Payment Method</span>
              <span className="font-black text-gray-900 capitalize">{orderData.paymentMethod}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Est. Delivery</span>
              <span className="font-black text-gray-900">3-5 Business Days</span>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={() => navigate('/orders')}
            className="w-full py-4 gradient-primary text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:opacity-90 transition-all shadow-lg shadow-brand-500/20"
          >
            Track Order
          </button>
          <button
            onClick={() => navigate('/')}
            className="w-full py-4 bg-gray-100 text-gray-600 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-gray-200 transition-all"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default CheckoutSuccessView;
