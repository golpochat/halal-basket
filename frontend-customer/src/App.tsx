import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { LocaleProvider } from './locale/LocaleContext';
import { ToastViewport } from '@halal-basket/web';
import { CookieConsentBanner } from './components/layout/CookieConsentBanner';
import { AccountLayout } from './layouts/AccountLayout';
import { LoginPage } from './pages/LoginPage';
import { CustomerRegisterPage } from './pages/customer/RegisterPage';
import { CataloguePage } from './pages/customer/CataloguePage';
import { CheckoutPage } from './pages/customer/CheckoutPage';
import { ConfirmationPage } from './pages/customer/ConfirmationPage';
import { CustomerDashboardPage } from './pages/customer/DashboardPage';
import { OrdersPage as CustomerOrdersPage } from './pages/customer/OrdersPage';
import { FaqPage } from './pages/customer/FaqPage';
import { DeliveryLocationsPage } from './pages/customer/DeliveryLocationsPage';
import { DeliveryChargesPage } from './pages/customer/DeliveryChargesPage';
import { LegalDocumentPage } from './pages/customer/LegalDocumentPage';
import { RedirectToAdminApp } from './pages/RedirectToAdminApp';
import { RedirectDashboardOrder } from './pages/RedirectDashboardOrder';
import { CustomerProfilePage } from './pages/customer/ProfilePage';
import { CustomerAddressesPage } from './pages/customer/AddressesPage';
import { CustomerFavouritesPage } from './pages/customer/FavouritesPage';

export default function App() {
  return (
    <AuthProvider>
      <LocaleProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<CataloguePage />} />
            <Route path="/catalogue" element={<Navigate to="/" replace />} />
            <Route path="/faq" element={<FaqPage />} />
            <Route path="/help" element={<Navigate to="/faq" replace />} />
            <Route
              path="/delivery-locations"
              element={<DeliveryLocationsPage />}
            />
            <Route
              path="/delivery-charges"
              element={<DeliveryChargesPage />}
            />
            <Route
              path="/delivery"
              element={<Navigate to="/delivery-locations" replace />}
            />
            <Route
              path="/delivery-areas"
              element={<Navigate to="/delivery-locations" replace />}
            />
            <Route
              path="/delivery-charge"
              element={<Navigate to="/delivery-charges" replace />}
            />
            <Route path="/legal/:slug" element={<LegalDocumentPage />} />
            <Route
              path="/privacy"
              element={<Navigate to="/legal/privacy" replace />}
            />
            <Route
              path="/terms"
              element={<Navigate to="/legal/terms" replace />}
            />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<CustomerRegisterPage />} />

            <Route path="/checkout" element={<CheckoutPage />} />
            <Route
              path="/orders/:id/confirmation"
              element={<ConfirmationPage />}
            />

            <Route path="/customer" element={<AccountLayout />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<CustomerDashboardPage />} />
              <Route path="orders" element={<CustomerOrdersPage />} />
              <Route path="orders/:id" element={<CustomerOrdersPage />} />
              <Route path="profile" element={<CustomerProfilePage />} />
              <Route path="addresses" element={<CustomerAddressesPage />} />
              <Route path="favourites" element={<CustomerFavouritesPage />} />
            </Route>

            <Route
              path="/dashboard"
              element={<Navigate to="/customer/dashboard" replace />}
            />
            <Route
              path="/dashboard/*"
              element={<Navigate to="/customer/dashboard" replace />}
            />
            <Route
              path="/orders"
              element={<Navigate to="/customer/orders" replace />}
            />
            <Route path="/orders/:id" element={<RedirectDashboardOrder />} />

            <Route path="/admin" element={<RedirectToAdminApp />} />
            <Route path="/admin/*" element={<RedirectToAdminApp />} />
            <Route path="/super-admin" element={<RedirectToAdminApp />} />
            <Route path="/super-admin/*" element={<RedirectToAdminApp />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <CookieConsentBanner />
          <ToastViewport />
        </BrowserRouter>
      </LocaleProvider>
    </AuthProvider>
  );
}
