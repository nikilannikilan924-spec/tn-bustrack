"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/lib/LanguageContext';
import { HomeIcon, BusIcon, NearbyIcon, MapIcon, BellIcon, HelpIcon, GearIcon } from '@/components/ui/Icons';

const iconMap: Record<string, React.ReactNode> = {
  '/': <HomeIcon size={18} />,
  '/dashboard': <BusIcon size={18} />,
  '/nearby': <NearbyIcon size={18} />,
  '/map': <MapIcon size={18} />,
  '/alerts': <BellIcon size={18} />,
  '/how': <HelpIcon size={18} />,
  '/setup': <GearIcon size={18} />
};

const links: { href: string; key: string }[] = [
  { href: '/', key: 'app.name' },
  { href: '/dashboard', key: 'nav.buses' },
  { href: '/nearby', key: 'nav.nearby' },
  { href: '/map', key: 'nav.map' },
  { href: '/alerts', key: 'nav.alerts' },
  { href: '/how', key: 'nav.how' },
  { href: '/setup', key: 'nav.setup' }
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
                <span className={isActive ? 'drop-shadow-sm' : ''}>{iconMap[link.href]}</span>
                <span>{t(link.key)}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
