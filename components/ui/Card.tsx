interface CardProps {
  title: string;
  value?: string;
  description?: string;
  compact?: boolean;
  className?: string;
  children?: React.ReactNode;
  glow?: 'red' | 'teal' | 'gold' | 'none';
}

export function Card({ title, value, description, compact = false, className = '', children, glow = 'none' }: CardProps) {
  const glowClass = glow === 'red' ? 'card-glow-red' : glow === 'teal' ? 'card-glow-teal' : glow === 'gold' ? 'card-glow-gold' : '';

  return (
    <div
      className={`rounded-3xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5 shadow-lg shadow-[var(--shadow)] backdrop-blur transition hover:border-[var(--border-hover)] max-sm:rounded-2xl max-sm:p-4 ${glowClass} ${compact ? 'py-4 max-sm:py-3' : ''} ${className}`}
    >
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-[var(--text-secondary)]">{title}</p>
        {value && <p className="mt-2 text-2xl font-semibold text-[var(--text-primary)] max-sm:text-xl">{value}</p>}
        {description && <p className="mt-2 text-sm text-[var(--text-secondary)]">{description}</p>}
      </div>
      {children}
    </div>
  );
}
