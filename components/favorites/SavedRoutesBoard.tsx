'use client';

import { useEffect, useMemo, useState } from 'react';
import { getMockDashboardData } from '@/lib/mock-data';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useLanguage } from '@/lib/LanguageContext';

export function SavedRoutesBoard() {
  const { t } = useLanguage();
  const { routes, buses } = getMockDashboardData();
  const [savedRoutes, setSavedRoutes] = useState<string[]>([]);

  useEffect(() => {
    const stored = window.localStorage.getItem('tn-bustrack-saved-routes');
    if (stored) setSavedRoutes(JSON.parse(stored) as string[]);
  }, []);

  const saved = useMemo(() => routes.filter((route) => savedRoutes.includes(route.id)), [routes, savedRoutes]);

  const removeRoute = (routeId: string) => {
    const next = savedRoutes.filter((id) => id !== routeId);
    setSavedRoutes(next);
    window.localStorage.setItem('tn-bustrack-saved-routes', JSON.stringify(next));
  };

  return (
    <div className="space-y-5 pb-28 max-sm:space-y-4">
      <div className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-lg shadow-[var(--shadow)] backdrop-blur max-sm:rounded-2xl max-sm:p-5">
        <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-[#FFB300]/8 blur-[80px]" />
        <div className="relative">
          <p className="font-orbitron text-[10px] uppercase tracking-[0.3em] text-[#FFB300]">{t('favorites.title')}</p>
          <h1 className="mt-2 text-2xl font-semibold text-[var(--text-primary)] max-sm:text-xl">{t('favorites.heading')}</h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">{t('favorites.subtitle')}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {saved.length ? (
          saved.map((route) => {
            const routeBus = buses.find((bus) => bus.routeId === route.id);
            return (
              <Card
                key={route.id}
                title={t('route.number', { number: route.number })}
                value={route.origin}
                description={`${route.origin} → ${route.destination} • ${route.operator} ${route.busType}`}
                glow="gold"
              >
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Button href="/dashboard" size="sm">{t('favorites.openBuses')}</Button>
                  <Button variant="ghost" size="sm" onClick={() => removeRoute(route.id)}>
                    {t('favorites.remove')}
                  </Button>
                  {routeBus && (
                    <span className="text-xs text-[var(--text-secondary)]">
                      {t('favorites.liveBus')}: <span className="font-jetbrains text-[var(--text-primary)]">{routeBus.number}</span>
                    </span>
                  )}
                </div>
              </Card>
            );
          })
        ) : (
          <Card
            title={t('favorites.empty')}
            description={t('favorites.emptyDesc')}
          />
        )}
      </div>
    </div>
  );
}
