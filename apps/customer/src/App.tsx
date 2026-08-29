import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { PageLoader } from './components/common/Loading';
import { StoreLayout } from './components/layout/StoreLayout';
import { ProtectedCustomerRoute } from './components/auth/ProtectedCustomerRoute';

const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const CartPage = lazy(() => import('./pages/storefront/CartPage'));
const CategoryPage = lazy(() => import('./pages/storefront/CategoryPage'));
const CheckoutPage = lazy(() => import('./pages/storefront/CheckoutPage'));
const HomePage = lazy(() => import('./pages/storefront/HomePage'));
const OrderSuccessPage = lazy(() => import('./pages/storefront/OrderSuccessPage'));
const OrderTrackingPage = lazy(() => import('./pages/storefront/OrderTrackingPage'));
const ProductDetailPage = lazy(() => import('./pages/storefront/ProductDetailPage'));
const ProductsPage = lazy(() => import('./pages/storefront/ProductsPage'));
const CustomerAuthPage = lazy(() => import('./pages/auth/CustomerAuthPage'));
const CompleteProfilePage = lazy(() => import('./pages/account/CompleteProfilePage'));
const AccountOverviewPage = lazy(() => import('./pages/account/AccountOverviewPage'));
const AddressesPage = lazy(() => import('./pages/account/AddressesPage'));
const MyOrdersPage = lazy(() => import('./pages/account/MyOrdersPage'));
const LegalPage = lazy(() => import('./pages/LegalPage'));

export default function App() {
  return <Suspense fallback={<PageLoader />}><Routes>
    <Route element={<StoreLayout />}>
      <Route path="/" element={<HomePage />} />
      <Route path="/products" element={<ProductsPage />} />
      <Route path="/category/:slug" element={<CategoryPage />} />
      <Route path="/product/:slug" element={<ProductDetailPage />} />
      <Route path="/cart" element={<CartPage />} />
      <Route path="/order-success" element={<OrderSuccessPage />} />
      <Route path="/track/:orderNumber" element={<OrderTrackingPage />} />
      <Route path="/auth" element={<CustomerAuthPage />} />
      <Route path="/terms" element={<LegalPage document="terms" />} />
      <Route path="/privacy" element={<LegalPage document="privacy" />} />
      <Route element={<ProtectedCustomerRoute requireProfile={false} />}>
        <Route path="/complete-profile" element={<CompleteProfilePage />} />
      </Route>
      <Route element={<ProtectedCustomerRoute />}>
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/profile" element={<AccountOverviewPage />} />
        <Route path="/addresses" element={<AddressesPage />} />
        <Route path="/orders" element={<MyOrdersPage />} />
      </Route>
    </Route>
    <Route path="*" element={<NotFoundPage />} />
  </Routes></Suspense>;
}
