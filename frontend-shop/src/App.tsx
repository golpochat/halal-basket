import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { LocaleProvider } from './locale/LocaleContext';
import { LoginPage } from './pages/LoginPage';
import { ShopDashboardPage } from './pages/shop/DashboardPage';
import { ShopOrdersPage } from './pages/shop/OrdersPage';
import { ShopProductsPage } from './pages/shop/ProductsPage';
import { ShopPrepPage } from './pages/shop/PrepPage';

export default function App() {
  return (
    <AuthProvider>
      <LocaleProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<ShopDashboardPage />} />
            <Route path="/orders" element={<ShopOrdersPage />} />
            <Route path="/products" element={<ShopProductsPage />} />
            <Route path="/prep" element={<ShopPrepPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </LocaleProvider>
    </AuthProvider>
  );
}
