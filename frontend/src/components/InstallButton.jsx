import React, { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import IOSInstructions from './IOSInstructions';
import { useToast } from '../hooks/use-toast';

/**
 * 1-click PWA install button.
 * - Chrome / Edge / Android: uses `beforeinstallprompt` to install immediately.
 * - iOS Safari: opens IOSInstructions modal (browser blocks programmatic install).
 * - Hides itself when app already runs in standalone mode.
 */
const InstallButton = ({ className = '', compact = false }) => {
  const [deferred, setDeferred] = useState(null);
  const [installed, setInstalled] = useState(false);
  const [showIOS, setShowIOS] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Detect already-installed state
    const mq = window.matchMedia('(display-mode: standalone)');
    const isStandalone = mq.matches || window.navigator.standalone === true;
    setInstalled(isStandalone);

    const onBeforeInstall = (e) => {
      e.preventDefault();
      setDeferred(e);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
      toast({ title: 'App instalado!', description: 'O atalho já está na sua tela inicial.' });
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, [toast]);

  if (installed) return null;

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent || '') && !window.MSStream;

  const handleClick = async () => {
    if (deferred) {
      try {
        deferred.prompt();
        const choice = await deferred.userChoice;
        if (choice.outcome !== 'accepted') {
          toast({ title: 'Instalação cancelada', variant: 'destructive' });
        }
      } catch (err) {
        toast({ title: 'Não foi possível instalar', description: err.message, variant: 'destructive' });
      }
      setDeferred(null);
      return;
    }
    // No native prompt available yet — iOS or browser hasn't fired the event
    setShowIOS(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        aria-label="Instalar atalho na tela inicial"
        title="Instalar atalho"
        data-testid="install-pwa-btn"
        className={`inline-flex items-center gap-1.5 rounded-full font-bold transition-all ${
          compact ? 'px-3 py-2 text-xs' : 'px-4 py-2.5 text-sm'
        } ${className}`}
        style={{
          background: 'linear-gradient(135deg, #E8B800 0%, #F5C518 50%, #E8B800 100%)',
          color: '#0B2A5B',
          border: '1.5px solid #B48200',
          boxShadow: '0 2px 8px rgba(180, 130, 0, 0.25)',
        }}
      >
        <Download size={compact ? 14 : 16} strokeWidth={2.5} />
        <span>Instalar app</span>
      </button>
      <IOSInstructions open={showIOS} onClose={() => setShowIOS(false)} />
    </>
  );
};

export default InstallButton;
