import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { CustomerRegisterPage } from './pages/customer/RegisterPage';
import { CataloguePage } from './pages/customer/CataloguePage';
import { CheckoutPage } from './pages/customer/CheckoutPage';
import { ConfirmationPage } from './pages/customer/ConfirmationPage';
import { OrdersPage as CustomerOrdersPage } from './pages/customer/OrdersPage';
import { ShopDashboardPage } from './pages/shop/DashboardPage';
import { ShopOrdersPage } from './pages/shop/OrdersPage';
import { ShopProductsPage } from './pages/shop/ProductsPage';
import { ShopPrepPage } from './pages/shop/PrepPage';
import { DriverTodayPage } from './pages/driver/TodayPage';
import { DriverDetailPage } from './pages/driver/DetailPage';
import { AdminOpsPage } from './pages/admin/OpsPage';
import { SuperAdminPage } from './pages/super-admin/PlatformPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />

          <Route path="/customer" element={<CataloguePage />} />
          <Route path="/customer/register" element={<CustomerRegisterPage />} />
          <Route path="/customer/checkout" element={<CheckoutPage />} />
          <Route
            path="/customer/orders/:id/confirmation"
            element={<ConfirmationPage />}
          />
          <Route path="/customer/orders/:id" element={<CustomerOrdersPage />} />
          <Route path="/customer/orders" element={<CustomerOrdersPage />} />

          <Route path="/shop" element={<ShopDashboardPage />} />
          <Route path="/shop/orders" element={<ShopOrdersPage />} />
          <Route path="/shop/products" element={<ShopProductsPage />} />
          <Route path="/shop/prep" element={<ShopPrepPage />} />

          <Route path="/driver" element={<DriverTodayPage />} />
          <Route path="/driver/orders/:id" element={<DriverDetailPage />} />

          <Route path="/admin" element={<AdminOpsPage />} />
          <Route path="/super-admin" element={<SuperAdminPage />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
