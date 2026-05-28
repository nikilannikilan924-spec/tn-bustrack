'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';
import { getMockDashboardData, type Bus } from '@/lib/mock-data';
import { subscribeBusLocationUpdate } from '@/lib/socket';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useLanguage } from '@/lib/LanguageContext';
import { haversineKm, formatKm } from '@/lib/distance';

const LiveMap = dynamic(() => import('@/components/map/LiveMap'), { ssr: false });

export function MapBoard() {
  const { t } = useLanguage();
  const { buses: seedBuses, routes } = getMockDashboardData();
  const [buses, setBuses] = useState<Bus[]>(seedBuses);
  const [selectedBusId, setSelectedBusId] = useState<string | null>(null);
  const [stopSearch, setStopSearch] = useState('');

  useEffect(() => {
    const unsubscribe = subscribeBusLocationUpdate((payload: Bus[] | { buses: Bus[] }) => {
      const liveBuses = Array.isArray(payload) ? payload : payload.buses;
      if (Array.isArray(liveBuses)) {
        setBuses(liveBuses);
      }
    });

    return unsubscribe;
  }, []);

  const allStopNames = useMemo(() => {
    const names = new Set<string>();
    buses.forEach((b) => b.route.stops.forEach((s) => names.add(s.name)));
    return Array.from(names).sort();
  }, [buses]);

  const filteredBuses = useMemo(() => {
    const q = stopSearch.trim().toLowerCase();
    if (!q) return buses;
    return buses.filter((b) =>
      b.route.stops.some((s) => s.name.toLowerCase().includes(q))
    );
  }, [buses, stopSearch]);

  const running = filteredBuses.filter((bus) => bus.status === 'running').length;

  const findBackupBus = (bus: Bus): Bus | null => {
    if (bus.seatsAvailable > 0) return null;
    return filteredBuses.find((b) => b.routeId === bus.routeId && b.id !== bus.id && b.seatsAvailable > 0) ?? null;
  };

  return (
    <div className="space-y-5 pb-28 max-sm:space-y-4">
      <div className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-lg shadow-[var(--shadow)] backdrop-blur max-sm:rounded-2xl max-sm:p-5">
        <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-[#00BCD4]/8 blur-[80px]" />
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="relative">
            <p className="font-orbitron text-[10px] uppercase tracking-[0.3em] text-[#00BCD4]">{t('map.view')}</p>
            <h1 className="mt-2 text-2xl font-semibold text-[var(--text-primary)] max-sm:text-xl">{t('map.title')}</h1>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">{t('map.subtitle')}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Card title={t('map.vehicles')} value={String(filteredBuses.length)} compact glow="teal" />
            <Card title={t('map.running')} value={String(running)} compact glow="red" />
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.45fr_0.55fr] lg:gap-6">
        <LiveMap buses={filteredBuses} routes={routes} onBusSelect={setSelectedBusId} />
        <aside className="space-y-4">
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5 shadow-lg shadow-[var(--shadow)] backdrop-blur max-sm:rounded-2xl max-sm:p-4">
            <Input
              placeholder={t('map.searchStop')}
              value={stopSearch}
              onChange={(e) => {
                setStopSearch(e.target.value);
                setSelectedBusId(null);
              }}
              list="stop-suggestions"
            />
            <datalist id="stop-suggestions">
              {allStopNames.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
            <p className="mt-2 text-[10px] text-[var(--text-muted)]">
              {stopSearch.trim()
                ? `${filteredBuses.length} bus${filteredBuses.length !== 1 ? 'es' : ''} found`
                : t('map.typeStop')}
            </p>
          </div>

          <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5 shadow-lg shadow-[var(--shadow)] backdrop-blur max-sm:rounded-2xl max-sm:p-4">
            <p className="font-orbitron text-[10px] font-medium uppercase tracking-[0.25em] text-[var(--text-secondary)]">
              {t('map.legend')}
            </p>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex items-center gap-3 rounded-xl bg-black/[0.03] px-3 py-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#E53935] shadow-[0_0_8px_rgba(229,57,53,0.5)]" />
                <span className="text-[var(--text-secondary)]">{t('map.legend.running')}</span>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-black/[0.03] px-3 py-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#FFB300] shadow-[0_0_8px_rgba(255,179,0,0.4)]" />
                <span className="text-[var(--text-secondary)]">{t('map.legend.delayed')}</span>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-black/[0.03] px-3 py-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[var(--text-muted)]" />
                <span className="text-[var(--text-secondary)]">{t('map.legend.stopped')}</span>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5 shadow-lg shadow-[var(--shadow)] backdrop-blur max-sm:rounded-2xl max-sm:p-4">
            <div className="flex items-center justify-between">
              <p className="font-orbitron text-[10px] font-medium uppercase tracking-[0.25em] text-[var(--text-secondary)]">
                {t('map.vehicles')}
              </p>
              {stopSearch.trim() && (
                <button
                  type="button"
                  onClick={() => { setStopSearch(''); setSelectedBusId(null); }}
                  className="text-[10px] text-[#E53935] hover:underline"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="mt-4 max-h-[360px] space-y-2 overflow-y-auto">
              {filteredBuses.length === 0 ? (
                <p className="py-4 text-center text-xs text-[var(--text-muted)]">
                  {stopSearch.trim() ? t('map.noBuses') : t('map.typeStop')}
                </p>
              ) : (
                filteredBuses.map((bus) => {
                  const isFull = bus.seatsAvailable === 0;
                  const backupBus = findBackupBus(bus);
                  const isSelected = selectedBusId === bus.id;

                  return (
                    <div key={bus.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedBusId(bus.id)}
                        className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition ${
                          isSelected
                            ? 'bg-[#E53935]/10 shadow-[inset_0_0_0_1px_rgba(229,57,53,0.2)]'
                            : 'bg-black/[0.03] hover:bg-black/[0.06]'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate text-sm font-medium text-[var(--text-primary)]">{bus.number}</span>
                            <span className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${
                              bus.status === 'running' ? 'bg-[#E53935]' : bus.status === 'delayed' ? 'bg-[#FFB300]' : 'bg-[var(--text-muted)]'
                            }`} />
                            {isFull && (
                              <span className="rounded bg-[#E53935]/15 px-1.5 py-0.5 text-[9px] font-bold text-[#E53935]">
                                {t('map.full')}
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 truncate text-[10px] text-[var(--text-secondary)]">
                            {bus.route.origin} → {bus.route.destination}
                          </p>
                        </div>
                        <div className="ml-3 shrink-0 text-right">
                          <div className="font-jetbrains text-xs text-[var(--text-secondary)]">{bus.speed} km/h</div>
                          <div className="font-jetbrains text-[10px] text-[var(--text-muted)]">
                            {(() => {
                              const nextIdx = bus.route.stops.findIndex((s) => s.name === bus.currentStop) + 1;
                              if (nextIdx < bus.route.stops.length) {
                                return formatKm(haversineKm(bus.latitude, bus.longitude, bus.route.stops[nextIdx].lat, bus.route.stops[nextIdx].lng));
                              }
                              return '';
                            })()}
                          </div>
                        </div>
                      </button>
                      {isFull && backupBus && (
                        <button
                          type="button"
                          onClick={() => setSelectedBusId(backupBus.id)}
                          className={`ml-4 mt-1 flex w-[calc(100%-1rem)] items-center gap-2 rounded-xl px-3 py-2 text-left transition ${
                            selectedBusId === backupBus.id
                              ? 'bg-[#00BCD4]/10 shadow-[inset_0_0_0_1px_rgba(0,188,212,0.2)]'
                              : 'bg-[#00BCD4]/5 hover:bg-[#00BCD4]/10'
                          }`}
                        >
                          <span className="text-[10px] text-[#00BCD4]">↳</span>
                          <div className="min-w-0 flex-1">
                            <span className="text-xs font-medium text-[var(--text-primary)]">{backupBus.number}</span>
                            <span className="ml-2 text-[9px] text-[#00BCD4]">{t('map.seatsLeft', { n: String(backupBus.seatsAvailable) })}</span>
                          </div>
                          <span className="font-jetbrains text-[10px] text-[var(--text-secondary)]">{backupBus.speed} km/h</span>
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
