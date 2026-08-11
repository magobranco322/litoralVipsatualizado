import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';
import RatingDialog from '../components/RatingDialog';
import EditTripDialog from '../components/EditTripDialog';
import { useAuth } from '../context/AuthContext';
import { useTrips } from '../context/TripsContext';
import { useToast } from '../hooks/use-toast';
import { openWhatsApp, hasValidPhone, buildReservationMessage } from '../lib/whatsapp';
import { Car, MapPin, Clock, Users, TrendingUp, Wallet, CheckCircle2, Plus, Star, XCircle, Flag, PencilLine, MessageCircle } from 'lucide-react';

const Stat = ({ icon: Icon, label, value, tint }) => (
  <div className="bg-white rounded-2xl p-4 border border-[#ece3c7] flex items-center gap-3">
    <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: tint }}>
      <Icon size={20} className="text-[var(--bj-navy)]" />
    </div>
    <div className="min-w-0">
      <div className="text-xs text-[var(--bj-text)] opacity-70">{label}</div>
      <div className="text-lg font-extrabold text-[var(--bj-text)] leading-tight">{value}</div>
    </div>
  </div>
);

const PanelPage = () => {
  const { user, users } = useAuth();
  const { trips, reservations, cancelReservation, completeReservation } = useTrips();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [rating, setRating] = useState(null); // { reservation, trip }
  const [editingTrip, setEditingTrip] = useState(null);

  const notifyDriverWhatsApp = (trip) => {
    const driver = (users || []).find((u) => u.id === trip.driverId);
    if (!driver || !hasValidPhone(driver.phone)) {
      toast({ title: 'Motorista sem WhatsApp', description: 'Este motorista não cadastrou um número válido.', variant: 'destructive' });
      return;
    }
    const message = buildReservationMessage({
      passengerName: user.name,
      driverName: trip.driverName,
      origin: trip.origin,
      destination: trip.destination,
      date: trip.date,
      time: trip.time,
    });
    openWhatsApp(driver.phone, message);
  };

  const localRequests = JSON.parse(localStorage.getItem('bj_requests') || '[]');

  const myPublishedTrips = user?.role === 'motorista' ? trips.filter((t) => t.driverId === user.id) : [];
  const myReservations = reservations.filter((r) => r.passengerId === user?.id);

  const incomingReservations =
    user?.role === 'motorista'
      ? reservations.filter((r) => r.driverId === user.id && r.status !== 'cancelada')
      : [];

  const findTrip = (id) => trips.find((t) => t.id === id);

  const openRating = (res) => {
    const trip = findTrip(res.tripId);
    if (!trip) return;
    setRating({ reservation: res, trip });
  };

  return (
    <div className="mobile-shell">
      <Header />
      <div className="striped-bar" />
      <div className="px-5 pt-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-extrabold text-[var(--bj-text)] leading-tight">Painel</h1>
            <p className="text-[var(--bj-text)] opacity-70 mt-1">
              {user?.role === 'motorista' ? 'Acompanhe suas viagens e reservas.' : 'Acompanhe suas reservas e solicitações.'}
            </p>
          </div>
          {user?.role === 'motorista' && (
            <button onClick={() => navigate('/publicar')} className="btn-yellow shrink-0 flex items-center gap-1.5 px-4 py-2.5">
              <Plus size={16} /> Publicar
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 mt-5">
          <Stat icon={Car} label={user?.role === 'motorista' ? 'Publicadas' : 'Reservas'} value={user?.role === 'motorista' ? myPublishedTrips.length : myReservations.length} tint="#FEF3C7" />
          <Stat icon={TrendingUp} label="Avaliação" value={(user?.rating || 0).toFixed(1)} tint="#DBEAFE" />
          <Stat icon={Wallet} label="Economizado" value="R$ 480" tint="#DCFCE7" />
          <Stat icon={CheckCircle2} label="Concluídas" value={myReservations.filter((r) => r.status === 'concluida').length} tint="#FCE7F3" />
        </div>

        {user?.role === 'motorista' && (
          <>
            <div className="mt-6 mb-3 flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-[var(--bj-text)]">Minhas viagens publicadas</h2>
            </div>
            {myPublishedTrips.length === 0 ? (
              <div className="bg-white rounded-2xl p-6 text-center text-[var(--bj-text)] opacity-70 border border-[#ece3c7]">
                Você ainda não publicou viagens.{' '}
                <button onClick={() => navigate('/publicar')} className="font-bold text-[var(--bj-navy)] ml-1">Publicar agora</button>
              </div>
            ) : (
              myPublishedTrips.map((t) => (
                <div key={t.id} className="card-trip mb-3">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-[var(--bj-text)] truncate pr-2">{t.origin} → {t.destination}</div>
                    <div className="text-[var(--bj-navy)] font-extrabold whitespace-nowrap">R$ {t.price}</div>
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-sm text-[var(--bj-text)] opacity-80">
                    <span className="flex items-center gap-1"><Clock size={14} /> {t.date} · {t.time}</span>
                    <span className="flex items-center gap-1"><Users size={14} /> {t.seatsTotal - t.seatsFilled}/{t.seatsTotal}</span>
                    {t.status === 'cancelada' && (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#FEE2E2] text-[#991B1B]">cancelada</span>
                    )}
                  </div>
                  {t.status !== 'cancelada' && (
                    <button
                      onClick={() => setEditingTrip(t)}
                      className="mt-3 w-full chip justify-center py-2.5"
                    >
                      <PencilLine size={16} /> Editar / Cancelar
                    </button>
                  )}
                </div>
              ))
            )}

            <div className="mt-6 mb-3">
              <h2 className="text-lg font-extrabold text-[var(--bj-text)]">Reservas recebidas</h2>
            </div>
            {incomingReservations.length === 0 ? (
              <div className="bg-white rounded-2xl p-6 text-center text-[var(--bj-text)] opacity-70 border border-[#ece3c7]">
                Sem reservas por enquanto.
              </div>
            ) : (
              incomingReservations.map((r) => {
                const t = findTrip(r.tripId);
                if (!t) return null;
                return (
                  <div key={r.id} className="card-trip mb-3">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-[var(--bj-text)]">{t.origin} → {t.destination}</div>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${r.status === 'concluida' ? 'bg-[#DCFCE7] text-[#166534]' : 'bg-[#FEF3C7] text-[#8A6D0A]'}`}>
                        {r.status}
                      </span>
                    </div>
                    <div className="text-sm text-[var(--bj-text)] opacity-80 mt-1">{t.date} · {t.time}</div>
                    {r.status === 'confirmada' && (
                      <button
                        onClick={() => { completeReservation(r.id); toast({ title: 'Viagem marcada como concluída' }); }}
                        className="btn-primary mt-3 w-full text-sm py-2.5"
                      >
                        <Flag size={16} className="inline mr-1" /> Marcar como concluída
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </>
        )}

        {user?.role !== 'motorista' && (
          <>
            <div className="mt-6 mb-3">
              <h2 className="text-lg font-extrabold text-[var(--bj-text)]">Minhas reservas</h2>
            </div>
            {myReservations.length === 0 ? (
              <div className="bg-white rounded-2xl p-6 text-center text-[var(--bj-text)] opacity-70 border border-[#ece3c7]">
                Você ainda não reservou vagas. Descubra viagens no botão Buscar.
              </div>
            ) : (
              myReservations.map((r) => {
                const t = findTrip(r.tripId);
                if (!t) return null;
                return (
                  <div key={r.id} className="card-trip mb-3">
                    <div className="flex items-center gap-2 text-[var(--bj-text)] font-semibold">
                      <MapPin size={16} /> {t.origin} → {t.destination}
                    </div>
                    <div className="flex items-center justify-between mt-2 text-sm text-[var(--bj-text)] opacity-80">
                      <span className="flex items-center gap-1"><Clock size={14} /> {t.date} · {t.time}</span>
                      <span className="font-bold text-[var(--bj-navy)]">R$ {t.price}</span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        r.status === 'concluida' ? 'bg-[#DCFCE7] text-[#166534]'
                        : r.status === 'cancelada' ? 'bg-[#FEE2E2] text-[#991B1B]'
                        : 'bg-[#FEF3C7] text-[#8A6D0A]'
                      }`}>
                        {r.status}
                      </span>
                      {r.ratingGiven && (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#DBEAFE] text-[#1E40AF] flex items-center gap-1">
                          <Star size={10} className="fill-current" /> {r.ratingScore}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2 mt-3">
                      {r.status === 'confirmada' && (
                        <>
                          <button
                            onClick={() => notifyDriverWhatsApp(t)}
                            className="flex-1 text-sm py-2.5 rounded-full font-bold flex items-center justify-center gap-1.5 transition-colors"
                            style={{ background: '#25D366', color: '#fff' }}
                            title="Avisar motorista via WhatsApp"
                          >
                            <MessageCircle size={16} /> WhatsApp
                          </button>
                          <button
                            onClick={() => { completeReservation(r.id); toast({ title: 'Viagem concluída! Deixe sua avaliação.' }); }}
                            className="flex-1 btn-primary text-sm py-2.5"
                          >
                            <CheckCircle2 size={16} className="inline mr-1" /> Concluí
                          </button>
                          <button
                            onClick={() => { cancelReservation(r.id); toast({ title: 'Reserva cancelada' }); }}
                            className="flex-1 btn-outline-danger justify-center text-sm py-2.5"
                          >
                            <XCircle size={16} />
                          </button>
                        </>
                      )}
                      {r.status === 'concluida' && !r.ratingGiven && (
                        <button onClick={() => openRating(r)} className="flex-1 btn-yellow text-sm py-2.5">
                          <Star size={16} className="inline mr-1" /> Avaliar motorista
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}

            <div className="mt-6 mb-3">
              <h2 className="text-lg font-extrabold text-[var(--bj-text)]">Solicitações recentes</h2>
            </div>
            {localRequests.length === 0 ? (
              <div className="bg-white rounded-2xl p-6 text-center text-[var(--bj-text)] opacity-70 border border-[#ece3c7]">
                Sem solicitações ainda.
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
                  <div className="mt-2 inline-block text-xs font-bold px-3 py-1 rounded-full bg-[#FEF3C7] text-[#8A6D0A]">{r.status}</div>
                </div>
              ))
            )}
          </>
        )}
      </div>

      {rating && (
        <RatingDialog reservation={rating.reservation} trip={rating.trip} onClose={() => setRating(null)} />
      )}

      {editingTrip && (
        <EditTripDialog trip={editingTrip} onClose={() => setEditingTrip(null)} />
      )}

      <BottomNav />
    </div>
  );
};

export default PanelPage;
