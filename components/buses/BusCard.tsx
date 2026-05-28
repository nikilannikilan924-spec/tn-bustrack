import Link from 'next/link';
import type { Bus } from '@/lib/mock-data';
import { useLanguage } from '@/lib/LanguageContext';
import { haversineKm, formatKm } from '@/lib/distance';

interface BusCardProps {
  bus: Bus;
  isSaved?: boolean;
  onToggleSaved?: (routeId: string) => void;
}

const statusStyles: Record<Bus['status'], string> = {
  running: 'bg-[#E53935] shadow-[0_0_12px_rgba(229,57,53,0.6)]',
  delayed: 'bg-[#FFB300] shadow-[0_0_12px_rgba(255,179,0,0.5)]',
  stopped: 'bg-[var(--text-muted)]'
};

const statusGlow: Record<Bus['status'], string> = {
  running: 'shadow-[0_0_20px_rgba(229,57,53,0.15)]',
  delayed: 'shadow-[0_0_20px_rgba(255,179,0,0.1)]',
  stopped: ''
};

const crowdedColor = (pct: number) =>
  pct > 70 ? 'bg-[#E53935]' : pct > 40 ? 'bg-[#FFB300]' : 'bg-[#00BCD4]';

export function BusCard({ bus, isSaved = false, onToggleSaved }: BusCardProps) {
  const { t } = useLanguage();
  const crowdedPct = Math.round((bus.passengersInside / bus.seatCapacity) * 100);

  return (
    <Link
      href={`/bus/${bus.id}`}
      className={`group block w-full rounded-3xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4 text-left shadow-lg shadow-[var(--shadow)] backdrop-blur transition-all hover:-translate-y-0.5 hover:border-[#E53935]/30 max-sm:rounded-2xl max-sm:p-3 ${statusGlow[bus.status]}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${statusStyles[bus.status]}`} />
            <p className="font-orbitron text-[10px] uppercase tracking-[0.3em] text-[#E53935]">
              {t('route.number', { number: bus.route.number })}
            </p>
          </div>
          <h3 className="mt-2 text-lg font-semibold text-[var(--text-primary)] max-sm:text-base">Bus {bus.number}</h3>
          <p className="mt-1 truncate text-sm text-[var(--text-secondary)]">
            {t('route.originDest', { origin: bus.route.origin, destination: bus.route.destination })}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <span className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.25em] ${
            bus.status === 'running'
              ? 'border-[#E53935]/30 text-[#E53935]'
              : bus.status === 'delayed'
                ? 'border-[#FFB300]/30 text-[#FFB300]'
                : 'border-[var(--border-subtle)] text-[var(--text-secondary)]'
          }`}>
            {bus.status}
          </span>
          {onToggleSaved && (
            <span
              role="button"
              tabIndex={0}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onToggleSaved(bus.routeId);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  event.stopPropagation();
                  onToggleSaved(bus.routeId);
                }
              }}
              className={`cursor-pointer rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.25em] transition ${
                isSaved
                  ? 'bg-[#E53935] text-white'
                  : 'bg-[var(--border)] text-[var(--text-secondary)] hover:bg-black/[0.06]'
              }`}
            >
              {isSaved ? t('bus.saved') : t('bus.save')}
            </span>
          )}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-[var(--text-muted)]">{t('bus.status.eta')}</p>
          <p className="mt-0.5 font-jetbrains text-base font-semibold text-[var(--text-primary)] max-sm:text-sm">{bus.etaMinutes} <span className="text-xs text-[var(--text-secondary)]">min</span></p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-[var(--text-muted)]">{t('bus.status.seats')}</p>
          <p className="mt-0.5 font-jetbrains text-base font-semibold text-[var(--text-primary)] max-sm:text-sm">
            {bus.seatsAvailable}<span className="text-xs text-[var(--text-secondary)]">/{bus.seatCapacity}</span>
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-[var(--text-muted)]">{t('bus.speed')}</p>
          <p className="mt-0.5 font-jetbrains text-base font-semibold text-[var(--text-primary)] max-sm:text-sm">
            {t('bus.speedValue', { speed: String(bus.speed) })}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-[var(--text-muted)]">{t('passenger.inside')}</p>
          <p className="mt-0.5 font-jetbrains text-base font-semibold text-[var(--text-primary)] max-sm:text-sm">{bus.passengersInside}</p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-[var(--border)]">
          <div
            className={`h-full rounded-full transition-all ${crowdedColor(crowdedPct)}`}
            style={{ width: `${crowdedPct}%` }}
          />
        </div>
        <span className="text-[10px] text-[var(--text-muted)]">{crowdedPct}%</span>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-[var(--text-muted)]">
        <span>{bus.operator} • {bus.busType}</span>
        <span className="font-jetbrains">
          {(() => {
            const nextIdx = bus.route.stops.findIndex(s => s.name === bus.currentStop) + 1;
            if (nextIdx < bus.route.stops.length) {
              return formatKm(haversineKm(bus.latitude, bus.longitude, bus.route.stops[nextIdx].lat, bus.route.stops[nextIdx].lng));
            }
            return '—';
          })()}
        </span>
      </div>
    </Link>
  );
}
