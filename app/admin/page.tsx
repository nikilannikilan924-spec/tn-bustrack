'use client';

import { useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { subscribeBusLocationUpdate } from '@/lib/socket';
import { fetchBuses, fetchStops, fetchAlerts, normalizeAPIBus } from '@/lib/types';
import type { Bus, Alert, Stop } from '@/lib/types';
import { useLanguage } from '@/lib/LanguageContext';
import { AdminStatCard } from '@/components/admin/AdminStatCard';
import { AdminMapPreview } from '@/components/admin/AdminMapPreview';
import { AdminAlertPanel } from '@/components/admin/AdminAlertPanel';
import { AdminReportPanel } from '@/components/admin/AdminReportPanel';

const AdminActivityFeed = dynamic(() => import('@/components/admin/AdminActivityFeed').then(m => ({ default: m.AdminActivityFeed })), { ssr: false });
const AdminBusTable = dynamic(() => import('@/components/admin/AdminBusTable').then(m => ({ default: m.AdminBusTable })), { ssr: false });

export default function AdminDashboard() {
  const { t } = useLanguage();
  const [buses, setBuses] = useState<Bus[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [stops, setStops] = useState<Stop[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    fetchAlerts().then(setAlerts);
    fetchStops().then(async allStops => {
      setStops(allStops);
      const apiBuses = await fetchBuses(allStops);
      setBuses(apiBuses);
      setLoaded(true);
    });
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (stops.length === 0) return;
    const unsubscribe = subscribeBusLocationUpdate((payload: any) => {
      const raw = Array.isArray(payload) ? payload : [payload];
      const live = raw.map(b => normalizeAPIBus(b, stops));
      setBuses(live);
      setLoaded(true);
    });
    return unsubscribe;
  }, [stops]);

  const routeCount = new Set(stops.map(s => s.routeId).filter(Boolean)).size;
  const activeBuses = buses.filter((b) => b.status === 'running').length;
  const delayedBuses = buses.filter((b) => b.status === 'delayed');
  const totalPassengers = buses.reduce((s, b) => s + b.passengersInside, 0);
  const avgSeatsPct = buses.length > 0 ? Math.round(
    buses.reduce((s, b) => s + (b.seatsAvailable / b.seatCapacity) * 100, 0) / buses.length
  ) : 0;

  const navItems = [
    { icon: '🗺', label: 'Live Map', href: '/map', badge: undefined, active: false },
    { icon: '📊', label: 'Dashboard', href: '/admin', badge: undefined, active: true },
    { icon: '🚌', label: 'Buses', href: '/dashboard', badge: String(buses.length), active: false },
    { icon: '🛣', label: 'Routes', href: '#', badge: String(routeCount), active: false },
    { icon: '🔔', label: 'Alerts', href: '/alerts', badge: String(alerts.length), active: false },
    { icon: '⚙️', label: 'Settings', href: '/settings', badge: undefined, active: false },
  ];

  return (
    <div className="radar-grid min-h-screen">
      <header className="glass-nav fixed left-0 right-0 top-0 z-50 flex h-16 items-center justify-between border-b border-red-500/20 px-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="rounded-lg p-1.5 text-[#8892A4] transition hover:bg-white/5 hover:text-white"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-center gap-3">
            <svg viewBox="0 0 40 40" className="h-8 w-8">
              <path d="M20 2L4 12v16l16 10 16-10V12L20 2z" fill="#0EA5E9" />
              <path d="M20 6L8 14v12l12 8 12-8V14L20 6z" fill="#FFB300" />
              <circle cx="20" cy="20" r="4" fill="#0A0F1E" />
            </svg>
            <div>
              <h1 className="font-orbitron text-sm font-bold uppercase tracking-wider text-[#F0F4FF]">TN Bus Tracker</h1>
              <p className="font-tamil text-[10px] text-[#8892A4]">தமிழ்நாடு பேருந்து கண்காணிப்பு</p>
            </div>
          </div>
        </div>

        <div className="hidden items-center gap-6 md:flex">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-green-400 shadow-[0_0_8px_rgba(0,230,118,0.7)]" />
            <span className="font-jetbrains text-sm text-cyan-400">
              {time.toLocaleTimeString('en-IN', { hour12: false })}
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-green-400/20 bg-green-400/5 px-3 py-1.5">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-green-400">All Systems Operational</span>
          </div>
          <button className="relative rounded-lg p-1.5 text-[#8892A4] transition hover:bg-white/5 hover:text-white">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white">
              {alerts.length}
            </span>
          </button>
        </div>
      </header>

      <aside
        className={`fixed left-0 top-16 z-40 h-[calc(100vh-64px)] border-r border-white/5 bg-[#111827] transition-all duration-300 ${
          sidebarOpen ? 'w-56' : 'w-16'
        } overflow-hidden`}
      >
        <nav className="mt-4 space-y-1 px-2">
          {navItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                item.active
                  ? 'border-l-[3px] border-red-500 bg-gradient-to-r from-red-500/10 to-transparent text-white'
                  : 'text-[#8892A4] hover:bg-white/5 hover:text-white'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              {sidebarOpen && (
                <>
                  <span className="flex-1 text-xs font-medium">{item.label}</span>
                  {item.badge && (
                    <span className="flex h-5 items-center rounded-full bg-[#0A0F1E] px-2 text-[10px] font-semibold text-[#8892A4]">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </a>
          ))}
        </nav>

        {sidebarOpen && (
          <div className="absolute bottom-4 left-3 right-3 space-y-2 rounded-xl bg-[#0A0F1E] p-3">
            <p className="flex items-center gap-2 text-xs text-[#8892A4]">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" /> {activeBuses} Buses Online
            </p>
            <p className="flex items-center gap-2 text-xs text-[#8892A4]">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500" /> {delayedBuses.length} Routes Delayed
            </p>
            <p className="flex items-center gap-2 text-xs text-[#8892A4]">
              <span className="h-1.5 w-1.5 rounded-full bg-yellow-400" /> {totalPassengers.toLocaleString()} Passengers
            </p>
          </div>
        )}
      </aside>

      <main
        className={`min-h-screen pt-16 transition-all duration-300 ${
          sidebarOpen ? 'pl-56' : 'pl-16'
        }`}
      >
        <div className="p-6">
          <div className="mb-8">
            <h2 className="font-orbitron text-2xl font-bold uppercase tracking-[0.1em] text-[#F0F4FF]">
              Command Center
            </h2>
            <p className="mt-1 text-sm text-[#8892A4]">
              Real-time Tamil Nadu Bus Network
              <span className="mx-2 inline-block h-3 w-px bg-[#8892A4]/30" />
              <span className="font-tamil text-xs">தமிழ்நாடு பேருந்து வலையமைப்பு</span>
            </p>
            <div className="mt-3 h-0.5 w-24 rounded-full bg-[#0EA5E9] shadow-[0_0_12px_rgba(14,165,233,0.5)]" />
          </div>

          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <AdminStatCard icon="🚌" value={activeBuses} label="Buses Active" trend="3 from yesterday" trendUp accent="teal" subtext="LIVE" />
            <AdminStatCard icon="👥" value={totalPassengers} label="Today's Passengers" trend="8% from yesterday" trendUp accent="gold" suffix="" />
            <AdminStatCard icon="⚠️" value={delayedBuses.length} label="Buses Delayed" trend={delayedBuses.map((b) => b.route.number).join(', ') || 'None'} trendUp={false} accent="blue" subtext={delayedBuses.length ? 'ACTION NEEDED' : undefined} />
            <AdminStatCard icon="💺" value={avgSeatsPct} label="Seats Available" trend="Network average" trendUp accent="green" suffix="%" />
          </div>

          <div className="mb-6 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
            <AdminMapPreview buses={buses} routesCount={routeCount} />
            <AdminActivityFeed />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr_1fr]">
            <AdminBusTable />
            <AdminAlertPanel alerts={alerts} />
            <AdminReportPanel />
          </div>
        </div>
      </main>
    </div>
  );
}
