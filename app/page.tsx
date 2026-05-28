'use client';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useLanguage } from '@/lib/LanguageContext';

export default function HomePage() {
  const { t } = useLanguage();

  return (
    <div className="space-y-6 max-sm:space-y-4 pt-4 max-sm:pt-2">
      <section className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-lg shadow-[var(--shadow)] backdrop-blur max-sm:rounded-2xl max-sm:p-5 sm:p-12">
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[#E53935]/10 blur-[100px] max-sm:hidden" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-60 w-60 rounded-full bg-[#00BCD4]/10 blur-[80px] max-sm:hidden" />
        <div className="relative">
          <div className="flex items-center gap-3">
            <span className="live-dot" />
            <p className="font-orbitron text-[10px] uppercase tracking-[0.4em] text-[#E53935]">{t('app.name')}</p>
          </div>
          <h1 className="mt-3 max-w-2xl text-3xl font-bold leading-tight text-[var(--text-primary)] max-sm:text-2xl sm:text-5xl">
            {t('home.title')}
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-[var(--text-secondary)]">
            {t('home.subtitle')}
          </p>
          <p className="mt-2 font-tamil text-sm text-[var(--text-muted)]">{t('home.tamilSubtitle')}</p>
          <div className="mt-6 flex flex-wrap gap-3 max-sm:mt-4">
            <Button href="/dashboard">{t('home.openBuses')}</Button>
            <Button variant="outline" href="/map">{t('home.liveMap')}</Button>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card
          title={t('card.realtime')}
          value={t('card.liveGps')}
          description={t('card.realtimeDesc')}
          glow="red"
        />
        <Card
          title={t('card.favorites')}
          value={t('card.savedRoutes')}
          description={t('card.favoritesDesc')}
          glow="gold"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card
          title={t('card.systemStatus')}
          value={t('card.liveReady')}
          description={t('card.systemStatusDesc')}
          glow="teal"
        />
        <Card
          title={t('card.quickActions')}
          value="Map / Saved / Alerts"
          description={t('card.quickActionsDesc')}
        />
      </div>
    </div>
  );
}
