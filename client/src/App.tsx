import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import TwoFactor from './pages/TwoFactor';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Search from './pages/Search';
import Contribute from './pages/Contribute';
import Dashboard from './pages/Dashboard';
import AdminPanel from './pages/AdminPanel';
import CMSEditor from './pages/CMSEditor';
import Terms from './pages/Terms';

function ProtectedRoute({ children, adminOnly = false, trueAdminOnly = false }: {
  children: React.ReactNode;
  adminOnly?: boolean;
  trueAdminOnly?: boolean;
}) {
  const { user, isAuthenticated } = useAuthStore();

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (adminOnly && user?.role !== 'admin' && user?.role !== 'true_admin') return <Navigate to="/search" replace />;
  if (trueAdminOnly && user?.role !== 'true_admin') return <Navigate to="/search" replace />;

  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-2fa" element={<TwoFactor />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/terms" element={<Terms />} />

        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/search" replace />} />
          <Route path="/search" element={<ProtectedRoute><Search /></ProtectedRoute>} />
          <Route path="/contribute" element={<ProtectedRoute><Contribute /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute adminOnly><AdminPanel /></ProtectedRoute>} />
          <Route path="/cms" element={<ProtectedRoute trueAdminOnly><CMSEditor /></ProtectedRoute>} />
        </Route>

        <Route path="*" element={<Navigate to="/search" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
