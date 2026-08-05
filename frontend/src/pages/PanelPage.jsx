import React from 'react';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';
import { MOCK_TRIPS } from '../mock';
import { useAuth } from '../context/AuthContext';
import { Car, MapPin, Clock, Users, TrendingUp, Wallet, CheckCircle2 } from 'lucide-react';

const Stat = ({ icon: Icon, label, value, tint }) => (
  <div className="bg-white rounded-2xl p-4 border border-[#ece3c7] flex items-center gap-3">
    <div
      className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
      style={{ background: tint }}
    >
      <Icon size={20} className="text-[var(--bj-navy)]" />
    </div>
    <div className="min-w-0">
      <div className="text-xs text-[var(--bj-text)] opacity-70">{label}</div>
      <div className="text-lg font-extrabold text-[var(--bj-text)] leading-tight">{value}</div>
    </div>
  </div>
);

const PanelPage = () => {
  const { user } = useAuth();
  const localRequests = JSON.parse(localStorage.getItem('bj_requests') || '[]');
  const myTrips = user?.role === 'motorista' ? MOCK_TRIPS.filter((t) => t.driverId === user.id) : [];

  return (
    <div className="mobile-shell">
      <Header />
      <div className="striped-bar" />
      <div className="px-5 pt-5">
        <h1 className="text-3xl font-extrabold text-[var(--bj-text)] leading-tight">Painel</h1>
        <p className="text-[var(--bj-text)] opacity-70 mt-1">
          {user?.role === 'motorista' ? 'Acompanhe suas viagens e ganhos.' : 'Acompanhe suas solicitações e reservas.'}
        </p>

        <div className="grid grid-cols-2 gap-3 mt-5">
          <Stat icon={Car} label="Viagens" value={user?.role === 'motorista' ? myTrips.length : user?.trips || 0} tint="#FEF3C7" />
          <Stat icon={TrendingUp} label="Avaliação" value={(user?.rating || 0).toFixed(1)} tint="#DBEAFE" />
          <Stat icon={Wallet} label="Economizado" value="R$ 480" tint="#DCFCE7" />
          <Stat icon={CheckCircle2} label="Concluídas" value={user?.trips || 0} tint="#FCE7F3" />
        </div>

        {user?.role === 'motorista' && (
          <>
            <div className="mt-6 mb-3 flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-[var(--bj-text)]">Minhas viagens publicadas</h2>
            </div>
            {myTrips.length === 0 ? (
              <div className="bg-white rounded-2xl p-6 text-center text-[var(--bj-text)] opacity-70 border border-[#ece3c7]">
                Você ainda não publicou viagens.
              </div>
            ) : (
              myTrips.map((t) => (
                <div key={t.id} className="card-trip mb-3">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-[var(--bj-text)]">{t.origin} → {t.destination}</div>
                    <div className="text-[var(--bj-navy)] font-extrabold">R$ {t.price}</div>
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-sm text-[var(--bj-text)] opacity-80">
                    <span className="flex items-center gap-1"><Clock size={14} /> {t.date} · {t.time}</span>
                    <span className="flex items-center gap-1"><Users size={14} /> {t.seatsTotal - t.seatsFilled}/{t.seatsTotal}</span>
                  </div>
                </div>
              ))
            )}
          </>
        )}

        <div className="mt-6 mb-3">
          <h2 className="text-lg font-extrabold text-[var(--bj-text)]">Solicitações recentes</h2>
        </div>
        {localRequests.length === 0 ? (
          <div className="bg-white rounded-2xl p-6 text-center text-[var(--bj-text)] opacity-70 border border-[#ece3c7]">
            Sem solicitações ainda. Que tal solicitar uma viagem?
          </div>
        ) : (
          localRequests.map((r) => (
            <div key={r.id} className="card-trip mb-3">
              <div className="flex items-center gap-2 text-[var(--bj-text)] font-semibold">
                <MapPin size={16} /> {r.origin} → {r.destination}
              </div>
              <div className="flex items-center justify-between mt-2 text-sm text-[var(--bj-text)] opacity-80">
                <span>{r.date || 'Data flexível'} {r.time && `· ${r.time}`}</span>
                <span className="font-bold text-[var(--bj-navy)]">R$ {r.price}</span>
              </div>
              <div className="mt-2 inline-block text-xs font-bold px-3 py-1 rounded-full bg-[#FEF3C7] text-[#8A6D0A]">
                {r.status}
              </div>
            </div>
          ))
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default PanelPage;
