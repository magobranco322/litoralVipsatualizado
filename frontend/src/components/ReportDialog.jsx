import React, { useState } from 'react';
import { X, Flag, AlertTriangle } from 'lucide-react';
import api, { apiError } from '../lib/api';
import { useToast } from '../hooks/use-toast';

const SUGGESTED = [
  'Motorista não apareceu no local combinado',
  'Comportamento inadequado durante a viagem',
  'Veículo em condições inseguras',
  'Cobrança diferente do combinado',
  'Spam ou conteúdo ofensivo',
  'Outro motivo',
];

const ReportDialog = ({ open, onClose, type, targetId, targetName, title }) => {
  const [reason, setReason] = useState('');
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  if (!open) return null;

  const submit = async () => {
    if (!reason.trim()) {
      toast({ title: 'Descreva o motivo da denúncia', variant: 'destructive' });
      return;
    }
    setSending(true);
    try {
      await api.post('/reports', {
        type,
        target_id: targetId,
        target_name: targetName,
        reason: reason.trim(),
      });
      toast({ title: 'Denúncia enviada', description: 'Nossa equipe de moderação vai analisar.' });
      setReason('');
      onClose();
    } catch (e) {
      toast({ title: 'Erro ao denunciar', description: apiError(e), variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-[456px] bg-white rounded-t-3xl sm:rounded-3xl p-5 max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Flag size={20} className="text-[var(--bj-red)]" />
            <div className="font-extrabold text-lg text-[var(--bj-text)]">Denunciar</div>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full hover:bg-[var(--bj-cream-2)] flex items-center justify-center">
            <X size={20} />
          </button>
        </div>

        <div className="text-sm text-[var(--bj-text)] opacity-80 mb-3">
          {title || <>Você vai reportar <b>{targetName}</b> à moderação.</>}
        </div>

        <div className="p-3 rounded-xl bg-[#FEE2E2] flex gap-2 mb-4">
          <AlertTriangle size={16} className="text-[#991B1B] flex-shrink-0 mt-0.5" />
          <span className="text-xs text-[#991B1B]">Denúncias falsas podem levar ao bloqueio da sua conta. Descreva o ocorrido com clareza.</span>
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          {SUGGESTED.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setReason(s)}
              className={`chip py-2 px-3 text-[13px] ${reason === s ? 'active' : ''}`}
            >
              {s}
            </button>
          ))}
        </div>

        <textarea
          className="round-textarea"
          placeholder="Descreva o motivo com detalhes..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />

        <div className="grid grid-cols-2 gap-3 mt-4">
          <button onClick={onClose} className="chip justify-center py-3">Cancelar</button>
          <button
            onClick={submit}
            disabled={sending}
            className="btn-outline-danger justify-center py-3 disabled:opacity-60"
            style={{ background: '#E63946', color: '#fff', borderColor: '#E63946' }}
          >
            <Flag size={16} /> {sending ? 'Enviando...' : 'Enviar denúncia'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportDialog;
