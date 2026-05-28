import type { Alert } from '@/lib/mock-data';

interface AlertCardProps {
  alert: Alert;
}

const severityStyles: Record<string, string> = {
  INFO: 'border-[#00BCD4]/30 bg-[#00BCD4]/8 text-[#00BCD4]',
  WARNING: 'border-[#FFB300]/30 bg-[#FFB300]/8 text-[#FFB300]',
  CRITICAL: 'border-[#E53935]/30 bg-[#E53935]/8 text-[#E53935]'
};

const severityDot: Record<string, string> = {
  INFO: 'bg-[#00BCD4] shadow-[0_0_8px_rgba(0,188,212,0.5)]',
  WARNING: 'bg-[#FFB300] shadow-[0_0_8px_rgba(255,179,0,0.4)]',
  CRITICAL: 'bg-[#E53935] shadow-[0_0_8px_rgba(229,57,53,0.6)]'
};

export function AlertCard({ alert }: AlertCardProps) {
  return (
    <div className="group rounded-3xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-lg shadow-[var(--shadow)] backdrop-blur transition hover:border-[var(--border-hover)]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${severityDot[alert.severity]}`} />
          <div>
            <p className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.25em] ${severityStyles[alert.severity]}`}>
              {alert.severity}
            </p>
            <h3 className="mt-2 text-lg font-semibold text-[var(--text-primary)]">{alert.title}</h3>
          </div>
        </div>
      </div>
      <p className="mt-3 pl-6 text-sm leading-relaxed text-[var(--text-secondary)]">{alert.message}</p>
      <p className="mt-4 pl-6 font-jetbrains text-[10px] uppercase tracking-[0.25em] text-[var(--text-muted)]">
        {new Date(alert.createdAt).toLocaleString()}
      </p>
    </div>
  );
}
