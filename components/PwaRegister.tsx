'use client';

import { useEffect, useState } from 'react';

export default function PwaRegister() {
  const [installPrompt, setInstallPrompt] = useState<Event | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    const handleInstalled = () => {
      setInstallPrompt(null);
      setInstalled(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleInstalled);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    (installPrompt as any).prompt();
    const result = await (installPrompt as any).userChoice;
    if (result.outcome === 'accepted') setInstallPrompt(null);
  };

  if (installed || !installPrompt) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 z-50 mx-auto max-w-sm animate-slide-up md:bottom-6">
      <div className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-primary)]/95 px-4 py-3 shadow-2xl shadow-[var(--shadow-heavy)] backdrop-blur-xl">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E53935] text-sm font-bold text-white shadow-[0_0_16px_rgba(229,57,53,0.3)]">
          TN
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[var(--text-primary)]">Install TN BusTrack</p>
          <p className="text-[11px] text-[var(--text-secondary)]">Add to home screen for quick access</p>
        </div>
        <button
          type="button"
          onClick={handleInstall}
          className="shrink-0 rounded-xl bg-[#E53935] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#C62828]"
        >
          Install
        </button>
        <button
          type="button"
          onClick={() => setInstallPrompt(null)}
          className="shrink-0 rounded-xl px-2 py-2 text-sm text-[var(--text-muted)] transition hover:text-[var(--text-secondary)]"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
