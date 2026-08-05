import React, { useMemo, useState } from 'react';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';
import TripCard from '../components/TripCard';
import TripDetailDialog from '../components/TripDetailDialog';
import { useTrips } from '../context/TripsContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { CITIES } from '../mock';
import { PawPrint, Home, MapPin, ArrowUpDown, Plus, Calendar, X, ArrowRightLeft } from 'lucide-react';

const FilterChip = ({ active, onClick, icon: Icon, children }) => (
  <button className={`chip ${active ? 'active' : ''}`} onClick={onClick}>
    <Icon size={16} />
    {children}
  </button>
);

const SearchPage = () => {
  const { trips } = useTrips();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [originFilter, setOriginFilter] = useState('');
  const [destFilter, setDestFilter] = useState('');
  const [filters, setFilters] = useState({ pet: false, home: false, near: false });
  const [sort, setSort] = useState('date');
  const [sortOpen, setSortOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState('');
  const [selectedTrip, setSelectedTrip] = useState(null);

  // Available cities from trips + mock CITIES list
  const availableCities = useMemo(() => {
    const set = new Set(CITIES);
    trips.forEach((t) => { if (t.origin) set.add(t.origin); if (t.destination) set.add(t.destination); });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [trips]);

  const swap = () => {
    setOriginFilter(destFilter);
    setDestFilter(originFilter);
  };

  // Convert display date "DD/MM/YYYY" to ISO "YYYY-MM-DD"
  const toIso = (d) => {
    if (!d) return '';
    const parts = d.split('/');
    if (parts.length !== 3) return d;
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  };

  const filtered = useMemo(() => {
    let list = trips.filter((t) => t.status !== 'cancelada');
    if (filters.pet) list = list.filter((t) => t.petFriendly);
    if (filters.home) list = list.filter((t) => t.homePickup);
    if (dateFilter) list = list.filter((t) => toIso(t.date) === dateFilter);
    if (originFilter.trim()) {
      const q = originFilter.trim().toLowerCase();
      list = list.filter((t) => t.origin.toLowerCase().includes(q));
    }
    if (destFilter.trim()) {
      const q = destFilter.trim().toLowerCase();
      list = list.filter((t) => t.destination.toLowerCase().includes(q));
    }
    if (sort === 'price') list = [...list].sort((a, b) => a.price - b.price);
    else if (sort === 'rating') list = [...list].sort((a, b) => b.rating - a.rating);
    return list;
  }, [trips, filters, originFilter, destFilter, sort, dateFilter]);

  return (
    <div className="mobile-shell">
      <Header />
      <div className="striped-bar" />
      <div className="px-5 pt-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-extrabold text-[var(--bj-text)] leading-tight">Buscar viagens</h1>
            <p className="text-[var(--bj-text)] opacity-70 mt-1">Escolha o motorista que combina com você.</p>
          </div>
          {user?.role === 'motorista' && (
            <button
              onClick={() => navigate('/publicar')}
              className="btn-yellow shrink-0 flex items-center gap-1.5 px-4 py-2.5"
              title="Publicar viagem"
            >
              <Plus size={16} /> Publicar
            </button>
          )}
        </div>

        <div className="mt-5">
          <datalist id="cities-list">
            {availableCities.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <div className="input-icon-wrap">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-[var(--bj-navy)] z-10" />
            <input
              list="cities-list"
              className="round-input"
              style={{ paddingLeft: '38px' }}
              placeholder="Origem"
              value={originFilter}
              onChange={(e) => setOriginFilter(e.target.value)}
            />
            {originFilter && (
              <button
                type="button"
                onClick={() => setOriginFilter('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full hover:bg-[var(--bj-cream-2)] flex items-center justify-center"
                title="Limpar origem"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex justify-center -my-1 relative z-10">
            <button
              type="button"
              onClick={swap}
              className="w-9 h-9 rounded-full bg-white border border-[#ece3c7] hover:border-[var(--bj-navy)] flex items-center justify-center transition-colors shadow-sm rotate-90"
              title="Inverter"
            >
              <ArrowRightLeft size={16} className="text-[var(--bj-navy)]" />
            </button>
          </div>

          <div className="input-icon-wrap">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-[var(--bj-yellow)] z-10" />
            <input
              list="cities-list"
              className="round-input"
              style={{ paddingLeft: '38px' }}
              placeholder="Destino"
              value={destFilter}
              onChange={(e) => setDestFilter(e.target.value)}
            />
            {destFilter && (
              <button
                type="button"
                onClick={() => setDestFilter('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full hover:bg-[var(--bj-cream-2)] flex items-center justify-center"
                title="Limpar destino"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <div className="input-icon-wrap flex-1">
            <Calendar size={18} className="input-icon" />
            <input
              type="date"
              className="round-input pr-4"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              placeholder="Filtrar por data"
            />
          </div>
          {dateFilter && (
            <button
              onClick={() => setDateFilter('')}
              className="w-11 h-11 rounded-full bg-white border border-[#ece3c7] hover:border-[var(--bj-red)] hover:text-[var(--bj-red)] flex items-center justify-center transition-colors"
              title="Limpar data"
            >
              <X size={18} />
            </button>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <FilterChip active={filters.pet} onClick={() => setFilters({ ...filters, pet: !filters.pet })} icon={PawPrint}>Pet friendly</FilterChip>
          <FilterChip active={filters.home} onClick={() => setFilters({ ...filters, home: !filters.home })} icon={Home}>Busca em casa</FilterChip>
          <FilterChip active={filters.near} onClick={() => setFilters({ ...filters, near: !filters.near })} icon={MapPin}>Próximo a mim</FilterChip>
        </div>

        <div className="flex items-center justify-between mt-6 mb-3">
          <div className="text-[var(--bj-text)] opacity-80">{filtered.length} viagens encontradas</div>
          <div className="relative">
            <button onClick={() => setSortOpen((v) => !v)} className="font-bold text-[var(--bj-yellow-dark)] flex items-center gap-1">
              <ArrowUpDown size={16} /> Ordenar
            </button>
            {sortOpen && (
              <div className="absolute right-0 top-8 bg-white rounded-2xl shadow-lg border border-[#ece3c7] py-2 w-44 z-10">
                {[
                  { k: 'date', l: 'Data (padrão)' },
                  { k: 'price', l: 'Menor preço' },
                  { k: 'rating', l: 'Melhor avaliação' },
                ].map((o) => (
                  <button
                    key={o.k}
                    onClick={() => { setSort(o.k); setSortOpen(false); }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-[var(--bj-cream-2)] ${sort === o.k ? 'font-bold text-[var(--bj-navy)]' : 'text-[var(--bj-text)]'}`}
                  >
                    {o.l}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="pb-6">
          {filtered.map((t) => (
            <TripCard key={t.id} trip={t} onClick={() => setSelectedTrip(t)} />
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-16 text-[var(--bj-text)] opacity-70">
              Nenhuma viagem encontrada. Tente ajustar os filtros.
            </div>
          )}
        </div>
      </div>

      {selectedTrip && (
        <TripDetailDialog trip={selectedTrip} onClose={() => setSelectedTrip(null)} />
      )}

      <BottomNav />
    </div>
  );
};

export default SearchPage;
