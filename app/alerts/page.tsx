'use client';

import { getMockDashboardData } from '@/lib/mock-data';
import { AlertCard } from '@/components/alerts/AlertCard';
import { useLanguage } from '@/lib/LanguageContext';

export default function AlertsPage() {
  const { alerts } = getMockDashboardData();
  const { t } = useLanguage();

  return (
    <div className="space-y-5 pb-28 max-sm:space-y-4">
      <div className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-lg shadow-[var(--shadow)] backdrop-blur max-sm:rounded-2xl max-sm:p-5">
        <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-[#FFB300]/8 blur-[80px]" />
        <div className="relative">
          <p className="font-orbitron text-[10px] uppercase tracking-[0.3em] text-[#FFB300]">{t('alerts.title')}</p>
          <h1 className="mt-2 text-2xl font-semibold text-[var(--text-primary)] max-sm:text-xl">{t('alerts.heading')}</h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">{t('alerts.subtitle')}</p>
        </div>
      </div>
      <div className="grid gap-4">
        {alerts.length ? (
          alerts.map((alert) => <AlertCard key={alert.id} alert={alert} />)
        ) : (
          <div className="rounded-3xl border border-dashed border-[var(--border-subtle)] bg-[var(--bg-secondary)]/50 p-8 text-center max-sm:p-6">
            <p className="text-sm text-[var(--text-secondary)]">{t('alerts.empty')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
