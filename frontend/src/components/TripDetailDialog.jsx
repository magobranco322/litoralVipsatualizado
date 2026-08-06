import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Clock, Users, PawPrint, Home, Star, X, Car, MessageCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTrips } from '../context/TripsContext';
import { useToast } from '../hooks/use-toast';

const TripDetailDialog = ({ trip, onClose }) => {
  const { user, users } = useAuth();
  const { reserveSeat } = useTrips();
  const navigate = useNavigate();
  const { toast } = useToast();

  if (!trip) return null;

  const seatsLeft = trip.seatsTotal - trip.seatsFilled;
  const isOwn = user?.id === trip.driverId;

  const handleReserve = async () => {
    if (!user) return;
    if (user.role === 'admin') {
      toast({ title: 'Admins não reservam viagens', variant: 'destructive' });
      return;
    }
    const res = await reserveSeat(trip.id);
    if (!res.ok) {
      toast({ title: 'Não foi possível reservar', description: res.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Vaga reservada!', description: 'Iniciando conversa com o motorista.' });
    onClose();
    navigate('/chat');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-[456px] bg-white rounded-t-3xl sm:rounded-3xl p-5 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="font-extrabold text-lg text-[var(--bj-text)]">Detalhes da viagem</div>
          <button onClick={onClose} className="w-9 h-9 rounded-full hover:bg-[var(--bj-cream-2)] flex items-center justify-center">
            <X size={20} className="text-[var(--bj-text)]" />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <img src={trip.driverAvatar} alt="" className="w-14 h-14 rounded-full object-cover" />
          <div className="min-w-0">
            <div className="font-bold text-[var(--bj-text)] truncate">{trip.driverName}</div>
            <div className="flex items-center gap-1.5 text-sm text-[var(--bj-text)] opacity-80">
              <Star size={14} className="fill-[var(--bj-navy)] text-[var(--bj-navy)]" />
              <span className="font-semibold">{trip.rating.toFixed(1)}</span>
              <span>· {trip.driverTrips} viagens</span>
            </div>
          </div>
          <div className="ml-auto text-right">
            <div className="text-xl font-extrabold text-[var(--bj-text)]">R$ {trip.price}</div>
            <div className="text-[11px] text-[var(--bj-text)] opacity-70">POR VAGA</div>
          </div>
        </div>

        <div className="mt-4 pl-1">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--bj-navy)]" />
            <MapPin size={18} />
            <span className="font-semibold text-[var(--bj-text)]">{trip.origin}</span>
          </div>
          <div className="ml-[5px] my-1 border-l-2 border-dotted border-[#c9c1a5] h-4" />
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--bj-yellow)]" />
            <MapPin size={18} />
            <span className="font-semibold text-[var(--bj-text)]">{trip.destination}</span>
          </div>
        </div>

        <div className="dashed-sep" />

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 text-[var(--bj-text)]"><Clock size={16} /> {trip.date} · {trip.time}</div>
          <div className="flex items-center gap-2 text-[var(--bj-text)]"><Users size={16} /> {seatsLeft} vaga(s) restantes</div>
          <div className="flex items-center gap-2 text-[var(--bj-text)]"><PawPrint size={16} /> {trip.petFriendly ? 'Aceita pets' : 'Sem pets'}</div>
          <div className="flex items-center gap-2 text-[var(--bj-text)]"><Home size={16} /> {trip.homePickup ? 'Busca em casa' : 'Ponto combinado'}</div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            onClick={handleReserve}
            disabled={seatsLeft === 0 || isOwn}
            className="btn-primary w-full disabled:opacity-50"
          >
            <Car size={16} className="inline mr-1" />
            {isOwn ? 'Sua viagem' : seatsLeft === 0 ? 'Esgotado' : 'Reservar vaga'}
          </button>
          <button
            onClick={() => { onClose(); navigate('/chat'); }}
            className="btn-yellow w-full"
          >
            <MessageCircle size={16} className="inline mr-1" /> Conversar
          </button>
        </div>
      </div>
    </div>
  );
};

export default TripDetailDialog;
