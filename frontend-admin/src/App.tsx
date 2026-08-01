import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ToastViewport } from '@halal-basket/web';
import { AuthProvider } from './auth/AuthContext';
import { LocaleProvider } from './locale/LocaleContext';
import {
  AdminAreaLayout,
  SuperAdminAreaLayout,
} from './layouts/AdminLayout';
import { LoginPage } from './pages/LoginPage';
import { AdminDashboardPage } from './pages/admin/DashboardPage';
import { AdminOpsPage } from './pages/admin/OpsPage';
import { AdminAnalyticsPage } from './pages/admin/AnalyticsPage';
import { AdminBrandingPage } from './pages/admin/BrandingPage';
import { AdminWarehousePage } from './pages/admin/WarehousePage';
import { AdminDeliveryFeesPage } from './pages/admin/DeliveryFeesPage';
import { AdminPromotionsPage } from './pages/admin/PromotionsPage';
import { AdminDeliveryCalendarPage } from './pages/admin/DeliveryCalendarPage';
import { AdminFeaturedCategoriesPage } from './pages/admin/FeaturedCategoriesPage';
import { AdminCurrenciesPage } from './pages/admin/CurrenciesPage';
import { AdminLanguagesPage } from './pages/admin/LanguagesPage';
import { AdminShopsPage } from './pages/admin/ShopsPage';
import { AdminUsersPage } from './pages/admin/UsersPage';
import { AdminCataloguePage } from './pages/admin/CataloguePage';
import { AdminGdprPage } from './pages/admin/GdprPage';
import { AdminOpsDrillPage } from './pages/admin/OpsDrillPage';
import { AdminProfilePage } from './pages/admin/ProfilePage';
import { useAuth } from './auth/AuthContext';
import { homeForRole } from './lib/api';

function RoleHomeRedirect() {
  const { session } = useAuth();
  if (!session) return <Navigate to="/login" replace />;
  return <Navigate to={homeForRole(session.user.role)} replace />;
}

function adminChildRoutes() {
  return (
    <>
      <Route index element={<Navigate to="dashboard" replace />} />
      <Route path="dashboard" element={<AdminDashboardPage />} />
      <Route path="profile" element={<AdminProfilePage />} />
      <Route path="ops" element={<AdminOpsPage />} />
      <Route path="analytics" element={<AdminAnalyticsPage />} />
      <Route path="branding" element={<AdminBrandingPage />} />
      <Route path="warehouse" element={<AdminWarehousePage />} />
      <Route path="delivery-fees" element={<AdminDeliveryFeesPage />} />
      <Route path="promotions" element={<AdminPromotionsPage />} />
      <Route path="delivery-calendar" element={<AdminDeliveryCalendarPage />} />
      <Route path="featured" element={<AdminFeaturedCategoriesPage />} />
      <Route path="currencies" element={<AdminCurrenciesPage />} />
      <Route path="languages" element={<AdminLanguagesPage />} />
      <Route path="shops" element={<AdminShopsPage />} />
      <Route path="users" element={<AdminUsersPage />} />
      <Route path="catalogue" element={<AdminCataloguePage />} />
      <Route path="gdpr" element={<AdminGdprPage />} />
      <Route path="ops-drill" element={<AdminOpsDrillPage />} />
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <LocaleProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<RoleHomeRedirect />} />

            <Route path="/admin" element={<AdminAreaLayout />}>
              {adminChildRoutes()}
            </Route>

            <Route path="/super-admin" element={<SuperAdminAreaLayout />}>
              {adminChildRoutes()}
            </Route>

            {/* Legacy */}
            <Route path="/dashboard" element={<RoleHomeRedirect />} />
            <Route path="/dashboard/*" element={<RoleHomeRedirect />} />
            <Route path="/ops" element={<Navigate to="/admin/ops" replace />} />

            <Route path="*" element={<RoleHomeRedirect />} />
          </Routes>
          <ToastViewport />
        </BrowserRouter>
      </LocaleProvider>
    </AuthProvider>
  );
}
