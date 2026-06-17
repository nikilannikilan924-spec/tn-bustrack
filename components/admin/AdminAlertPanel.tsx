import type { Alert } from '@/lib/types';

interface AdminAlertPanelProps {
  alerts: Alert[];
}

export function AdminAlertPanel({ alerts }: AdminAlertPanelProps) {
  return (
    <div className="rounded-2xl border border-white/5 bg-[#1A2235] p-5">
      <div className="mb-4 flex items-center gap-2">
        <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
        <h3 className="font-orbitron text-xs font-semibold uppercase tracking-[0.2em] text-[#F0F4FF]">Active Alerts</h3>
      </div>
      <div className="space-y-2">
        {alerts.slice(0, 4).map((alert) => (
          <div
            key={alert.id}
            className="rounded-xl border border-white/5 bg-[#111827] p-3 transition hover:bg-[#0A0F1E]"
          >
            <div className="flex items-center gap-2">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  alert.severity === 'CRITICAL'
                    ? 'bg-red-500'
                    : alert.severity === 'WARNING'
                      ? 'bg-yellow-400'
                      : 'bg-cyan-400'
                }`}
              />
              <span className="text-xs font-semibold uppercase tracking-wider text-[#8892A4]">
                {alert.severity}
              </span>
              <span className="ml-auto font-jetbrains text-[10px] text-[#8892A4]">
                {new Date(alert.createdAt).toLocaleTimeString('en-IN', { hour12: false })}
              </span>
            </div>
            <p className="mt-1 text-sm font-medium text-[#F0F4FF]">{alert.title}</p>
            <p className="mt-0.5 text-xs text-[#8892A4]">{alert.message}</p>
          </div>
        ))}
        <a
          href="/alerts"
          className="mt-2 block rounded-xl border border-dashed border-white/10 bg-transparent py-2 text-center text-xs font-medium text-[#8892A4] transition hover:border-cyan-400/30 hover:text-cyan-400"
        >
          View all alerts →
        </a>
      </div>
    </div>
  );
}
