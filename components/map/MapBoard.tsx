'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';
import { subscribeBusLocationUpdate, subscribeBusRemoved } from '@/lib/socket';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useLanguage } from '@/lib/LanguageContext';
import { haversineKm, formatKm } from '@/lib/distance';

type BusStatus = 'running' | 'delayed' | 'stopped';

interface LiveBus {
  id: string;
  number: string;
  routeName: string;
  currentStop: string;
  status: BusStatus;
  speed: number;
  latitude: number;
  longitude: number;
  seatsAvailable: number;
  seatCapacity: number;
  nextStops: { name: string; distKm: string; etaMin: number }[];
}

const LiveMap = dynamic(() => import('@/components/map/LiveMap'), { ssr: false });

function normalizeBus(raw: any): LiveBus {
  return {
    id: raw.busId || raw.id,
    number: raw.busNumber || raw.number || raw.busId || 'Unknown',
    routeName: raw.route || raw.routeName || 'Unknown Route',
    currentStop: raw.currentStop || 'Unknown',
    status: raw.status || (raw.speed > 0 ? 'running' : 'stopped'),
    speed: raw.speed || 0,
    latitude: raw.lat ?? raw.latitude ?? 0,
    longitude: raw.lng ?? raw.longitude ?? 0,
    seatsAvailable: raw.seats ?? raw.seatsAvailable ?? 0,
    seatCapacity: raw.seatCapacity ?? raw.totalSeats ?? 42,
    nextStops: raw.nextStops || [],
  };
}

export function MapBoard() {
  const { t } = useLanguage();
  const [buses, setBuses] = useState<LiveBus[]>([]);
  const [selectedBusId, setSelectedBusId] = useState<string | null>(null);
  const [stopSearch, setStopSearch] = useState('');

  useEffect(() => {
    const unsub1 = subscribeBusLocationUpdate((payload: any) => {
      const raw = Array.isArray(payload) ? payload : [payload];
      if (Array.isArray(raw)) {
        setBuses(raw.map(normalizeBus));
      }
    });

    const unsub2 = subscribeBusRemoved((busId: string) => {
      setBuses(prev => prev.filter(b => b.id !== busId));
    });

    fetchBuses();
    const interval = setInterval(fetchBuses, 4000);
    return () => { unsub1(); unsub2(); clearInterval(interval); };
  }, []);

  async function fetchBuses() {
    try {
      const res = await fetch('/api/buses');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setBuses(data.map(normalizeBus));
      }
    } catch (_) {}
  }

  const allStopNames = useMemo(() => {
    const names = new Set<string>();
    buses.forEach((b) => { if (b.currentStop) names.add(b.currentStop); });
    return Array.from(names).sort();
  }, [buses]);

  const filteredBuses = useMemo(() => {
    const q = stopSearch.trim().toLowerCase();
    if (!q) return buses;
    return buses.filter((b) =>
      (b.currentStop || '').toLowerCase().includes(q)
    );
  }, [buses, stopSearch]);

  const running = filteredBuses.filter((bus) => bus.status === 'running').length;
  const selectedBus = filteredBuses.find(b => b.id === selectedBusId) || null;

  const findBackupBus = (bus: LiveBus): LiveBus | null => {
    if (bus.seatsAvailable > 0) return null;
    return filteredBuses.find((b) => b.id !== bus.id && b.seatsAvailable > 0) ?? null;
  };

  return (
    <div className="space-y-5 pb-28 max-sm:space-y-4">
      <div className="gradient-header rounded-3xl p-6 shadow-lg shadow-[var(--shadow-heavy)] max-sm:rounded-2xl max-sm:p-5">
        <div className="gradient-header-text flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="font-orbitron text-[10px] uppercase tracking-[0.3em] text-white/60">{t('map.view')}</p>
            <h1 className="mt-2 text-2xl font-bold text-white max-sm:text-xl">{t('map.title')}</h1>
            <p className="mt-2 text-sm text-white/70">{t('map.subtitle')}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Card title={t('map.vehicles')} value={String(filteredBuses.length)} compact glow="teal" />
            <Card title={t('map.running')} value={String(running)} compact glow="blue" />
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.45fr_0.55fr] lg:gap-6">
        <LiveMap buses={filteredBuses} onBusSelect={setSelectedBusId} />
        <aside className="space-y-4">
          <div className="glass rounded-3xl p-5 shadow-lg shadow-[var(--shadow-heavy)] max-sm:rounded-2xl max-sm:p-4">
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

          {selectedBusId ? (
            <div className="glass rounded-3xl p-5 shadow-lg shadow-[var(--shadow-heavy)] max-sm:rounded-2xl max-sm:p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="font-orbitron text-[10px] font-medium uppercase tracking-[0.25em] text-[var(--text-secondary)]">
                  {selectedBus?.number || 'Bus'} ETA
                </p>
                <button onClick={() => setSelectedBusId(null)} className="text-[10px] text-[#0EA5E9] hover:underline">Close</button>
              </div>
              {selectedBus && (
                <div className="space-y-2">
                  <div className="rounded-xl bg-[var(--overlay-hover)] p-3">
                    <p className="text-xs text-[var(--text-muted)]">Speed</p>
                    <p className="font-jetbrains text-sm font-bold">{selectedBus.speed} km/h</p>
                  </div>
                  <div className="rounded-xl bg-[var(--overlay-hover)] p-3">
                    <p className="text-xs text-[var(--text-muted)]">Current Stop</p>
                    <p className="text-sm font-semibold">{selectedBus.currentStop}</p>
                  </div>
                  <div className="rounded-xl bg-[var(--overlay-hover)] p-3">
                    <p className="text-xs text-[var(--text-muted)]">Next Stop</p>
                    {selectedBus.nextStops[0] ? (
                      <>
                        <p className="text-sm font-semibold">{selectedBus.nextStops[0].name}</p>
                        <p className="font-jetbrains text-xs text-[#0EA5E9]">
                          {selectedBus.nextStops[0].etaMin} min ({selectedBus.nextStops[0].distKm} km)
                        </p>
                      </>
                    ) : (
                      <p className="text-xs text-[var(--text-muted)]">No upcoming stops</p>
                    )}
                  </div>
                  {selectedBus.nextStops.length > 1 && (
                    <div className="rounded-xl bg-[var(--overlay-subtle)] p-3">
                      <p className="text-xs text-[var(--text-muted)] mb-2">All Upcoming Stops</p>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {selectedBus.nextStops.slice(1).map((s, i) => (
                          <div key={i} className="flex justify-between text-xs">
                            <span className="text-[var(--text-secondary)]">{s.name}</span>
                            <span className="font-jetbrains text-[var(--text-muted)]">{s.etaMin} min</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="rounded-xl bg-[var(--overlay-hover)] p-3">
                    <p className="text-xs text-[var(--text-muted)]">Seats</p>
                    <p className="text-sm font-semibold">{selectedBus.seatsAvailable}/{selectedBus.seatCapacity}</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="glass rounded-3xl p-5 shadow-lg shadow-[var(--shadow-heavy)] max-sm:rounded-2xl max-sm:p-4">
              <p className="font-orbitron text-[10px] font-medium uppercase tracking-[0.25em] text-[var(--text-secondary)]">
                {t('map.legend')}
              </p>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex items-center gap-3 rounded-xl bg-[var(--overlay-subtle)] px-3 py-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#22C55E] shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                  <span className="text-[var(--text-secondary)]">{t('map.legend.running')}</span>
                </div>
                <div className="flex items-center gap-3 rounded-xl bg-[var(--overlay-subtle)] px-3 py-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#F59E0B] shadow-[0_0_8px_rgba(245,158,11,0.4)]" />
                  <span className="text-[var(--text-secondary)]">{t('map.legend.delayed')}</span>
                </div>
                <div className="flex items-center gap-3 rounded-xl bg-[var(--overlay-subtle)] px-3 py-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[var(--text-muted)]" />
                  <span className="text-[var(--text-secondary)]">{t('map.legend.stopped')}</span>
                </div>
              </div>
            </div>
          )}

          <div className="glass rounded-3xl p-5 shadow-lg shadow-[var(--shadow-heavy)] max-sm:rounded-2xl max-sm:p-4">
            <div className="flex items-center justify-between">
              <p className="font-orbitron text-[10px] font-medium uppercase tracking-[0.25em] text-[var(--text-secondary)]">
                {t('map.vehicles')}
              </p>
              {stopSearch.trim() && (
                <button
                  type="button"
                  onClick={() => { setStopSearch(''); setSelectedBusId(null); }}
                  className="text-[10px] text-[#0EA5E9] hover:underline"
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
                            ? 'bg-[#0EA5E9]/10 shadow-[inset_0_0_0_1px_rgba(14,165,233,0.2)]'
                            : 'bg-[var(--overlay-subtle)] hover:bg-black/[0.06]'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate text-sm font-medium text-[var(--text-primary)]">{bus.number}</span>
                            <span className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${
                              bus.status === 'running' ? 'bg-[#22C55E]' : bus.status === 'delayed' ? 'bg-[#F59E0B]' : 'bg-[var(--text-muted)]'
                            }`} />
                            {isFull && (
                              <span className="rounded bg-[#0EA5E9]/15 px-1.5 py-0.5 text-[9px] font-bold text-[#0EA5E9]">
                                {t('map.full')}
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 truncate text-[10px] text-[var(--text-secondary)]">
                            {bus.routeName}
                          </p>
                        </div>
                        <div className="ml-3 shrink-0 text-right">
                          <div className="font-jetbrains text-xs text-[var(--text-secondary)]">{bus.speed} km/h</div>
                          {bus.nextStops[0] ? (
                            <div className="font-jetbrains text-[10px] text-[#0EA5E9]">
                              {bus.nextStops[0].etaMin} min
                            </div>
                          ) : (
                            <div className="font-jetbrains text-[10px] text-[var(--text-muted)]">{t('map.noBuses')}</div>
                          )}
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
