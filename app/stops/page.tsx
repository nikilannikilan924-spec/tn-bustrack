'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { subscribeBusLocationUpdate } from '@/lib/socket';
import { fetchBuses, fetchStops, normalizeAPIBus } from '@/lib/types';
import type { Bus, Stop } from '@/lib/types';
import { useLanguage } from '@/lib/LanguageContext';
import { BusStopCard } from '@/components/stops/BusStopCard';
import { RouteCompareCard } from '@/components/report/RouteCompareCard';

export default function StopsPage() {
  const { t } = useLanguage();
  const [buses, setBuses] = useState<Bus[]>([]);
  const [stops, setStops] = useState<Stop[]>([]);
  const [search, setSearch] = useState('');
  const [selectedStop, setSelectedStop] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    fetchStops().then(async allStops => {
      setStops(allStops);
      const apiBuses = await fetchBuses(allStops);
      setBuses(apiBuses);
    });
  }, []);

  useEffect(() => {
    if (stops.length === 0) return;
    const unsubscribe = subscribeBusLocationUpdate((payload: any) => {
      const raw = Array.isArray(payload) ? payload : [payload];
      const live = raw.map(b => normalizeAPIBus(b, stops));
      setBuses(live);
    });
    return unsubscribe;
  }, [stops]);

  const allStopNames = useMemo(() => {
    const names = new Set(stops.map((s) => s.name));
    return Array.from(names).sort();
  }, [stops]);

  const suggestions = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return allStopNames.filter((name) => name.toLowerCase().includes(q));
  }, [search, allStopNames]);

  const stopRoutes = useMemo(() => {
    if (!selectedStop) return [];
    const servingBuses = buses.filter((b) =>
      b.route.stops.some((s) => s.name === selectedStop)
    );

    return servingBuses
      .map((bus) => {
        const stop = bus.route.stops.find((s) => s.name === selectedStop)!;
        const currentIdx = bus.route.stops.findIndex((s) => s.name === bus.currentStop);
        const passed = stop.sequence <= currentIdx;
        const atStop = stop.name === bus.currentStop;
        return { bus, stop, passed, atStop };
      })
      .sort((a, b) => {
        if (a.passed && !b.passed) return 1;
        if (!a.passed && b.passed) return -1;
        if (a.atStop) return -1;
        if (b.atStop) return 1;
        return 0;
      });
  }, [selectedStop, buses]);

  const handleSelectStop = useCallback((name: string) => {
    setSearch(name);
    setSelectedStop(name);
    setFocused(false);
  }, []);

  return (
    <div className="space-y-5 pb-28 max-sm:space-y-4">
      <div className="gradient-header rounded-3xl p-6 shadow-lg shadow-[var(--shadow-heavy)] max-sm:rounded-2xl max-sm:p-5">
        <div className="gradient-header-text">
          <p className="font-orbitron text-[10px] uppercase tracking-[0.3em] text-white/60">{t('nav.stops')}</p>
          <h1 className="mt-2 text-2xl font-bold text-white max-sm:text-xl">{t('stops.title')}</h1>
          <p className="mt-2 text-sm text-white/70">{t('stops.subtitle')}</p>
        </div>
      </div>

      <div className="relative">
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setSelectedStop(null); }}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 200)}
            placeholder={t('stops.search')}
            className="glass w-full rounded-2xl border border-[var(--border)] px-5 py-4 pl-12 text-sm text-[var(--text-primary)] shadow-lg shadow-[var(--shadow-heavy)] placeholder:text-[var(--text-muted)] focus:border-[#0097A7]/40 focus:outline-none focus:ring-2 focus:ring-[#0097A7]/20"
          />
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-base">🔍</span>
        </div>

        {focused && suggestions.length > 0 && (
          <div className="absolute z-20 mt-2 w-full rounded-2xl border border-[var(--border)] bg-white/90 p-2 shadow-2xl shadow-[var(--shadow-heavy)] backdrop-blur-xl">
            {suggestions.slice(0, 12).map((name) => {
              const routeCount = buses.filter((b) =>
                b.route.stops.some((s) => s.name === name)
              ).length;
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => handleSelectStop(name)}
                  className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm text-[var(--text-primary)] transition hover:bg-[var(--overlay-hover)]"
                >
                  <span className="font-medium">{name}</span>
                  <span className="font-jetbrains text-[10px] text-[var(--text-muted)]">
                    {routeCount} {routeCount === 1 ? t('buses.liveBuses').replace('s', '') : t('buses.liveBuses').toLowerCase()}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selectedStop && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#0097A7]/15 text-sm">📍</span>
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">{selectedStop}</h2>
              <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-[0.2em]">
                {stopRoutes.length} {stopRoutes.length === 1 ? t('buses.liveBuses').replace('s', '') : t('buses.liveBuses').toLowerCase()} • {t('stops.sortedByArrival')}
              </p>
            </div>
          </div>

          {stopRoutes.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[var(--border-subtle)] bg-white/50 p-8 text-center max-sm:p-6 backdrop-blur">
              <p className="text-sm text-[var(--text-secondary)]">{t('map.noBuses')}</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {stopRoutes.map(({ bus }) => (
                <BusStopCard key={bus.id} bus={bus} selectedStop={selectedStop} />
              ))}
            </div>
          )}
        </div>
      )}

      {!selectedStop && !focused && (
        <div className="rounded-3xl border border-dashed border-[var(--border-subtle)] bg-white/50 p-8 text-center max-sm:p-6 backdrop-blur">
          <p className="text-sm text-[var(--text-secondary)]">{t('stops.hint')}</p>
        </div>
      )}

      <RouteCompareCard buses={buses} allStopNames={allStopNames} />
    </div>
  );
}
