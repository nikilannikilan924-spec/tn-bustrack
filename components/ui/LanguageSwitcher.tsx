'use client';

import { useLanguage } from '@/lib/LanguageContext';

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { lang, setLang } = useLanguage();

  return (
    <div className={`flex ${compact ? 'gap-1' : 'gap-2'}`}>
      <button
        type="button"
        onClick={() => setLang('en')}
        className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] transition ${
          lang === 'en'
            ? 'bg-[#E53935] text-white shadow-[0_0_16px_rgba(229,57,53,0.3)]'
            : 'bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-black/[0.06] hover:text-[var(--text-primary)]'
        }`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLang('ta')}
        className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] transition ${
          lang === 'ta'
            ? 'bg-[#E53935] text-white shadow-[0_0_16px_rgba(229,57,53,0.3)]'
            : 'bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-black/[0.06] hover:text-[var(--text-primary)]'
        }`}
      >
        தா
      </button>
    </div>
  );
}
