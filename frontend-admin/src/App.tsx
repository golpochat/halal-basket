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
import { AdminCurrenciesPage } from './pages/admin/CurrenciesPage';
import { AdminLanguagesPage } from './pages/admin/LanguagesPage';
import { AdminShopsPage } from './pages/admin/ShopsPage';
import { AdminShopOverviewPage } from './pages/admin/ShopOverviewPage';
import { AdminUsersPage } from './pages/admin/UsersPage';
import { AdminShopUsersPage } from './pages/admin/ShopUsersPage';
import { AdminDriversPage } from './pages/admin/DriversPage';
import { AdminDriverActivityPage } from './pages/admin/DriverActivityPage';
import { AdminDriverOverviewPage } from './pages/admin/DriverOverviewPage';
import { AdminRolesPage } from './pages/admin/RolesPage';
import { AdminCataloguePage } from './pages/admin/CataloguePage';
import { AdminGdprPage } from './pages/admin/GdprPage';
import { AdminOpsDrillPage } from './pages/admin/OpsDrillPage';
import { AdminProfilePage } from './pages/admin/ProfilePage';
import { AdminFeaturedCategoriesPage } from './pages/admin/FeaturedCategoriesPage';
import { AdminLegalPagesPage } from './pages/admin/LegalPagesPage';
import { useAuth } from './auth/AuthContext';
import { homeForRole } from './lib/api';

function RoleHomeRedirect() {
  const { session } = useAuth();
  if (!session) return <Navigate to="/login" replace />;
  return <Navigate to={homeForRole(session.user.role)} replace />;
}

function LegacyOpsRedirect() {
  const { session } = useAuth();
  if (!session) return <Navigate to="/login" replace />;
  if (session.user.role === 'super_admin') {
    return <Navigate to="/super-admin/ops" replace />;
  }
  if (session.user.role === 'admin') {
    return <Navigate to="/admin/ops" replace />;
  }
  return <RoleHomeRedirect />;
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
      <Route path="featured" element={<AdminFeaturedCategoriesPage />} />
      <Route path="legal" element={<AdminLegalPagesPage />} />
      <Route path="currencies" element={<AdminCurrenciesPage />} />
      <Route path="languages" element={<AdminLanguagesPage />} />
      <Route path="shops" element={<AdminShopsPage />} />
      <Route path="shops/:shopId" element={<AdminShopOverviewPage />} />
      <Route path="roles" element={<AdminRolesPage />} />
      <Route path="users" element={<AdminUsersPage />} />
      <Route path="shop-users" element={<AdminShopUsersPage />} />
      <Route path="drivers" element={<AdminDriversPage />} />
      <Route path="driver-activity" element={<AdminDriverActivityPage />} />
      <Route
        path="driver-activity/:driverId"
        element={<AdminDriverOverviewPage />}
      />
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
            <Route path="/ops" element={<LegacyOpsRedirect />} />

            <Route path="*" element={<RoleHomeRedirect />} />
          </Routes>
          <ToastViewport />
        </BrowserRouter>
      </LocaleProvider>
    </AuthProvider>
  );
}
