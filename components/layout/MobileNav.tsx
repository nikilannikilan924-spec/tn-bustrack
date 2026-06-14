"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/lib/LanguageContext';

const links: { href: string; key: string; icon: string }[] = [
  { href: '/dashboard', key: 'nav.buses', icon: '🚌' },
  { href: '/nearby', key: 'nav.nearby', icon: '📡' },
  { href: '/stops', key: 'nav.stops', icon: '📍' },
  { href: '/map', key: 'nav.map', icon: '🗺️' },
  { href: '/favorites', key: 'nav.saved', icon: '⭐' },
  { href: '/alerts', key: 'nav.alerts', icon: '🔔' }
];

export default function MobileNav() {
  const pathname = usePathname();
  const { t } = useLanguage();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      <div className="mx-3 mb-3 rounded-2xl border border-white/20 bg-white/80 px-2 py-1.5 shadow-2xl shadow-[var(--shadow-heavy)] backdrop-blur-xl">
        <div className="flex items-center justify-between gap-0.5 overflow-x-auto">
          {links.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href as string}
                className={`flex flex-col items-center gap-0.5 rounded-xl px-3 py-2 text-[10px] font-semibold transition-all ${
                  isActive
                    ? 'nav-active shadow-lg'
                    : 'nav-inactive'
                }`}
              >
                <span className={`text-lg ${isActive ? 'drop-shadow-sm' : ''}`}>{link.icon}</span>
                <span>{t(link.key)}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
