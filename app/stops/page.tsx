'use client';

import { useState, useMemo, useEffect } from 'react';
import { getMockDashboardData, type Bus } from '@/lib/mock-data';
import { subscribeBusLocationUpdate } from '@/lib/socket';
import { useLanguage } from '@/lib/LanguageContext';
import { useRouter } from 'next/navigation';
import { haversineKm, formatKm } from '@/lib/distance';

function estimateEtaToStop(bus: Bus, stopSequence: number): number | null {
  const currentIdx = bus.route.stops.findIndex((s) => s.name === bus.currentStop);
  if (currentIdx === -1) return null;
  if (stopSequence <= currentIdx) return null;

  const stop = bus.route.stops[stopSequence - 1];
  const dist = haversineKm(bus.latitude, bus.longitude, stop.lat, stop.lng);

  if (bus.speed > 5) {
    return Math.round((dist / bus.speed) * 60);
  }

  let totalRemainingDist = 0;
  for (let i = currentIdx + 1; i < bus.route.stops.length; i++) {
    const prev = i === currentIdx + 1
      ? { lat: bus.latitude, lng: bus.longitude }
      : bus.route.stops[i - 1];
    totalRemainingDist += haversineKm(prev.lat, prev.lng, bus.route.stops[i].lat, bus.route.stops[i].lng);
  }

  if (totalRemainingDist === 0) return null;
  return Math.round((dist / totalRemainingDist) * bus.etaMinutes);
}

export default function StopsPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const { buses: seedBuses, stops: seedStops } = useMemo(() => getMockDashboardData(), []);
  const [buses, setBuses] = useState<Bus[]>(seedBuses);
  const [search, setSearch] = useState('');
  const [selectedStop, setSelectedStop] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeBusLocationUpdate((payload: Bus[] | { buses: Bus[] }) => {
      const liveBuses = Array.isArray(payload) ? payload : payload.buses;
      if (Array.isArray(liveBuses)) setBuses(liveBuses);
    });
    return unsubscribe;
  }, []);

  const allStopNames = useMemo(() => {
    const names = new Set(seedStops.map((s) => s.name));
    return Array.from(names).sort();
  }, [seedStops]);

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
        const eta = estimateEtaToStop(bus, stop.sequence);
        const currentIdx = bus.route.stops.findIndex((s) => s.name === bus.currentStop);
        const passed = stop.sequence <= currentIdx;
        const atStop = stop.name === bus.currentStop;
        return { bus, stop, eta, passed, atStop };
      })
      .sort((a, b) => {
        if (a.passed && !b.passed) return 1;
        if (!a.passed && b.passed) return -1;
        if (a.atStop) return -1;
        if (b.atStop) return 1;
        if (a.eta !== null && b.eta !== null) return a.eta - b.eta;
        if (a.eta === null) return 1;
        if (b.eta === null) return -1;
        return 0;
      });
  }, [selectedStop, buses]);

  return (
    <div className="space-y-5 pb-28 max-sm:space-y-4">
      <div className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-lg shadow-[var(--shadow)] backdrop-blur max-sm:rounded-2xl max-sm:p-5">
        <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-[#0097A7]/8 blur-[80px]" />
        <div className="relative">
          <p className="font-orbitron text-[10px] uppercase tracking-[0.3em] text-[#0097A7]">{t('nav.stops')}</p>
          <h1 className="mt-2 text-2xl font-semibold text-[var(--text-primary)] max-sm:text-xl">{t('stops.title')}</h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">{t('stops.subtitle')}</p>
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
            className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] px-5 py-4 pl-12 text-sm text-[var(--text-primary)] shadow-lg shadow-[var(--shadow)] backdrop-blur placeholder:text-[var(--text-muted)] focus:border-[#0097A7]/40 focus:outline-none focus:ring-2 focus:ring-[#0097A7]/20"
          />
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-base">🔍</span>
        </div>

        {focused && suggestions.length > 0 && (
          <div className="absolute z-20 mt-2 w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-primary)] p-2 shadow-2xl shadow-[var(--shadow-heavy)]">
            {suggestions.slice(0, 12).map((name) => {
              const routeCount = buses.filter((b) =>
                b.route.stops.some((s) => s.name === name)
              ).length;
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => { setSearch(name); setSelectedStop(name); setFocused(false); }}
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
            <div className="rounded-3xl border border-dashed border-[var(--border-subtle)] bg-[var(--bg-secondary)]/50 p-8 text-center max-sm:p-6">
              <p className="text-sm text-[var(--text-secondary)]">{t('map.noBuses')}</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {stopRoutes.map(({ bus, stop, eta, passed, atStop }) => {
                const crowdedPct = Math.round((bus.passengersInside / bus.seatCapacity) * 100);
                const currentIdx = bus.route.stops.findIndex((s) => s.name === bus.currentStop);
                const nextStopName = currentIdx + 1 < bus.route.stops.length
                  ? bus.route.stops[currentIdx + 1].name
                  : null;

                return (
                  <button
                    key={bus.id}
                    type="button"
                    onClick={() => router.push(`/bus/${bus.id}`)}
                    className="w-full rounded-3xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5 text-left shadow-lg shadow-[var(--shadow)] backdrop-blur transition hover:border-[#0097A7]/30 hover:shadow-xl"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-orbitron text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
                            {t('route.number', { number: bus.route.number })}
                          </span>
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            bus.status === 'running' ? 'bg-[#00C853]/15 text-[#00C853]' :
                            bus.status === 'delayed' ? 'bg-[#FFB300]/15 text-[#FFB300]' :
                            'bg-[var(--overlay-medium)] text-[var(--text-muted)]'
                          }`}>
                            <span className={`inline-block h-1.5 w-1.5 rounded-full ${
                              bus.status === 'running' ? 'bg-[#00C853]' :
                              bus.status === 'delayed' ? 'bg-[#FFB300]' :
                              'bg-[var(--text-muted)]'
                            }`} />
                            {bus.status}
                          </span>
                        </div>
                        <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">
                          {bus.route.origin} → {bus.route.destination}
                        </p>
                        <p className="text-[11px] text-[var(--text-secondary)]">
                          {bus.busType} • {bus.number}
                        </p>
                      </div>

                      <div className="shrink-0 text-right">
                        {passed ? (
                          <span className="inline-flex rounded-xl bg-[var(--overlay-medium)] px-3 py-1.5 font-jetbrains text-[11px] text-[var(--text-muted)]">
                            {t('stops.passed')}
                          </span>
                        ) : atStop ? (
                          <div>
                            <span className="inline-flex rounded-xl bg-[#0097A7]/15 px-3 py-1.5 font-jetbrains text-[11px] font-semibold text-[#0097A7]">
                              {t('stops.atStop')}
                            </span>
                            <p className="mt-1 text-[10px] text-[var(--text-muted)]">
                              {bus.seatsAvailable > 0
                                ? t('map.seatsLeft', { n: String(bus.seatsAvailable) })
                                : t('map.full')}
                            </p>
                          </div>
                        ) : eta !== null ? (
                          <div>
                            <span className="inline-flex rounded-xl bg-[#0097A7]/15 px-3 py-1.5 font-jetbrains text-[11px] font-semibold text-[#0097A7]">
                              {eta < 1 ? '<1' : eta} min
                            </span>
                            <p className="mt-1 text-[10px] text-[var(--text-muted)]">
                              {formatKm(haversineKm(bus.latitude, bus.longitude, stop.lat, stop.lng))}
                            </p>
                          </div>
                        ) : (
                          <span className="font-jetbrains text-[11px] text-[var(--text-muted)]">—</span>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--border)]">
                        <div
                          className={`h-full rounded-full transition-all ${
                            crowdedPct > 70 ? 'bg-[#E53935]' : crowdedPct > 40 ? 'bg-[#FFB300]' : 'bg-[#00BCD4]'
                          }`}
                          style={{ width: `${crowdedPct}%` }}
                        />
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-[var(--text-muted)]">
                        <span>🚶 {bus.currentStop}</span>
                        {nextStopName && <span>→ {nextStopName}</span>}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {!selectedStop && !focused && (
        <div className="rounded-3xl border border-dashed border-[var(--border-subtle)] bg-[var(--bg-secondary)]/50 p-8 text-center max-sm:p-6">
          <p className="text-sm text-[var(--text-secondary)]">{t('stops.hint')}</p>
        </div>
      )}
    </div>
  );
}
