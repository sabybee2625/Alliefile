import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from './context/AuthContext';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import DossierView from './pages/DossierView';
import SharedDossier from './pages/SharedDossier';
import PricingPage from './pages/Pricing';
import { CGU, Privacy } from './pages/Legal';
import NotFound from './pages/NotFound';
import AdminPage from './pages/Admin';
import ResetPassword, { ForgotPassword } from './pages/ResetPassword';
import { CookieConsent } from './components/CookieConsent';
import './App.css';

const LoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
  </div>
);

// Protected route wrapper
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

// Public auth pages (redirect to dashboard if already logged in)
const PublicAuthRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
};

// Root: Landing for guests, dashboard redirect for logged-in users
const RootRoute = () => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (user) return <Navigate to="/dashboard" replace />;
  return <Landing />;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Landing (public) */}
      <Route path="/" element={<RootRoute />} />

      {/* Public auth routes */}
      <Route
        path="/login"
        element={
          <PublicAuthRoute>
            <Login />
          </PublicAuthRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicAuthRoute>
            <Register />
          </PublicAuthRoute>
        }
      />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Shared dossier (public, no auth required) */}
      <Route path="/shared/:token" element={<SharedDossier />} />

      {/* Pricing page (semi-public) */}
      <Route path="/pricing" element={<PricingPage />} />
      <Route path="/subscription/success" element={<PricingPage />} />
      <Route path="/subscription/cancel" element={<PricingPage />} />

      {/* Legal pages (public) */}
      <Route path="/cgu" element={<CGU />} />
      <Route path="/privacy" element={<Privacy />} />

      {/* Protected routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dossier/:id"
        element={
          <ProtectedRoute>
            <DossierView />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminPage />
          </ProtectedRoute>
        }
      />

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: 'hsl(222 47% 11%)',
              color: 'white',
              border: 'none',
            },
          }}
        />
        <CookieConsent />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
