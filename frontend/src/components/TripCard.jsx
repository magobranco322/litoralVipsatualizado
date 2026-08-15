import React from 'react';
import { Users, PawPrint, Home, Star, Car, ShieldCheck, Crown } from 'lucide-react';

// Golden "Melhor Motorista" featured badge.
const FeaturedBadge = () => (
  <span
    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full shrink-0"
    style={{
      background: 'linear-gradient(135deg, #F5C518 0%, #E8B800 45%, #B48200 100%)',
      border: '1px solid #8A6D0A',
      boxShadow: '0 1px 4px rgba(180, 130, 0, 0.35)',
    }}
    title="Melhor Motorista Litoral VIP"
    data-testid="featured-badge"
  >
    <Crown size={10} className="text-[#3a2a00]" strokeWidth={2.5} />
    <span className="text-[9px] font-extrabold tracking-wider text-[#3a2a00] leading-none">MELHOR MOTORISTA</span>
  </span>
);

// Compute duration string like "1h20" from HH:MM start and end (same day or crossing midnight).
const computeDuration = (start, end) => {
  if (!start || !end) return '';
  const [h1, m1] = start.split(':').map(Number);
  const [h2, m2] = end.split(':').map(Number);
  if ([h1, m1, h2, m2].some((n) => Number.isNaN(n))) return '';
  let mins = (h2 * 60 + m2) - (h1 * 60 + m1);
  if (mins < 0) mins += 24 * 60; // crosses midnight
  if (mins <= 0) return '';
  const hh = Math.floor(mins / 60);
  const mm = mins % 60;
  if (hh === 0) return `${mm}min`;
  if (mm === 0) return `${hh}h`;
  return `${hh}h${String(mm).padStart(2, '0')}`;
};

// Split price like 50.00 into "50" + "00"
const splitPrice = (price) => {
  const [int, dec] = Number(price).toFixed(2).split('.');
  return { int, dec };
};

const TripCard = ({ trip, onClick }) => {
  const duration = computeDuration(trip.time, trip.arrivalTime);
  const price = splitPrice(trip.price);

  return (
    <div className="card-trip mb-3" onClick={onClick} role="button" data-testid={`trip-card-${trip.id}`}>
      {/* Row: schedule + price */}
      <div className="flex items-start justify-between gap-3">
        {/* Schedule column */}
        <div className="flex gap-3 flex-1 min-w-0">
          {/* time labels */}
          <div className="flex flex-col items-end text-right shrink-0 pt-0.5">
            <div className="text-[22px] leading-none font-extrabold text-[var(--bj-text)] tracking-tight">{trip.time}</div>
            {duration && (
              <div className="text-[12px] font-semibold text-[var(--bj-muted)] mt-2 mb-1">{duration}</div>
            )}
            {trip.arrivalTime && (
              <div className="text-[22px] leading-none font-extrabold text-[var(--bj-text)] tracking-tight mt-1">{trip.arrivalTime}</div>
            )}
          </div>
          {/* route timeline */}
          <div className="flex flex-col items-center pt-2 shrink-0">
            <span className="w-3 h-3 rounded-full border-[2.5px] border-[var(--bj-navy)] bg-white" />
            <span className="flex-1 w-[2px] bg-[var(--bj-navy)] my-1" style={{ minHeight: duration ? 34 : 22 }} />
            <span className="w-3 h-3 rounded-full border-[2.5px] border-[var(--bj-navy)] bg-white" />
          </div>
          {/* origin/destination text */}
          <div className="flex-1 min-w-0 pt-0.5 flex flex-col justify-between">
            <div className="font-extrabold text-[17px] text-[var(--bj-text)] truncate">{trip.origin}</div>
            <div className="font-extrabold text-[17px] text-[var(--bj-text)] truncate">{trip.destination}</div>
          </div>
        </div>
        {/* Price */}
        <div className="text-right shrink-0">
          <div className="font-extrabold text-[var(--bj-text)] leading-none tracking-tight">
            <span className="text-[16px] mr-0.5">R$</span>
            <span className="text-[24px]">{price.int}</span>
            <span className="text-[13px] align-top">,{price.dec}</span>
          </div>
        </div>
      </div>

      {/* Divider + driver row */}
      <div className="mt-4 pt-3 border-t border-[var(--bj-border)] flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Car size={20} className="text-[var(--bj-muted)] shrink-0" />
          <div className="relative shrink-0">
            <img
              src={trip.driverAvatar}
              alt={trip.driverName}
              className="w-9 h-9 rounded-full object-cover border-2 border-[var(--bj-navy)]"
            />
            <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-[var(--bj-navy)] flex items-center justify-center border border-white">
              <ShieldCheck size={10} className="text-white" />
            </span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-extrabold text-[15px] text-[var(--bj-text)] truncate leading-tight">{trip.driverName}</span>
              {trip.featured && <FeaturedBadge />}
            </div>
            <div className="flex items-center gap-1 text-[13px] text-[var(--bj-muted)] mt-0.5">
              <Star size={12} className="fill-[var(--bj-muted)] text-[var(--bj-muted)]" />
              <span className="font-semibold">{trip.rating.toFixed(1)}</span>
              {trip.driverTrips > 0 && <span className="opacity-70">· {trip.driverTrips}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[var(--bj-muted)] shrink-0">
          {trip.petFriendly && <PawPrint size={16} />}
          {trip.homePickup && <Home size={16} />}
          <div className="flex items-center gap-1 text-[13px] font-semibold">
            <Users size={14} />
            <span>{trip.seatsTotal - trip.seatsFilled}/{trip.seatsTotal}</span>
          </div>
        </div>
      </div>

      {/* Small date row */}
      <div className="mt-2 text-[12px] text-[var(--bj-muted)] font-medium">{trip.date}</div>
    </div>
  );
};

export default TripCard;
