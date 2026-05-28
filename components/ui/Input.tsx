interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, className = '', ...props }: InputProps) {
  return (
    <label className="block text-sm text-[var(--text-primary)]">
      {label && <span className="mb-2 block text-[var(--text-secondary)]">{label}</span>}
      <input
        className={`w-full rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-primary)]/80 px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[#00BCD4] focus:ring-4 focus:ring-[#00BCD4]/15 ${className}`}
        {...props}
      />
    </label>
  );
}
