'use client';

import { useEffect, useMemo, useState } from 'react';
import { fetchBuses, fetchStops } from '@/lib/types';
import type { Bus, Route } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useLanguage } from '@/lib/LanguageContext';

export function SavedRoutesBoard() {
  const { t } = useLanguage();
  const [buses, setBuses] = useState<Bus[]>([]);
  const [savedRoutes, setSavedRoutes] = useState<string[]>([]);

  useEffect(() => {
    const stored = window.localStorage.getItem('tn-bustrack-saved-routes');
    if (stored) setSavedRoutes(JSON.parse(stored) as string[]);
    fetchStops().then(allStops => fetchBuses(allStops)).then(setBuses);
  }, []);

  const savedRouteOptions = useMemo(() => {
    const routesMap = new Map<string, { origin: string; destination: string; number: string; operator: string; busType: string }>();
    buses.forEach(b => {
      if (!routesMap.has(b.route.id)) {
        routesMap.set(b.route.id, {
          origin: b.route.origin,
          destination: b.route.destination,
          number: b.route.number,
          operator: b.route.operator,
          busType: b.route.busType,
        });
      }
    });
    const routeIds = new Set(savedRoutes);
    return Array.from(routesMap.entries())
      .filter(([id]) => routeIds.has(id))
      .map(([id, r]) => ({ id, ...r }));
  }, [buses, savedRoutes]);

  const removeRoute = (routeId: string) => {
    const next = savedRoutes.filter((id) => id !== routeId);
    setSavedRoutes(next);
    window.localStorage.setItem('tn-bustrack-saved-routes', JSON.stringify(next));
  };

  return (
    <div className="space-y-5 pb-28 max-sm:space-y-4">
      <div className="gradient-header rounded-3xl p-6 shadow-lg shadow-[var(--shadow-heavy)] max-sm:rounded-2xl max-sm:p-5">
        <div className="gradient-header-text">
          <p className="font-orbitron text-[10px] uppercase tracking-[0.3em] text-white/60">{t('favorites.title')}</p>
          <h1 className="mt-2 text-2xl font-bold text-white max-sm:text-xl">{t('favorites.heading')}</h1>
          <p className="mt-2 text-sm text-white/70">{t('favorites.subtitle')}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {savedRouteOptions.length ? (
          savedRouteOptions.map((route) => {
            const routeBus = buses.find((b) => b.route.id === route.id);
            return (
              <Card
                key={route.id}
                title={t('route.number', { number: route.number })}
                value={route.origin}
                description={`${route.origin} → ${route.destination} • ${route.operator} ${route.busType}`}
                glow="amber"
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
