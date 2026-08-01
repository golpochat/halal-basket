import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ToastViewport } from '@halal-basket/web';
import { AuthProvider } from './auth/AuthContext';
import { LocaleProvider } from './locale/LocaleContext';
import { DriverLayout } from './layouts/DriverLayout';
import { LoginPage } from './pages/LoginPage';
import { DriverTodayPage } from './pages/driver/TodayPage';
import { DriverDetailPage } from './pages/driver/DetailPage';
import { RedirectOrderDetail } from './pages/RedirectOrderDetail';
import { DriverProfilePage } from './pages/driver/ProfilePage';

export default function App() {
  return (
    <AuthProvider>
      <LocaleProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<Navigate to="/driver/dashboard" replace />} />
            <Route path="/driver" element={<DriverLayout />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<DriverTodayPage />} />
              <Route path="orders/:id" element={<DriverDetailPage />} />
              <Route path="profile" element={<DriverProfilePage />} />
            </Route>
            <Route path="/dashboard" element={<Navigate to="/driver/dashboard" replace />} />
            <Route path="/dashboard/*" element={<Navigate to="/driver/dashboard" replace />} />
            <Route path="/orders/:id" element={<RedirectOrderDetail />} />
            <Route path="*" element={<Navigate to="/driver/dashboard" replace />} />
          </Routes>
          <ToastViewport />
        </BrowserRouter>
      </LocaleProvider>
    </AuthProvider>
  );
}
