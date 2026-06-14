interface CardProps {
  title: string;
  value?: string;
  description?: string;
  compact?: boolean;
  className?: string;
  children?: React.ReactNode;
  glow?: 'blue' | 'teal' | 'amber' | 'none';
}

export function Card({ title, value, description, compact = false, className = '', children, glow = 'none' }: CardProps) {
  const glowClass = glow === 'blue' ? 'card-glow-blue' : glow === 'teal' ? 'card-glow-teal' : glow === 'amber' ? 'card-glow-amber' : '';
  const accentBorder = glow === 'blue' ? 'border-l-[#0EA5E9]' : glow === 'teal' ? 'border-l-[#0D9488]' : glow === 'amber' ? 'border-l-[#F59E0B]' : '';

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-[var(--border)] bg-white/70 p-5 shadow-lg shadow-[var(--shadow-heavy)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:shadow-xl ${glowClass} ${compact ? 'py-4 max-sm:py-3' : ''} ${accentBorder} border-l-4 ${className}`}
    >
      <div className="relative z-10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-secondary)]">{title}</p>
        {value && <p className="mt-2 text-2xl font-bold text-[var(--text-primary)] max-sm:text-xl">{value}</p>}
        {description && <p className="mt-1.5 text-sm text-[var(--text-secondary)]">{description}</p>}
      </div>
      {children}
    </div>
  );
}
