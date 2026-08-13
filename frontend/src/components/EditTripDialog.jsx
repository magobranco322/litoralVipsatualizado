import React, { useState } from 'react';
import { X, Trash2, AlertTriangle, Minus, Plus } from 'lucide-react';
import { useTrips } from '../context/TripsContext';
import { useToast } from '../hooks/use-toast';

const EditTripDialog = ({ trip, onClose }) => {
  const { updateTrip, cancelTrip } = useTrips();
  const { toast } = useToast();
  const [form, setForm] = useState({
    date: trip.date,
    time: trip.time,
    arrivalTime: trip.arrivalTime || '',
    price: trip.price,
    seatsTotal: trip.seatsTotal,
  });
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm({ ...form, [k]: v });

  const decSeats = () => {
    const next = Math.max(1, Number(form.seatsTotal) - 1);
    if (next < (trip.seatsFilled || 0)) {
      toast({ title: `Já existem ${trip.seatsFilled} reservas`, description: 'Não é possível reduzir abaixo desse número.', variant: 'destructive' });
      return;
    }
    set('seatsTotal', next);
  };
  const incSeats = () => set('seatsTotal', Math.min(8, Number(form.seatsTotal) + 1));

  const save = async () => {
    if (Number(form.price) < 10) {
      toast({ title: 'Valor mínimo R$ 10,00', variant: 'destructive' });
      return;
    }
    if (Number(form.seatsTotal) < 1 || Number(form.seatsTotal) > 8) {
      toast({ title: 'Vagas devem estar entre 1 e 8', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const res = await updateTrip(trip.id, {
      date: form.date,
      time: form.time,
      arrivalTime: form.arrivalTime,
      price: Number(form.price),
      seatsTotal: Number(form.seatsTotal),
    });
    setSaving(false);
    if (!res.ok) {
      toast({ title: 'Erro ao atualizar', description: res.message, variant: 'destructive' });
      return;
    }
    toast({
      title: 'Viagem atualizada!',
      description: res.notified > 0 ? `${res.notified} passageiro(s) notificado(s).` : 'Sem passageiros para avisar.',
    });
    onClose();
  };

  const doCancel = async () => {
    setSaving(true);
    const res = await cancelTrip(trip.id, reason.trim() || null);
    setSaving(false);
    toast({
      title: 'Viagem cancelada',
      description: res.notified > 0 ? `${res.notified} passageiro(s) foram avisados.` : 'Sem reservas para avisar.',
      variant: 'destructive',
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-[456px] bg-white rounded-t-3xl sm:rounded-3xl p-5 max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <div className="font-extrabold text-lg text-[var(--bj-text)]">Editar viagem</div>
          <button onClick={onClose} className="w-9 h-9 rounded-full hover:bg-[var(--bj-cream-2)] flex items-center justify-center">
            <X size={20} />
          </button>
        </div>

        <div className="text-sm text-[var(--bj-text)] opacity-80 mb-4">
          <span className="font-semibold">{trip.origin}</span> → <span className="font-semibold">{trip.destination}</span>
        </div>

        {!confirmCancel ? (
          <>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-[var(--bj-text)] opacity-70 pl-2">Data</label>
                <input
                  className="round-input mt-1"
                  style={{ paddingLeft: '18px' }}
                  placeholder="DD/MM/AAAA"
                  value={form.date}
                  onChange={(e) => set('date', e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--bj-text)] opacity-70 pl-2">Hora</label>
                <input
                  type="time"
                  className="round-input mt-1"
                  style={{ paddingLeft: '18px' }}
                  value={form.time}
                  onChange={(e) => set('time', e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--bj-text)] opacity-70 pl-2">Hora de chegada (opcional)</label>
                <input
                  type="time"
                  className="round-input mt-1"
                  style={{ paddingLeft: '18px' }}
                  value={form.arrivalTime}
                  onChange={(e) => set('arrivalTime', e.target.value)}
                  data-testid="edit-trip-arrival"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--bj-text)] opacity-70 pl-2">Preço por vaga (R$)</label>
                <input
                  type="number"
                  min="10"
                  className="round-input mt-1"
                  style={{ paddingLeft: '18px' }}
                  value={form.price}
                  onChange={(e) => set('price', e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--bj-text)] opacity-70 pl-2">Número de vagas</label>
                <div className="mt-1 flex items-center gap-3 round-input" style={{ paddingLeft: '10px', paddingRight: '10px' }} data-testid="edit-trip-seats-row">
                  <button
                    type="button"
                    onClick={decSeats}
                    className="w-8 h-8 rounded-full bg-[var(--bj-cream-2)] flex items-center justify-center hover:bg-[var(--bj-yellow)] transition-colors"
                    data-testid="edit-trip-seats-dec"
                  >
                    <Minus size={16} />
                  </button>
                  <div className="flex-1 text-center font-extrabold text-[var(--bj-text)]" data-testid="edit-trip-seats-value">
                    {form.seatsTotal} {Number(form.seatsTotal) === 1 ? 'vaga' : 'vagas'}
                  </div>
                  <button
                    type="button"
                    onClick={incSeats}
                    className="w-8 h-8 rounded-full bg-[var(--bj-cream-2)] flex items-center justify-center hover:bg-[var(--bj-yellow)] transition-colors"
                    data-testid="edit-trip-seats-inc"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                {trip.seatsFilled > 0 && (
                  <div className="text-[11px] text-[var(--bj-text)] opacity-60 pl-2 mt-1">
                    {trip.seatsFilled} vaga(s) já reservada(s). Mínimo permitido: {trip.seatsFilled}.
                  </div>
                )}
              </div>
            </div>

            <div className="mt-3 p-3 rounded-xl bg-[#FEF3C7] flex gap-2">
              <AlertTriangle size={16} className="text-[#8A6D0A] flex-shrink-0 mt-0.5" />
              <span className="text-xs text-[#8A6D0A]">Passageiros com reserva ativa serão notificados das alterações.</span>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <button onClick={() => setConfirmCancel(true)} className="btn-outline-danger justify-center py-3" data-testid="edit-trip-cancel-open">
                <Trash2 size={16} /> Cancelar viagem
              </button>
              <button onClick={save} disabled={saving} className="btn-primary disabled:opacity-60" data-testid="edit-trip-save">
                {saving ? 'Salvando...' : 'Salvar alterações'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="p-4 rounded-xl bg-[#FEE2E2] flex gap-2">
              <AlertTriangle size={18} className="text-[#991B1B] flex-shrink-0 mt-0.5" />
              <span className="text-sm text-[#991B1B]">Esta ação cancela a viagem e libera todas as vagas reservadas. Os passageiros serão avisados.</span>
            </div>
            <textarea
              className="round-textarea mt-3"
              placeholder="Motivo do cancelamento (opcional)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-3 mt-4">
              <button onClick={() => setConfirmCancel(false)} className="chip justify-center py-3">Voltar</button>
              <button onClick={doCancel} className="btn-outline-danger justify-center py-3" style={{ background: '#E63946', color: '#fff', borderColor: '#E63946' }}>
                Confirmar cancelamento
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default EditTripDialog;
