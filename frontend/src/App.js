import React from 'react';
import './App.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import SearchPage from './pages/SearchPage';
import RequestPage from './pages/RequestPage';
import PanelPage from './pages/PanelPage';
import ChatPage from './pages/ChatPage';
import ProfilePage from './pages/ProfilePage';
import ModerationPage from './pages/ModerationPage';
import { Toaster } from './components/ui/toaster';

const Protected = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="mobile-shell" />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

const AdminOnly = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="mobile-shell" />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/buscar" replace />;
  return children;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/buscar" element={<Protected><SearchPage /></Protected>} />
      <Route path="/solicitar" element={<Protected><RequestPage /></Protected>} />
      <Route path="/painel" element={<Protected><PanelPage /></Protected>} />
      <Route path="/chat" element={<Protected><ChatPage /></Protected>} />
      <Route path="/chat/:chatId" element={<Protected><ChatPage /></Protected>} />
      <Route path="/perfil" element={<Protected><ProfilePage /></Protected>} />
      <Route path="/moderacao" element={<AdminOnly><ModerationPage /></AdminOnly>} />
      <Route path="/" element={<Navigate to="/buscar" replace />} />
      <Route path="*" element={<Navigate to="/buscar" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
