import React, { useState } from 'react';
import { Bell, LogOut, X, CheckCheck, Trash2, UserPlus, PencilLine, XCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTrips } from '../context/TripsContext';
import { useNavigate } from 'react-router-dom';

const iconFor = (type) => {
  if (type === 'reserva') return UserPlus;
  if (type === 'alteracao') return PencilLine;
  if (type === 'cancelamento') return XCircle;
  return Bell;
};

const tintFor = (type) => {
  if (type === 'reserva') return { bg: '#DCFCE7', color: '#166534' };
  if (type === 'alteracao') return { bg: '#FEF3C7', color: '#8A6D0A' };
  if (type === 'cancelamento') return { bg: '#FEE2E2', color: '#991B1B' };
  return { bg: '#DBEAFE', color: '#1E40AF' };
};

const formatWhen = (iso) => {
  const d = new Date(iso);
  const now = new Date();
  const diff = (now - d) / 1000;
  if (diff < 60) return 'agora';
  if (diff < 3600) return `${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return d.toLocaleDateString('pt-BR');
};

const Header = () => {
  const { user, logout } = useAuth();
  const { getNotificationsFor, markAllNotificationsRead, clearNotifications } = useTrips();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  if (!user) return null;

  const notifs = getNotificationsFor();
  const unread = notifs.filter((n) => !n.read).length;

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const openPanel = () => {
    setOpen(true);
    if (unread > 0) setTimeout(() => markAllNotificationsRead(), 400);
  };

  return (
    <>
      <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-[#ece3c7]">
        <div className="text-[15px] text-[var(--bj-text)] truncate pr-3 flex-1">
          Olá, <span className="font-medium">{user.email}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={openPanel}
            className="relative w-10 h-10 rounded-full hover:bg-[var(--bj-cream-2)] flex items-center justify-center transition-colors"
            aria-label="Notificações"
          >
            <Bell size={20} className="text-[var(--bj-text)]" strokeWidth={2.2} />
            {unread > 0 && (
              <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--bj-red)] text-white text-[10px] font-bold flex items-center justify-center">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>
          <button onClick={handleLogout} className="btn-outline-danger text-sm">
            <LogOut size={16} strokeWidth={2.4} />
            Sair
          </button>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div className="w-full max-w-[456px] bg-white rounded-t-3xl sm:rounded-3xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-[#ece3c7] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell size={20} className="text-[var(--bj-navy)]" />
                <span className="font-extrabold text-lg text-[var(--bj-text)]">Notificações</span>
              </div>
              <div className="flex items-center gap-1">
                {notifs.length > 0 && (
                  <button
                    onClick={() => clearNotifications()}
                    className="w-9 h-9 rounded-full hover:bg-[var(--bj-cream-2)] flex items-center justify-center"
                    title="Limpar tudo"
                  >
                    <Trash2 size={17} className="text-[var(--bj-text)] opacity-70" />
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="w-9 h-9 rounded-full hover:bg-[var(--bj-cream-2)] flex items-center justify-center">
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3">
              {notifs.length === 0 ? (
                <div className="text-center py-14">
                  <div className="mx-auto w-14 h-14 rounded-full bg-[var(--bj-cream-2)] flex items-center justify-center">
                    <CheckCheck size={24} className="text-[var(--bj-navy)]" />
                  </div>
                  <div className="mt-3 font-bold text-[var(--bj-text)]">Tudo em dia!</div>
                  <div className="text-sm text-[var(--bj-text)] opacity-70">Você será avisado por aqui.</div>
                </div>
              ) : (
                <div className="space-y-2">
                  {notifs.map((n) => {
                    const Icon = iconFor(n.type);
                    const tint = tintFor(n.type);
                    return (
                      <div key={n.id} className={`p-3 rounded-2xl border ${n.read ? 'border-[#ece3c7] bg-white' : 'border-[var(--bj-navy)]/30 bg-[#F8F5EA]'} flex gap-3`}>
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: tint.bg }}>
                          <Icon size={18} style={{ color: tint.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-[var(--bj-text)] leading-snug">{n.message}</div>
                          <div className="text-[11px] text-[var(--bj-text)] opacity-60 mt-1">{formatWhen(n.at)}</div>
                        </div>
                        {!n.read && (
                          <span className="w-2 h-2 rounded-full bg-[var(--bj-red)] flex-shrink-0 mt-2" />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
