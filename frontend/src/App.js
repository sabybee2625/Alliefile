import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import DossierView from './pages/DossierView';
import SharedDossier from './pages/SharedDossier';
import PricingPage from './pages/Pricing';
import { CGU, Privacy } from './pages/Legal';
import { CookieConsent } from './components/CookieConsent';
import './App.css';

// Protected route wrapper
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Public route wrapper (redirects to dashboard if logged in)
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        }
      />
      
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

      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
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
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
