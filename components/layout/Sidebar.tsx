"use client";

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/lib/LanguageContext';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';

const links: { href: string; key: string; icon: string }[] = [
  { href: '/', key: 'app.name', icon: '🏠' },
  { href: '/dashboard', key: 'nav.buses', icon: '🚌' },
  { href: '/map', key: 'nav.map', icon: '🗺️' },
  { href: '/nearby', key: 'nav.nearby', icon: '📡' },
  { href: '/stops', key: 'nav.stops', icon: '📍' },
  { href: '/favorites', key: 'nav.saved', icon: '⭐' },
  { href: '/alerts', key: 'nav.alerts', icon: '🔔' },
  { href: '/setup', key: 'nav.setup', icon: '⚙️' },
  { href: '/how', key: 'nav.how', icon: '❓' }
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
        className="fixed left-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/70 text-lg backdrop-blur-xl shadow-lg md:hidden"
        aria-label="Toggle menu"
      >
        {open ? '✕' : '☰'}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-50 flex h-full w-72 flex-col bg-white/80 px-6 py-8 shadow-2xl shadow-[var(--shadow-heavy)] backdrop-blur-xl border-r border-white/20 transition-transform duration-300 md:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="mb-10">
          <div className="flex items-center gap-3">
            <div className="gradient-header flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold text-white shadow-[0_0_20px_rgba(14,165,233,0.4)]">
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
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                  isActive
                    ? 'nav-active shadow-lg'
                    : 'nav-inactive'
                }`}
              >
                <span className="text-base">{link.icon}</span>
                <span className={isActive ? 'text-white' : ''}>{t(link.key)}</span>
                {isActive && <span className="ml-auto h-2 w-2 rounded-full bg-white/70 shadow-[0_0_8px_rgba(255,255,255,0.6)]" />}
              </Link>
            );
          })}
        </nav>
        <div>
          <Link
            href="/settings"
            onClick={() => setOpen(false)}
            className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
              pathname === '/settings'
                ? 'nav-active shadow-lg'
                : 'nav-inactive'
            }`}
          >
            <span className="text-base">⚙️</span>
            <span className={pathname === '/settings' ? 'text-white' : ''}>{t('nav.settings')}</span>
            {pathname === '/settings' && <span className="ml-auto h-2 w-2 rounded-full bg-white/70 shadow-[0_0_8px_rgba(255,255,255,0.6)]" />}
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
