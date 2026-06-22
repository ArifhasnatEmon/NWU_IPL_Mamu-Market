import React from 'react';
import { Routes, Route, useParams, Navigate, useLocation } from 'react-router-dom';
import { CATEGORIES, getCategoryName } from '../config';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useApp } from '../context/AppContext';
import { useSharedProducts } from '../context/DataContext';
import { useProduct } from '../hooks/useProducts';
import { useCategories } from '../hooks/useSecondary';
import { Product } from '../types';

import Layout from '../components/Layout';
import CartDrawer from '../components/cart/CartDrawer';
import Toast from '../components/ui/Toast';

const ScrollToTop = () => {
  const { pathname } = useLocation();
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

// Error Boundary
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: Error | null }> {
  constructor(props: { children: React.ReactNode }) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
  componentDidCatch(error: Error, info: React.ErrorInfo) { console.error('ErrorBoundary caught:', error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', fontFamily: 'monospace', background: '#1e1e1e', color: '#f44', minHeight: '100vh' }}>
          <h1 style={{ color: '#ff6b6b', fontSize: '24px', marginBottom: '16px' }}>⚠️ Runtime Error Caught</h1>
          <pre style={{ color: '#ffa', whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: '14px', lineHeight: '1.6' }}>
            {this.state.error?.message || 'Unknown error'}
          </pre>
          <pre style={{ color: '#aaa', whiteSpace: 'pre-wrap', fontSize: '12px', marginTop: '20px' }}>
            {this.state.error?.stack || ''}
          </pre>
          <button onClick={() => this.setState({ hasError: false, error: null })}
            style={{ marginTop: '20px', padding: '10px 20px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

import HomeView from '../pages/home/HomeView';
import ProductsView from '../pages/products/ProductsView';
import DashboardView from '../pages/vendor/DashboardView';
import SettingsView from '../pages/account/SettingsView';
import MessagesView from '../pages/account/MessagesView';
import ProductDetailsView from '../pages/products/ProductDetailsView';
import DealsView from '../pages/deals/DealsView';
import DailyDealsView from '../pages/deals/DailyDealsView';
import WeeklyDealsView from '../pages/deals/WeeklyDealsView';
import MonthlyDealsView from '../pages/deals/MonthlyDealsView';
import VendorStoreView from '../pages/vendor/VendorStoreView';
import VendorReviewsView from '../pages/vendor/VendorReviewsView';
import VendorInventoryView from '../pages/vendor/VendorInventoryView';
import VendorAnalyticsView from '../pages/vendor/VendorAnalyticsView';
import AddProductView from '../pages/vendor/AddProductView';
import EditProductView from '../pages/vendor/EditProductView';
import VendorOrdersView from '../pages/vendor/VendorOrdersView';
import VendorPromoCodesView from '../pages/vendor/VendorPromoCodesView';
import StoreSettingsView from '../pages/vendor/StoreSettingsView';

import BecomeVendorView from '../pages/static/BecomeVendorView';
import OrderHistoryView from '../pages/account/OrderHistoryView';
import WishlistView from '../pages/account/WishlistView';
import VendorsView from '../pages/vendor/VendorsView';
import TopVendorsView from '../pages/vendor/TopVendorsView';
import StaticPageView from '../pages/static/StaticPageView';
import TermsPrivacyView from '../pages/static/TermsPrivacyView';
import ContactView from '../pages/static/ContactView';
import VendorSupportView from '../pages/static/VendorSupportView';
import CartView from '../pages/cart/CartView';
import CheckoutSuccessView from '../pages/cart/CheckoutSuccessView';
import CheckoutView from '../pages/cart/CheckoutView';
import PaymentSuccessView from '../pages/payment/PaymentSuccessView';
import PaymentFailView from '../pages/payment/PaymentFailView';
import PaymentCancelView from '../pages/payment/PaymentCancelView';
import LoginView from '../pages/auth/LoginView';
import AdminLoginView from '../pages/auth/AdminLoginView';
import ResetPasswordView from '../pages/auth/ResetPasswordView';
import UpdatePasswordView from '../pages/auth/UpdatePasswordView';
import AdminDashboardView from '../pages/admin/AdminDashboardView';

// Protected route components
const FullScreenLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="animate-spin w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full"></div>
  </div>
);

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (!user) return <Navigate to="/user-login" replace />;
  return <>{children}</>;
};

const ProtectedVendorRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (!user) return <Navigate to="/user-login" replace />;
  if (!user.role || user.role !== 'vendor') return <Navigate to="/" replace />;
  // Allow both 'active' and 'approved' status
  if (user.status === 'pending' || user.status === 'suspended') return <Navigate to="/vendor-login" replace />;
  return <>{children}</>;
};

const ProtectedAdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (!user) return <Navigate to="/admin-login" replace />;
  if (!user.role || user.role !== 'admin') return <Navigate to="/" replace />;
  return <>{children}</>;
};

// ─── Wrapper components ───
const ProductDetailsViewWrapper: React.FC = () => {
  const { id } = useParams();
  const { products: approvedProducts } = useSharedProducts();
  const cachedProduct = approvedProducts.find(p => p.id === id);
  const { product, loading } = useProduct(!cachedProduct ? id : undefined);

  const finalProduct = cachedProduct || product;

  if (!finalProduct && loading) return <FullScreenLoader />;
  if (!finalProduct) return <Navigate to="/products" replace />;

  return (
    <ProductDetailsView product={finalProduct} />
  );
};

// Dynamic category route — handles any DB-created category that isn't in static config
const DynamicCategoryRoute: React.FC = () => {
  const { categoryId, subId } = useParams();
  const { categories, loading } = useCategories();

  if (loading) return <FullScreenLoader />;

  // Check if this slug matches any category (static or dynamic)
  const allCategories = [...CATEGORIES, ...categories.filter(c => !CATEGORIES.some(sc => sc.id === c.id))];
  const matchedCat = allCategories.find(c => c.id === categoryId);

  if (!matchedCat) return <Navigate to="/" replace />;

  // Find subcategory name if subId is provided
  const subName = subId ? matchedCat.subcategories?.find(s => s.id === subId)?.name || null : null;

  return <ProductsView initialCategory={categoryId} initialSubCategory={subName} />;
};
const AppRoutes: React.FC = () => {
  const location = useLocation();

  const { user } = useAuth();
  const { cart, isCartOpen, setIsCartOpen, removeFromCart, updateCartQuantity } = useCart();
  const { toast, toastType, setToast } = useApp();

  return (
    <>
      <ErrorBoundary>
        <Layout>
          <ScrollToTop />
          <Routes>
            <Route path="/" element={<HomeView />} />
            <Route path="/products" element={<ProductsView />} />
            {CATEGORIES.map(cat => (
              <Route key={`route-${cat.id}`} path={`/${cat.id}`} element={<ProductsView initialCategory={cat.id} />} />
            ))}
            {CATEGORIES.map(cat =>
              cat.subcategories?.map(sub => (
                <Route key={`route-${cat.id}-${sub.id}`} path={`/${cat.id}/${sub.id}`} element={<ProductsView initialCategory={cat.id} initialSubCategory={sub.name} />} />
              ))
            )}
            <Route path="/products/:id" element={<ProductDetailsViewWrapper />} />
            <Route path="/deals" element={<DealsView />} />
            <Route path="/deals/daily" element={<DailyDealsView />} />
            <Route path="/deals/flash" element={<Navigate to="/deals/daily" replace />} />
            <Route path="/deals/weekly" element={<WeeklyDealsView />} />
            <Route path="/deals/monthly" element={<MonthlyDealsView />} />
            <Route path="/vendors" element={<VendorsView />} />
            <Route path="/vendors/top" element={<TopVendorsView />} />
            <Route path="/vendors/:id" element={<VendorStoreView />} />
            <Route path="/user-login" element={<LoginView initialVendorMode={false} />} />
            <Route path="/user-signup" element={<LoginView initialVendorMode={false} />} />
            <Route path="/vendor-login" element={<LoginView initialVendorMode={true} />} />
            <Route path="/login" element={<Navigate to="/user-login" replace />} />
            <Route path="/affiliate-program" element={<BecomeVendorView />} />
            <Route path="/become-vendor" element={<Navigate to="/affiliate-program" replace />} />
            <Route path="/cart" element={<CartView />} />
            <Route path="/wishlist" element={<WishlistView />} />
            <Route path="/messages" element={<ProtectedRoute><MessagesView /></ProtectedRoute>} />

            <Route path="/checkout" element={<Navigate to="/checkout/delivery" replace />} />
            <Route path="/checkout/delivery" element={<CheckoutView />} />
            <Route path="/checkout/payment" element={<CheckoutView />} />
            <Route path="/checkout/confirmation" element={<CheckoutView />} />
            <Route path="/checkout/success" element={<CheckoutSuccessView />} />
            <Route path="/payment/success" element={<PaymentSuccessView />} />
            <Route path="/payment/fail" element={<PaymentFailView />} />
            <Route path="/payment/cancel" element={<PaymentCancelView />} />
            <Route path="/dashboard" element={<ProtectedVendorRoute><DashboardView /></ProtectedVendorRoute>} />
            <Route path="/dashboard/reviews" element={<ProtectedVendorRoute><VendorReviewsView /></ProtectedVendorRoute>} />
            <Route path="/dashboard/inventory" element={<ProtectedVendorRoute><VendorInventoryView /></ProtectedVendorRoute>} />
            <Route path="/dashboard/analytics" element={<ProtectedVendorRoute><VendorAnalyticsView /></ProtectedVendorRoute>} />
            <Route path="/dashboard/add-product/:step?" element={<ProtectedVendorRoute><AddProductView /></ProtectedVendorRoute>} />
            <Route path="/dashboard/edit-product/:productId/:step?" element={<ProtectedVendorRoute><EditProductView /></ProtectedVendorRoute>} />
            <Route path="/dashboard/orders" element={<ProtectedVendorRoute><VendorOrdersView /></ProtectedVendorRoute>} />
            <Route path="/dashboard/promo" element={<ProtectedVendorRoute><VendorPromoCodesView /></ProtectedVendorRoute>} />
            <Route path="/settings" element={<ProtectedRoute><SettingsView /></ProtectedRoute>} />
            <Route path="/settings/store" element={<ProtectedVendorRoute><StoreSettingsView /></ProtectedVendorRoute>} />
            <Route path="/orders" element={<ProtectedRoute><OrderHistoryView /></ProtectedRoute>} />
            <Route path="/help-center" element={<StaticPageView type="help-center" />} />
            <Route path="/contact" element={<ContactView />} />
            <Route path="/vendor-support" element={<VendorSupportView />} />
            <Route path="/about" element={<StaticPageView type="about-us" />} />
            <Route path="/terms" element={<TermsPrivacyView />} />
            <Route path="/privacy" element={<TermsPrivacyView />} />
            <Route path="/return-policy" element={<StaticPageView type="return-policy" />} />
            <Route path="/seller-policy" element={<StaticPageView type="seller-policy" />} />
            <Route path="/admin-dashboard" element={<ProtectedAdminRoute><AdminDashboardView /></ProtectedAdminRoute>} />
            <Route path="/admin" element={<Navigate to="/admin-dashboard" replace />} />
            <Route path="/admin-login" element={<AdminLoginView />} />
            <Route path="/reset-password" element={<ResetPasswordView />} />
            <Route path="/update-password" element={<UpdatePasswordView />} />
            {/* Dynamic category routes for DB-created categories */}
            <Route path="/:categoryId/:subId" element={<DynamicCategoryRoute />} />
            <Route path="/:categoryId" element={<DynamicCategoryRoute />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
        <CartDrawer
          isOpen={isCartOpen}
          onClose={() => setIsCartOpen(false)}
          cart={cart}
          removeFromCart={removeFromCart}
          updateCartQuantity={updateCartQuantity}
        />
        {toast && <Toast message={toast} type={toastType} onClose={() => setToast(null)} />}
      </ErrorBoundary>
    </>
  );
};

export default AppRoutes;
