'use client';

import { useEffect, useState } from 'react';
import { fetchAlerts } from '@/lib/types';
import type { Alert } from '@/lib/types';
import { AlertCard } from '@/components/alerts/AlertCard';
import { useLanguage } from '@/lib/LanguageContext';

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const { t } = useLanguage();

  useEffect(() => {
    fetchAlerts().then(setAlerts);
  }, []);

  return (
    <div className="space-y-5 pb-28 max-sm:space-y-4">
      <div className="gradient-header rounded-3xl p-6 shadow-lg shadow-[var(--shadow-heavy)] max-sm:rounded-2xl max-sm:p-5">
        <div className="gradient-header-text">
          <p className="font-orbitron text-[10px] uppercase tracking-[0.3em] text-white/60">{t('alerts.title')}</p>
          <h1 className="mt-2 text-2xl font-bold text-white max-sm:text-xl">{t('alerts.heading')}</h1>
          <p className="mt-2 text-sm text-white/70">{t('alerts.subtitle')}</p>
        </div>
      </div>
      <div className="grid gap-4">
        {alerts.length ? (
          alerts.map((alert) => <AlertCard key={alert.id} alert={alert} />)
        ) : (
          <div className="rounded-3xl border border-dashed border-[var(--border-subtle)] bg-white/50 p-8 text-center max-sm:p-6 backdrop-blur">
            <p className="text-sm text-[var(--text-secondary)]">{t('alerts.empty')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
