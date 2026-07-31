import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { LocaleProvider } from './locale/LocaleContext';
import { ToastViewport } from '@halal-basket/web';
import { LoginPage } from './pages/LoginPage';
import { CustomerRegisterPage } from './pages/customer/RegisterPage';
import { CataloguePage } from './pages/customer/CataloguePage';
import { CheckoutPage } from './pages/customer/CheckoutPage';
import { ConfirmationPage } from './pages/customer/ConfirmationPage';
import { OrdersPage as CustomerOrdersPage } from './pages/customer/OrdersPage';
import { HelpPage } from './pages/customer/HelpPage';
import { AdminOpsPage } from './pages/admin/OpsPage';
import { SuperAdminPage } from './pages/super-admin/PlatformPage';

export default function App() {
  return (
    <AuthProvider>
      <LocaleProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<CataloguePage />} />
            <Route
              path="/catalogue"
              element={<Navigate to="/" replace />}
            />
            <Route path="/help" element={<HelpPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<CustomerRegisterPage />} />

            <Route path="/checkout" element={<CheckoutPage />} />
            <Route
              path="/orders/:id/confirmation"
              element={<ConfirmationPage />}
            />
            <Route path="/orders/:id" element={<CustomerOrdersPage />} />
            <Route path="/orders" element={<CustomerOrdersPage />} />

            <Route path="/customer" element={<Navigate to="/" replace />} />
            <Route path="/customer/*" element={<Navigate to="/" replace />} />

            <Route path="/admin" element={<AdminOpsPage />} />
            <Route path="/super-admin" element={<SuperAdminPage />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <ToastViewport />
        </BrowserRouter>
      </LocaleProvider>
    </AuthProvider>
  );
}
