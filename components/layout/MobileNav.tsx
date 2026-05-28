"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/lib/LanguageContext';

const links: { href: string; key: string; icon: string }[] = [
  { href: '/dashboard', key: 'nav.buses', icon: '🚌' },
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
      <div className="mx-3 mb-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-primary)]/95 px-3 py-2 shadow-2xl shadow-[var(--shadow-heavy)] backdrop-blur-xl">
        <div className="flex items-center justify-between gap-1 overflow-x-auto">
          {links.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href as string}
                className={`flex flex-col items-center gap-0.5 rounded-xl px-3 py-2 text-[10px] font-medium transition ${
                  isActive
                    ? 'bg-[#E53935]/15 text-[#E53935]'
                    : 'text-[var(--text-secondary)] hover:bg-black/[0.04] hover:text-[var(--text-primary)]'
                }`}
              >
                <span className="text-lg">{link.icon}</span>
                <span>{t(link.key)}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
