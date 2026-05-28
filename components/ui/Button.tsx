import Link from 'next/link';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  href?: string;
  variant?: 'primary' | 'ghost' | 'outline';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
}

const styles = {
  primary:
    'inline-flex items-center justify-center rounded-2xl bg-[#E53935] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#C62828] shadow-[0_0_24px_rgba(229,57,53,0.3)] hover:shadow-[0_0_32px_rgba(229,57,53,0.5)]',
  ghost:
    'inline-flex items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)]/80 px-5 py-3 text-sm font-semibold text-[var(--text-secondary)] transition hover:border-[#E53935]/30 hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)]',
  outline:
    'inline-flex items-center justify-center rounded-2xl border border-[#E53935]/40 px-5 py-3 text-sm font-semibold text-[#E53935] transition hover:bg-[#E53935]/10 hover:border-[#E53935]'
};

export function Button({ href, variant = 'primary', size = 'default', className = '', children, ...props }: ButtonProps) {
  const sizing = size === 'sm' ? 'px-4 py-2 text-xs' : size === 'lg' ? 'px-7 py-4 text-base' : '';
  const base = `${styles[variant]} ${sizing} ${className}`;

  if (href) {
    return (
      <Link href={href} className={base}>
        {children}
      </Link>
    );
  }

  return (
    <button className={base} {...props}>
      {children}
    </button>
  );
}
