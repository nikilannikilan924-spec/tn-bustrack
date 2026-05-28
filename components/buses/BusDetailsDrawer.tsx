import type { Bus } from '@/lib/mock-data';
import { useLanguage } from '@/lib/LanguageContext';

interface BusDetailsDrawerProps {
  bus: Bus | null;
}

export function BusDetailsDrawer({ bus }: BusDetailsDrawerProps) {
  const { t } = useLanguage();

  if (!bus) {
    return (
      <div className="rounded-3xl border border-white/10 bg-slate-900/75 p-6 shadow-soft backdrop-blur">
        <h2 className="text-lg font-semibold text-white">{t('bus.details')}</h2>
        <p className="mt-3 text-slate-400">{t('bus.selectHint')}</p>
      </div>
    );
  }

  const currentIndex = bus.route.stops.findIndex((stop) => stop.name === bus.currentStop);

  return (
    <div className="rounded-3xl border border-white/10 bg-slate-900/75 p-6 shadow-soft backdrop-blur">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-green-300">{t('bus.details')}</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">{bus.number}</h2>
          <p className="mt-1 text-sm text-slate-400">
            {t('route.number', { number: bus.route.number })} • {t('route.originDest', { origin: bus.route.origin, destination: bus.route.destination })}
          </p>
        </div>
        <span className="rounded-full bg-slate-800 px-3 py-1 text-xs uppercase tracking-[0.3em] text-slate-200">{bus.status}</span>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-3xl bg-slate-950/80 p-4">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">{t('bus.eta')}</p>
          <p className="mt-2 text-xl font-semibold text-white">{bus.etaMinutes} min</p>
        </div>
        <div className="rounded-3xl bg-slate-950/80 p-4">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">{t('bus.speed')}</p>
          <p className="mt-2 text-xl font-semibold text-white">{t('bus.speedValue', { speed: String(bus.speed) })}</p>
        </div>
        <div className="rounded-3xl bg-slate-950/80 p-4">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">{t('bus.type')}</p>
          <p className="mt-2 text-xl font-semibold text-white">{bus.busType}</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-[#16a34a]/30 bg-[#16a34a]/10 p-3">
          <p className="text-[10px] uppercase tracking-[0.25em] text-[#4ade80]">{t('bus.currentStop')}</p>
          <p className="mt-1 font-semibold text-white">{bus.currentStop}</p>
        </div>
        <div className="rounded-2xl border border-sky-400/30 bg-sky-400/10 p-3">
          <p className="text-[10px] uppercase tracking-[0.25em] text-sky-300">{t('bus.nextStop')}</p>
          <p className="mt-1 font-semibold text-white">
            {currentIndex + 1 < bus.route.stops.length ? bus.route.stops[currentIndex + 1].name : '—'}
          </p>
        </div>
      </div>
      <div className="mt-4">
        <h3 className="text-sm uppercase tracking-[0.3em] text-slate-400">{t('bus.routeTimeline')}</h3>
        <ul className="mt-3 space-y-2 text-sm text-slate-300">
          {bus.route.stops.map((stop) => (
            <li
              key={stop.id}
              className={`rounded-2xl p-3 ${
                stop.sequence - 1 === currentIndex
                  ? 'border border-[#16a34a]/30 bg-[#16a34a]/10 text-white'
                  : stop.sequence - 1 === currentIndex + 1
                    ? 'border border-sky-400/30 bg-sky-400/10 text-white'
                    : stop.sequence - 1 < currentIndex
                      ? 'bg-slate-950/70 text-slate-500'
                      : 'bg-slate-950/80'
              }`}
            >
              <span className="mr-3 inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-400">
                {stop.sequence}
              </span>
              {stop.name}
              {stop.sequence - 1 === currentIndex && (
                <span className="ml-2 rounded-full bg-[#16a34a]/20 px-2 py-0.5 text-[10px] font-semibold text-[#4ade80]">●</span>
              )}
              {stop.sequence - 1 === currentIndex + 1 && (
                <span className="ml-2 rounded-full bg-sky-400/20 px-2 py-0.5 text-[10px] font-semibold text-sky-300">↓</span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
