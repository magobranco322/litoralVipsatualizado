import React from 'react';
import { MapPin, Clock, Users, PawPrint, Home, Star } from 'lucide-react';

const TripCard = ({ trip, onClick }) => {
  return (
    <div className="card-trip mb-4" onClick={onClick} role="button">
      <div className="flex items-start gap-3">
        <img
          src={trip.driverAvatar}
          alt={trip.driverName}
          className="w-14 h-14 rounded-full object-cover flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-bold text-[17px] leading-tight text-[var(--bj-text)] truncate">
                {trip.driverName}
              </h3>
              <div className="flex items-center gap-1.5 mt-1 text-sm text-[var(--bj-text)] opacity-80">
                <Star size={14} className="fill-[var(--bj-navy)] text-[var(--bj-navy)]" />
                <span className="font-semibold">{trip.rating.toFixed(1)}</span>
                <span>· {trip.driverTrips} viagens</span>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-[22px] font-extrabold text-[var(--bj-text)] leading-none">
                R$ {trip.price}
              </div>
              <div className="text-[11px] tracking-wide text-[var(--bj-text)] opacity-70 mt-1">
                POR VAGA
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 pl-1">
        <div className="flex items-center gap-3 relative">
          <span className="w-2.5 h-2.5 rounded-full bg-[var(--bj-navy)]" />
          <MapPin size={18} className="text-[var(--bj-text)]" />
          <span className="font-semibold text-[var(--bj-text)] truncate">{trip.origin}</span>
        </div>
        <div className="ml-[5px] my-1 border-l-2 border-dotted border-[#c9c1a5] h-4" />
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-[var(--bj-yellow)]" />
          <MapPin size={18} className="text-[var(--bj-text)]" />
          <span className="font-semibold text-[var(--bj-text)] truncate">{trip.destination}</span>
        </div>
      </div>

      <div className="dashed-sep" />

      <div className="flex items-center justify-between text-sm text-[var(--bj-text)] opacity-90">
        <div className="flex items-center gap-1.5">
          <Clock size={16} />
          <span>{trip.date} · {trip.time}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Users size={16} />
          <span>{trip.seatsTotal - trip.seatsFilled}/{trip.seatsTotal} vagas</span>
        </div>
        <div className="flex items-center gap-2">
          {trip.petFriendly && <PawPrint size={16} />}
          {trip.homePickup && <Home size={16} />}
        </div>
      </div>
    </div>
  );
};

export default TripCard;
