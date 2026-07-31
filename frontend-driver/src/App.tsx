import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { LocaleProvider } from './locale/LocaleContext';
import { LoginPage } from './pages/LoginPage';
import { DriverTodayPage } from './pages/driver/TodayPage';
import { DriverDetailPage } from './pages/driver/DetailPage';

export default function App() {
  return (
    <AuthProvider>
      <LocaleProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<DriverTodayPage />} />
            <Route path="/orders/:id" element={<DriverDetailPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </LocaleProvider>
    </AuthProvider>
  );
}
