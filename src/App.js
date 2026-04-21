import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthPage   from './pages/AuthPage';
import Dashboard  from './pages/Dashboard';
import LivePage   from './pages/LivePage';
import HistoryPage from './pages/HistoryPage';
import SchedulePage from './pages/SchedulePage';
import SettingsPage from './pages/SettingsPage';
import Layout from './components/Layout';

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'var(--bg)' }}>
      <div className="spinner" />
    </div>
  );
  return user ? children : <Navigate to="/auth" replace />;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/auth" element={user ? <Navigate to="/" replace /> : <AuthPage />} />
      <Route path="/" element={<Protected><Layout /></Protected>}>
        <Route index element={<Dashboard />} />
        <Route path="live"     element={<LivePage />} />
        <Route path="history"  element={<HistoryPage />} />
        <Route path="schedule" element={<SchedulePage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: 'var(--surface2)',
              color: 'var(--text)',
              border: '1px solid var(--border)',
              fontFamily: 'var(--font-body)',
              fontSize: '13px',
              borderRadius: '10px',
            },
            success: { iconTheme: { primary: 'var(--accent3)', secondary: 'var(--bg)' } },
            error:   { iconTheme: { primary: 'var(--danger)',  secondary: 'var(--bg)' } },
          }}
        />
      </BrowserRouter>
    </AuthProvider>
  );
}
