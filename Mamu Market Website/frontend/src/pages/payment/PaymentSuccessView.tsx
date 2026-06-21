import React, { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import PageTitle from '../../components/PageTitle';

const PaymentSuccessView: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setCart } = useCart();
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;
    
    const orderId = searchParams.get('order_id') || 'Unknown';
    setCart([]); // Clear cart upon successful payment
    navigate('/checkout/success', { state: { orderId }, replace: true });
  }, [searchParams, navigate, setCart]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <PageTitle title="Payment Status" />
      <div className="text-center">
        <i className="fas fa-spinner fa-spin text-4xl text-brand-500 mb-4"></i>
        <h2 className="text-xl font-bold text-gray-900">Confirming payment...</h2>
      </div>
    </div>
  );
};

export default PaymentSuccessView;
