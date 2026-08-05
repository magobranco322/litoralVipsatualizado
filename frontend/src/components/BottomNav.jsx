import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Search, Car, LayoutGrid, MessageCircle, User, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Item = ({ to, icon: Icon, label, active }) => (
  <NavLink
    to={to}
    className="flex-1 flex flex-col items-center justify-center py-2 relative"
  >
    <div
      className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${
        active ? 'bg-[var(--bj-navy)] text-white shadow-md' : 'text-[var(--bj-text)]'
      }`}
    >
      <Icon size={20} strokeWidth={2.2} />
    </div>
    <span
      className={`text-[11px] mt-1 font-semibold ${
        active ? 'text-[var(--bj-navy)]' : 'text-[var(--bj-text)] opacity-80'
      }`}
    >
      {label}
    </span>
  </NavLink>
);

const BottomNav = () => {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const items = isAdmin
    ? [
        { to: '/moderacao', icon: Shield, label: 'Moderação', match: '/moderacao' },
        { to: '/buscar', icon: Search, label: 'Buscar', match: '/buscar' },
        { to: '/chat', icon: MessageCircle, label: 'Chat', match: '/chat' },
        { to: '/perfil', icon: User, label: 'Perfil', match: '/perfil' },
      ]
    : [
        { to: '/buscar', icon: Search, label: 'Buscar', match: '/buscar' },
        { to: '/solicitar', icon: Car, label: 'Solicitar', match: '/solicitar' },
        { to: '/painel', icon: LayoutGrid, label: 'Painel', match: '/painel' },
        { to: '/chat', icon: MessageCircle, label: 'Chat', match: '/chat' },
        { to: '/perfil', icon: User, label: 'Perfil', match: '/perfil' },
      ];

  return (
    <div className="fixed bottom-3 left-1/2 -translate-x-1/2 w-[calc(100%-24px)] max-w-[456px] z-40">
      <div className="bg-white rounded-3xl shadow-[0_8px_28px_rgba(11,42,91,0.15)] flex items-stretch px-2">
        {items.map((it) => (
          <Item
            key={it.to}
            to={it.to}
            icon={it.icon}
            label={it.label}
            active={pathname.startsWith(it.match)}
          />
        ))}
      </div>
    </div>
  );
};

export default BottomNav;
