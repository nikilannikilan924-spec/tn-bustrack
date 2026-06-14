'use client';

import { useEffect, useMemo, useState } from 'react';
import { notFound, useRouter } from 'next/navigation';
import { getMockDashboardData, type Bus } from '@/lib/mock-data';
import { subscribeBusLocationUpdate } from '@/lib/socket';
import { useLanguage } from '@/lib/LanguageContext';
import { Button } from '@/components/ui/Button';
import { haversineKm, formatKm } from '@/lib/distance';

interface BusPageProps {
  params: { id: string };
}

export default function BusDetailPage({ params }: BusPageProps) {
  const { id } = params;
  const { t } = useLanguage();
  const router = useRouter();
  const { buses: seedBuses } = useMemo(() => getMockDashboardData(), []);
  const [buses, setBuses] = useState<Bus[]>(seedBuses);

  useEffect(() => {
    const unsubscribe = subscribeBusLocationUpdate((payload: Bus[] | { buses: Bus[] }) => {
      const liveBuses = Array.isArray(payload) ? payload : payload.buses;
      if (Array.isArray(liveBuses)) setBuses(liveBuses);
    });
    return unsubscribe;
  }, []);

  const bus = buses.find((b) => b.id === id);
  if (!bus) return notFound();

  const currentIndex = bus.route.stops.findIndex((stop) => stop.name === bus.currentStop);
  const crowdedPct = Math.round((bus.passengersInside / bus.seatCapacity) * 100);
  const nextStopDist = currentIndex + 1 < bus.route.stops.length
    ? haversineKm(bus.latitude, bus.longitude, bus.route.stops[currentIndex + 1].lat, bus.route.stops[currentIndex + 1].lng)
    : null;

  return (
    <div className="space-y-5 pb-28 max-sm:space-y-4">
      <div className="gradient-header rounded-3xl p-6 shadow-lg shadow-[var(--shadow-heavy)] max-sm:rounded-2xl max-sm:p-5">
        <div className="gradient-header-text">
          <Button variant="ghost" className="mb-3 text-white/70 hover:text-white" onClick={() => router.back()}>← Back</Button>
          <div className="flex items-center gap-3">
            <span className={`h-3 w-3 rounded-full ${
              bus.status === 'running' ? 'bg-[#22C55E] shadow-[0_0_12px_rgba(34,197,94,0.6)]' :
              bus.status === 'delayed' ? 'bg-[#F59E0B] shadow-[0_0_12px_rgba(245,158,11,0.5)]' :
              'bg-[var(--text-muted)]'
            }`} />
            <p className="font-orbitron text-[10px] uppercase tracking-[0.3em] text-white/60">{t('app.name')}</p>
          </div>
          <h1 className="mt-2 text-2xl font-bold text-white max-sm:text-xl">Bus {bus.number}</h1>
          <p className="mt-1 text-sm text-white/70">
            {t('route.number', { number: bus.route.number })} • {t('route.originDest', { origin: bus.route.origin, destination: bus.route.destination })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <div className="glass rounded-3xl p-4 shadow-lg shadow-[var(--shadow-heavy)] max-sm:rounded-2xl max-sm:p-3">
          <p className="text-[10px] uppercase tracking-[0.25em] text-[var(--text-muted)]">{t('bus.eta')}</p>
          <p className="mt-1 font-jetbrains text-xl font-semibold text-[var(--text-primary)] max-sm:text-lg">{bus.etaMinutes} <span className="text-xs text-[var(--text-secondary)]">min</span></p>
        </div>
        <div className="glass rounded-3xl p-4 shadow-lg shadow-[var(--shadow-heavy)] max-sm:rounded-2xl max-sm:p-3">
          <p className="text-[10px] uppercase tracking-[0.25em] text-[var(--text-muted)]">{t('bus.speed')}</p>
          <p className="mt-1 font-jetbrains text-xl font-semibold text-[var(--text-primary)] max-sm:text-lg">
            {t('bus.speedValue', { speed: String(bus.speed) })}
          </p>
        </div>
        <div className="glass rounded-3xl p-4 shadow-lg shadow-[var(--shadow-heavy)] max-sm:rounded-2xl max-sm:p-3">
          <p className="text-[10px] uppercase tracking-[0.25em] text-[var(--text-muted)]">{t('bus.seats')}</p>
          <p className="mt-1 font-jetbrains text-xl font-semibold text-[var(--text-primary)] max-sm:text-lg">
            {bus.seatsAvailable}<span className="text-xs text-[var(--text-secondary)]">/{bus.seatCapacity}</span>
          </p>
        </div>
        <div className="glass rounded-3xl p-4 shadow-lg shadow-[var(--shadow-heavy)] max-sm:rounded-2xl max-sm:p-3">
          <p className="text-[10px] uppercase tracking-[0.25em] text-[var(--text-muted)]">{t('bus.distance')}</p>
          <p className="mt-1 font-jetbrains text-xl font-semibold text-[var(--text-primary)] max-sm:text-lg">
            {nextStopDist !== null ? formatKm(nextStopDist) : '—'}
          </p>
          {nextStopDist !== null && (
            <p className="text-[10px] text-[var(--text-muted)] mt-1">
              {t('bus.distanceToNext', { km: '' }).replace(' to next stop', '')} to {currentIndex + 1 < bus.route.stops.length ? bus.route.stops[currentIndex + 1].name : ''}
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 md:gap-6">
        <div className="glass rounded-3xl p-5 shadow-lg shadow-[var(--shadow-heavy)] max-sm:rounded-2xl max-sm:p-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-[#0EA5E9]/30 bg-[#0EA5E9]/8 p-3">
              <p className="text-[10px] uppercase tracking-[0.25em] text-[#0EA5E9]">{t('bus.currentStop')}</p>
              <p className="mt-1 text-base font-semibold text-[var(--text-primary)] max-sm:text-sm">{bus.currentStop}</p>
            </div>
            <div className="rounded-2xl border border-[#00BCD4]/30 bg-[#00BCD4]/8 p-3">
              <p className="text-[10px] uppercase tracking-[0.25em] text-[#00BCD4]">{t('bus.nextStop')}</p>
              <p className="mt-1 text-base font-semibold text-[var(--text-primary)] max-sm:text-sm">
                {currentIndex + 1 < bus.route.stops.length ? bus.route.stops[currentIndex + 1].name : '—'}
              </p>
            </div>
          </div>
        </div>

        <div className="glass rounded-3xl p-5 shadow-lg shadow-[var(--shadow-heavy)] max-sm:rounded-2xl max-sm:p-4">
          <p className="text-[10px] uppercase tracking-[0.25em] text-[var(--text-muted)]">{bus.operator} • {bus.busType}</p>
          <div className="mt-3 flex items-center gap-2">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--border)]">
              <div
                className={`h-full rounded-full transition-all ${
                  crowdedPct > 70 ? 'bg-[#0EA5E9]' : crowdedPct > 40 ? 'bg-[#FFB300]' : 'bg-[#00BCD4]'
                }`}
                style={{ width: `${crowdedPct}%` }}
              />
            </div>
            <span className="font-jetbrains text-[10px] text-[var(--text-muted)]">{crowdedPct}% full</span>
          </div>
        </div>
      </div>

      <div className="glass rounded-3xl p-5 shadow-lg shadow-[var(--shadow-heavy)] max-sm:rounded-2xl max-sm:p-4">
        <h3 className="font-orbitron text-[10px] uppercase tracking-[0.3em] text-[var(--text-secondary)]">{t('bus.routeTimeline')}</h3>
        <ul className="mt-4 space-y-1.5 text-sm">
          {bus.route.stops.map((stop) => {
            const idx = stop.sequence - 1;
            return (
              <li
                key={stop.id}
                className={`rounded-2xl p-3 transition ${
                  idx === currentIndex
                    ? 'border border-[#0EA5E9]/30 bg-[#0EA5E9]/10 text-[var(--text-primary)]'
                    : idx === currentIndex + 1
                      ? 'border border-[#00BCD4]/30 bg-[#00BCD4]/10 text-[var(--text-primary)]'
                      : idx < currentIndex
                        ? 'bg-black/[0.02] text-[var(--text-muted)]'
                        : 'bg-[var(--overlay-subtle)] text-[var(--text-secondary)]'
                }`}
              >
                <span className="mr-3 inline-flex h-5 w-5 items-center justify-center rounded-full bg-black/[0.06] font-jetbrains text-[10px] font-semibold text-[var(--text-muted)]">
                  {stop.sequence}
                </span>
                <div className="flex flex-1 items-center justify-between">
                  <span>
                    {stop.name}
                    {idx === currentIndex && <span className="ml-2 inline-block h-2 w-2 rounded-full bg-[#0EA5E9] shadow-[0_0_8px_rgba(14,165,233,0.6)]" />}
                    {idx === currentIndex + 1 && <span className="ml-2 text-[#00BCD4]">↓</span>}
                  </span>
                  <span className="font-jetbrains text-[10px] text-[var(--text-muted)]">
                    {formatKm(haversineKm(bus.latitude, bus.longitude, stop.lat, stop.lng))}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
