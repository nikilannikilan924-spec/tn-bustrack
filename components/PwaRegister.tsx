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
      <div className="gradient-header flex items-center gap-3 rounded-2xl px-4 py-3 shadow-2xl">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20 text-sm font-bold text-white shadow-lg backdrop-blur">
          TN
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">Install TN BusTrack</p>
          <p className="text-[11px] text-white/70">Add to home screen for quick access</p>
        </div>
        <button
          type="button"
          onClick={handleInstall}
          className="shrink-0 rounded-xl bg-white/20 px-4 py-2 text-xs font-semibold text-white backdrop-blur transition hover:bg-white/30"
        >
          Install
        </button>
        <button
          type="button"
          onClick={() => setInstallPrompt(null)}
          className="shrink-0 rounded-xl px-2 py-2 text-sm text-white/60 transition hover:text-white"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
