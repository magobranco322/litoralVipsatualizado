import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';
import { useAuth } from '../context/AuthContext';
import { useTrips } from '../context/TripsContext';
import { useToast } from '../hooks/use-toast';
import { MapPin, Calendar, Clock, Users, DollarSign, ChevronDown, PawPrint, Home, Car, ArrowLeft } from 'lucide-react';

const PublishTripPage = () => {
  const { user } = useAuth();
  const { publishTrip } = useTrips();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [form, setForm] = useState({
    origin: '', destination: '', date: '', time: '', arrivalTime: '',
    seatsTotal: 4, price: 50, petFriendly: false, homePickup: false,
  });

  const set = (k, v) => setForm({ ...form, [k]: v });

  if (user?.role !== 'motorista') {
    return (
      <div className="mobile-shell">
        <Header />
        <div className="striped-bar" />
        <div className="px-6 py-16 text-center">
          <Car size={40} className="mx-auto text-[var(--bj-navy)] opacity-40" />
          <h2 className="text-xl font-bold text-[var(--bj-text)] mt-4">Somente motoristas</h2>
          <p className="text-[var(--bj-text)] opacity-70 mt-1">Cadastre-se como motorista para publicar viagens.</p>
          <button onClick={() => navigate('/buscar')} className="btn-primary mt-6">Voltar</button>
        </div>
        <BottomNav />
      </div>
    );
  }

  const submit = (e) => {
    e.preventDefault();
    if (!form.origin || !form.destination) {
      toast({ title: 'Preencha origem e destino', variant: 'destructive' });
      return;
    }
    if (!form.date || !form.time) {
      toast({ title: 'Selecione data e hora', variant: 'destructive' });
      return;
    }
    if (Number(form.price) < 10) {
      toast({ title: 'Valor mínimo R$ 10,00', variant: 'destructive' });
      return;
    }

    const [y, m, d] = form.date.split('-');
    const displayDate = `${d}/${m}/${y}`;
    publishTrip(user, { ...form, date: displayDate });
    toast({ title: 'Viagem publicada!', description: 'Passageiros já podem reservar.' });
    navigate('/painel');
  };

  return (
    <div className="mobile-shell">
      <Header />
      <div className="striped-bar" />
      <form onSubmit={submit} className="px-5 pt-5">
        <button type="button" onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm font-semibold text-[var(--bj-text)] opacity-70 hover:opacity-100">
          <ArrowLeft size={16} /> Voltar
        </button>
        <h1 className="text-3xl font-extrabold text-[var(--bj-text)] leading-tight mt-2">Publicar viagem</h1>
        <p className="text-[var(--bj-text)] opacity-70 mt-1">Divida os custos e leve passageiros com você.</p>

        <div className="mt-5 space-y-3">
          <div className="input-icon-wrap">
            <MapPin size={18} className="input-icon" />
            <input className="round-input" placeholder="Origem" value={form.origin} onChange={(e) => set('origin', e.target.value)} />
          </div>
          <div className="input-icon-wrap">
            <MapPin size={18} className="input-icon" />
            <input className="round-input" placeholder="Destino" value={form.destination} onChange={(e) => set('destination', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="input-icon-wrap">
              <Calendar size={18} className="input-icon" />
              <input type="date" className="round-input pr-10" value={form.date} onChange={(e) => set('date', e.target.value)} />
              <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6b6a5c] pointer-events-none" />
            </div>
            <div className="input-icon-wrap">
              <Clock size={18} className="input-icon" />
              <input type="time" className="round-input pr-10" value={form.time} onChange={(e) => set('time', e.target.value)} />
              <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6b6a5c] pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-[var(--bj-text)] opacity-70 pl-2">Hora de chegada estimada (opcional)</label>
            <div className="input-icon-wrap mt-1">
              <Clock size={18} className="input-icon" />
              <input type="time" className="round-input pr-10" value={form.arrivalTime} onChange={(e) => set('arrivalTime', e.target.value)} data-testid="publish-arrival-time" />
              <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6b6a5c] pointer-events-none" />
            </div>
            <div className="text-[11px] text-[var(--bj-text)] opacity-60 pl-2 mt-1">Usado para mostrar a duração da viagem para os passageiros.</div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="input-icon-wrap">
              <Users size={18} className="input-icon" />
              <input type="number" min="1" max="6" className="round-input" placeholder="Vagas" value={form.seatsTotal} onChange={(e) => set('seatsTotal', e.target.value)} />
            </div>
            <div className="input-icon-wrap">
              <DollarSign size={18} className="input-icon" />
              <input type="number" min="10" className="round-input" placeholder="Preço por vaga" value={form.price} onChange={(e) => set('price', e.target.value)} />
            </div>
          </div>
          <div className="text-sm text-[var(--bj-text)] opacity-70 -mt-1">Valor mínimo: R$ 10,00.</div>

          <div className="flex flex-wrap gap-2 pt-1">
            <button type="button" onClick={() => set('petFriendly', !form.petFriendly)} className={`chip ${form.petFriendly ? 'active' : ''}`}>
              <PawPrint size={16} /> Pet friendly
            </button>
            <button type="button" onClick={() => set('homePickup', !form.homePickup)} className={`chip ${form.homePickup ? 'active' : ''}`}>
              <Home size={16} /> Busca em casa
            </button>
          </div>
        </div>

        <button type="submit" className="btn-primary w-full mt-6">Publicar viagem</button>
      </form>
      <BottomNav />
    </div>
  );
};

export default PublishTripPage;
