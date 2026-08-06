import React from 'react';
import { X, Share, Plus, Download, MoreVertical } from 'lucide-react';

const IOSInstructions = ({ open, onClose }) => {
  if (!open) return null;
  const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent || '');
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-[456px] bg-white rounded-t-3xl sm:rounded-3xl p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Download size={20} className="text-[var(--bj-navy)]" />
            <div className="font-extrabold text-lg text-[var(--bj-text)]">Instalar na tela inicial</div>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full hover:bg-[var(--bj-cream-2)] flex items-center justify-center">
            <X size={20} />
          </button>
        </div>

        {isIOS ? (
          <div className="space-y-3 text-sm text-[var(--bj-text)]">
            <div className="text-[13px] opacity-80">No iPhone / iPad (Safari):</div>
            <div className="flex items-start gap-3">
              <span className="w-7 h-7 rounded-full bg-[var(--bj-navy)] text-white font-bold flex items-center justify-center flex-shrink-0">1</span>
              <div>Abra este site no <b>Safari</b>.</div>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-7 h-7 rounded-full bg-[var(--bj-navy)] text-white font-bold flex items-center justify-center flex-shrink-0">2</span>
              <div className="flex items-center gap-2 flex-wrap">
                Toque no botão de <b>Compartilhar</b>
                <Share size={16} className="text-[var(--bj-navy)]" />
                na barra inferior.
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-7 h-7 rounded-full bg-[var(--bj-navy)] text-white font-bold flex items-center justify-center flex-shrink-0">3</span>
              <div className="flex items-center gap-2 flex-wrap">
                Escolha <b>Adicionar à Tela de Início</b>
                <Plus size={16} className="text-[var(--bj-navy)]" />
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-7 h-7 rounded-full bg-[var(--bj-navy)] text-white font-bold flex items-center justify-center flex-shrink-0">4</span>
              <div>Confirme em <b>Adicionar</b> e pronto! O atalho aparece na sua tela como um app.</div>
            </div>
          </div>
        ) : (
          <div className="space-y-3 text-sm text-[var(--bj-text)]">
            <div className="text-[13px] opacity-80">No Android ou desktop (Chrome / Edge):</div>
            <div className="flex items-start gap-3">
              <span className="w-7 h-7 rounded-full bg-[var(--bj-navy)] text-white font-bold flex items-center justify-center flex-shrink-0">1</span>
              <div className="flex items-center gap-2 flex-wrap">
                Toque nos três pontinhos
                <MoreVertical size={16} className="text-[var(--bj-navy)]" />
                no canto do navegador.
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-7 h-7 rounded-full bg-[var(--bj-navy)] text-white font-bold flex items-center justify-center flex-shrink-0">2</span>
              <div>Escolha <b>Instalar app</b> ou <b>Adicionar à tela inicial</b>.</div>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-7 h-7 rounded-full bg-[var(--bj-navy)] text-white font-bold flex items-center justify-center flex-shrink-0">3</span>
              <div>Confirme e o atalho aparece na sua tela inicial como um app.</div>
            </div>
            <div className="mt-3 p-3 rounded-xl bg-[#FEF3C7] text-xs text-[#8A6D0A]">
              Dica: em alguns navegadores você pode ver um botão de instalar direto na barra de endereço.
            </div>
          </div>
        )}

        <button onClick={onClose} className="btn-primary w-full mt-5">Entendi</button>
      </div>
    </div>
  );
};

export default IOSInstructions;
