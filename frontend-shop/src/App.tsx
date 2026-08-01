import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ToastViewport } from '@halal-basket/web';
import { AuthProvider } from './auth/AuthContext';
import { LocaleProvider } from './locale/LocaleContext';
import { ShopLayout } from './layouts/ShopLayout';
import { LoginPage } from './pages/LoginPage';
import { ShopDashboardPage } from './pages/shop/DashboardPage';
import { ShopOrdersPage } from './pages/shop/OrdersPage';
import { ShopProductsPage } from './pages/shop/ProductsPage';
import { ShopPrepPage } from './pages/shop/PrepPage';
import { ShopProfilePage } from './pages/shop/ProfilePage';

export default function App() {
  return (
    <AuthProvider>
      <LocaleProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<Navigate to="/shop/dashboard" replace />} />
            <Route path="/shop" element={<ShopLayout />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<ShopDashboardPage />} />
              <Route path="orders" element={<ShopOrdersPage />} />
              <Route path="products" element={<ShopProductsPage />} />
              <Route path="prep" element={<ShopPrepPage />} />
              <Route path="profile" element={<ShopProfilePage />} />
            </Route>
            <Route path="/dashboard" element={<Navigate to="/shop/dashboard" replace />} />
            <Route path="/dashboard/*" element={<Navigate to="/shop/dashboard" replace />} />
            <Route path="/orders" element={<Navigate to="/shop/orders" replace />} />
            <Route path="/products" element={<Navigate to="/shop/products" replace />} />
            <Route path="/prep" element={<Navigate to="/shop/prep" replace />} />
            <Route path="*" element={<Navigate to="/shop/dashboard" replace />} />
          </Routes>
          <ToastViewport />
        </BrowserRouter>
      </LocaleProvider>
    </AuthProvider>
  );
}
