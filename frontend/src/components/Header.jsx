import React from 'react';
import { LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Header = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  if (!user) return null;

  return (
    <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-[#ece3c7]">
      <div className="text-[15px] text-[var(--bj-text)] truncate pr-3">
        Olá, <span className="font-medium">{user.email}</span>
      </div>
      <button onClick={handleLogout} className="btn-outline-danger text-sm">
        <LogOut size={16} strokeWidth={2.4} />
        Sair
      </button>
    </div>
  );
};

export default Header;
