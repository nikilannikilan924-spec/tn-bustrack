"use client";

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/lib/LanguageContext';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';

const links: { href: string; key: string; icon: string }[] = [
  { href: '/dashboard', key: 'nav.buses', icon: '🚌' },
  { href: '/map', key: 'nav.map', icon: '🗺️' },
  { href: '/stops', key: 'nav.stops', icon: '📍' },
  { href: '/favorites', key: 'nav.saved', icon: '⭐' },
  { href: '/alerts', key: 'nav.alerts', icon: '🔔' }
];

export default function Sidebar() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="fixed left-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--bg-primary)]/90 text-lg backdrop-blur-xl md:hidden"
        aria-label="Toggle menu"
      >
        {open ? '✕' : '☰'}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-50 flex h-full w-72 flex-col border-r border-[var(--border)] bg-[var(--bg-primary)]/95 px-6 py-8 shadow-2xl shadow-[var(--shadow-heavy)] backdrop-blur-xl transition-transform duration-300 md:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="mb-10">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E53935] text-sm font-bold text-white shadow-[0_0_20px_rgba(229,57,53,0.4)]">
              TN
            </div>
            <div>
              <h2 className="font-orbitron text-lg font-bold tracking-wider text-[var(--text-primary)]">TN BusTrack</h2>
              <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--text-secondary)]">Tamil Nadu</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 space-y-1.5">
          {links.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href as string}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-[#E53935]/15 text-[#E53935] shadow-[inset_0_0_0_1px_rgba(229,57,53,0.2)]'
                    : 'text-[var(--text-secondary)] hover:bg-black/[0.04] hover:text-[var(--text-primary)]'
                }`}
              >
                <span className="text-base">{link.icon}</span>
                <span>{t(link.key)}</span>
                {isActive && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#E53935] shadow-[0_0_8px_rgba(229,57,53,0.8)]" />}
              </Link>
            );
          })}
        </nav>
        <div>
          <Link
            href="/settings"
            onClick={() => setOpen(false)}
            className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all ${
              pathname === '/settings'
                ? 'bg-[#E53935]/15 text-[#E53935] shadow-[inset_0_0_0_1px_rgba(229,57,53,0.2)]'
                : 'text-[var(--text-secondary)] hover:bg-black/[0.04] hover:text-[var(--text-primary)]'
            }`}
          >
            <span className="text-base">⚙️</span>
            <span>{t('nav.settings')}</span>
            {pathname === '/settings' && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#E53935] shadow-[0_0_8px_rgba(229,57,53,0.8)]" />}
          </Link>
          <div className="mt-4 flex items-center justify-between border-t border-[var(--border)] pt-4">
            <span className="text-[10px] uppercase tracking-[0.25em] text-[var(--text-muted)]">{t('settings.language')}</span>
            <LanguageSwitcher compact />
          </div>
        </div>
      </aside>
    </>
  );
}
