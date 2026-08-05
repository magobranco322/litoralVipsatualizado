import React, { useState } from 'react';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';
import { Lock, MapPin, Calendar, Clock, Users, DollarSign, ChevronDown } from 'lucide-react';
import { useToast } from '../hooks/use-toast';

const RequestPage = () => {
  const [form, setForm] = useState({
    origin: '', destination: '', date: '', time: '', passengers: 1, price: 0, notes: '',
  });
  const { toast } = useToast();

  const set = (k, v) => setForm({ ...form, [k]: v });

  const submit = (e) => {
    e.preventDefault();
    if (!form.origin || !form.destination) {
      toast({ title: 'Preencha origem e destino', variant: 'destructive' });
      return;
    }
    if (Number(form.price) < 10) {
      toast({ title: 'Valor mínimo R$ 10,00', variant: 'destructive' });
      return;
    }
    const list = JSON.parse(localStorage.getItem('bj_requests') || '[]');
    list.unshift({ id: 'req_' + Date.now(), ...form, status: 'aberta', createdAt: new Date().toISOString() });
    localStorage.setItem('bj_requests', JSON.stringify(list));
    toast({ title: 'Solicitação enviada!', description: 'Motoristas disponíveis serão notificados.' });
    setForm({ origin: '', destination: '', date: '', time: '', passengers: 1, price: 0, notes: '' });
  };

  return (
    <div className="mobile-shell">
      <Header />
      <div className="striped-bar" />
      <form onSubmit={submit} className="px-5 pt-5">
        <h1 className="text-3xl font-extrabold text-[var(--bj-text)] leading-tight">Solicitar carro fechado</h1>
        <p className="text-[var(--bj-text)] opacity-70 mt-1">Viagem exclusiva — sem vagas compartilhadas.</p>

        <div className="mt-5 p-4 rounded-2xl border-2 border-dashed border-[var(--bj-yellow)] bg-[#FFF8E1] flex gap-3">
          <Lock size={22} className="text-[var(--bj-yellow-dark)] flex-shrink-0 mt-0.5" />
          <p className="text-sm text-[#8A6D0A] leading-relaxed">
            Ao solicitar carro fechado a viagem será exclusiva para você e sua família. O ato de cancelamento pode ser feito por qualquer uma das partes, porém de maneira antecipada em no mínimo 24 horas e com justificativa.
          </p>
        </div>

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
          <div className="grid grid-cols-2 gap-3">
            <div className="input-icon-wrap">
              <Users size={18} className="input-icon" />
              <input type="number" min="1" max="6" className="round-input" value={form.passengers} onChange={(e) => set('passengers', e.target.value)} />
            </div>
            <div className="input-icon-wrap">
              <DollarSign size={18} className="input-icon" />
              <input type="number" min="0" className="round-input" value={form.price} onChange={(e) => set('price', e.target.value)} />
            </div>
          </div>
          <div className="text-sm text-[var(--bj-text)] opacity-70 -mt-1">Valor mínimo: R$ 10,00.</div>
          <textarea
            className="round-textarea"
            placeholder="Observações (bagagem, parada, pet...)"
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
          />
        </div>

        <button type="submit" className="btn-primary w-full mt-5">Enviar solicitação</button>
      </form>
      <BottomNav />
    </div>
  );
};

export default RequestPage;
