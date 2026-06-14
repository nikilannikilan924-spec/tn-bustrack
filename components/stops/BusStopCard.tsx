'use client';

import { memo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Bus } from '@/lib/mock-data';
import { useLanguage } from '@/lib/LanguageContext';
import { haversineKm, formatKm } from '@/lib/distance';
import { estimateEtaToStop } from '@/lib/eta';

interface BusStopCardProps {
  bus: Bus;
  selectedStop: string;
}

export const BusStopCard = memo(function BusStopCard({ bus, selectedStop }: BusStopCardProps) {
  const { t } = useLanguage();
  const router = useRouter();

  const stop = bus.route.stops.find((s) => s.name === selectedStop)!;
  const eta = estimateEtaToStop(bus, stop.sequence);
  const currentIdx = bus.route.stops.findIndex((s) => s.name === bus.currentStop);
  const passed = stop.sequence <= currentIdx;
  const atStop = stop.name === bus.currentStop;
  const crowdedPct = Math.round((bus.passengersInside / bus.seatCapacity) * 100);
  const nextStopName = currentIdx + 1 < bus.route.stops.length
    ? bus.route.stops[currentIdx + 1].name
    : null;

  const handleClick = useCallback(() => {
    router.push(`/bus/${bus.id}`);
  }, [router, bus.id]);

  return (
    <button
      type="button"
      onClick={handleClick}
      className="w-full rounded-3xl border border-[var(--border)] bg-white/70 p-5 text-left shadow-lg shadow-[var(--shadow-heavy)] backdrop-blur-xl transition hover:border-[#0097A7]/30 hover:shadow-xl"
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
              crowdedPct > 70 ? 'bg-[#0EA5E9]' : crowdedPct > 40 ? 'bg-[#FFB300]' : 'bg-[#00BCD4]'
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
});
