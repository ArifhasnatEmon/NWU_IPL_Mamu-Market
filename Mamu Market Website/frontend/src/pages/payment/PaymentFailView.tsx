import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import PageTitle from '../../components/PageTitle';

const PaymentFailView: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('order_id');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <PageTitle title="Payment Status" />
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <i className="fas fa-times text-3xl text-red-500"></i>
        </div>
        <h2 className="text-2xl font-black text-gray-900 mb-2">Payment Failed</h2>
        <p className="text-gray-500 mb-8">We couldn't process your payment for order {orderId}. Your cart is still saved.</p>
        <button onClick={() => navigate('/checkout/payment')} className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold hover:bg-gray-800 transition-colors">
          Try Again
        </button>
      </div>
    </div>
  );
};

export default PaymentFailView;
