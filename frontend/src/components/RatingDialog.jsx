import React, { useState } from 'react';
import { X, Star } from 'lucide-react';
import { useTrips } from '../context/TripsContext';
import { useToast } from '../hooks/use-toast';

const RatingDialog = ({ reservation, trip, onClose }) => {
  const [score, setScore] = useState(5);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const { rateReservation } = useTrips();
  const { toast } = useToast();

  if (!reservation || !trip) return null;

  const submit = async () => {
    const res = await rateReservation(reservation.id, score, comment.trim());
    if (res && !res.ok) {
      toast({ title: 'Não foi possível avaliar', description: res.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Avaliação enviada!', description: `Você deu ${score} estrela(s) a ${trip.driverName}.` });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-[456px] bg-white rounded-t-3xl sm:rounded-3xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="font-extrabold text-lg text-[var(--bj-text)]">Avaliar viagem</div>
          <button onClick={onClose} className="w-9 h-9 rounded-full hover:bg-[var(--bj-cream-2)] flex items-center justify-center">
            <X size={20} />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <img src={trip.driverAvatar} alt="" className="w-12 h-12 rounded-full object-cover" />
          <div>
            <div className="font-bold text-[var(--bj-text)]">{trip.driverName}</div>
            <div className="text-xs text-[var(--bj-text)] opacity-70">{trip.origin} → {trip.destination}</div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-center gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setScore(n)}
              className="p-1 transition-transform hover:scale-110"
              aria-label={`${n} estrelas`}
            >
              <Star
                size={38}
                className={(hover || score) >= n ? 'fill-[var(--bj-yellow)] text-[var(--bj-yellow)]' : 'text-[#d9d2b8]'}
                strokeWidth={1.8}
              />
            </button>
          ))}
        </div>
        <div className="text-center text-sm text-[var(--bj-text)] opacity-80 mt-1">
          {['Péssima', 'Ruim', 'Ok', 'Boa', 'Excelente'][score - 1]}
        </div>

        <textarea
          className="round-textarea mt-4"
          placeholder="Deixe um comentário (opcional)"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />

        <div className="grid grid-cols-2 gap-3 mt-4">
          <button onClick={onClose} className="chip justify-center py-3">Cancelar</button>
          <button onClick={submit} className="btn-primary">Enviar avaliação</button>
        </div>
      </div>
    </div>
  );
};

export default RatingDialog;
