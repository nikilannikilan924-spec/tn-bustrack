'use client';

import { useEffect, useState, useMemo } from 'react';
import { getMockDashboardData, type Bus } from '@/lib/mock-data';
import { subscribeBusLocationUpdate } from '@/lib/socket';
import { useLanguage } from '@/lib/LanguageContext';
import { AdminStatCard } from '@/components/admin/AdminStatCard';
import { AdminActivityFeed } from '@/components/admin/AdminActivityFeed';
import { AdminBusTable } from '@/components/admin/AdminBusTable';

export default function AdminDashboard() {
  const { t } = useLanguage();
  const { buses: seedBuses, routes, alerts } = getMockDashboardData();
  const [buses, setBuses] = useState<Bus[]>(seedBuses);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeBusLocationUpdate((payload: Bus[] | { buses: Bus[] }) => {
      const liveBuses = Array.isArray(payload) ? payload : payload.buses;
      if (Array.isArray(liveBuses)) setBuses(liveBuses);
    });
    return unsubscribe;
  }, []);

  const activeBuses = buses.filter((b) => b.status === 'running').length;
  const delayedBuses = buses.filter((b) => b.status === 'delayed');
  const totalPassengers = buses.reduce((s, b) => s + b.passengersInside, 0);
  const avgSeatsPct = Math.round(
    buses.reduce((s, b) => s + (b.seatsAvailable / b.seatCapacity) * 100, 0) / buses.length
  );

  const navItems = [
    { icon: '🗺', label: 'Live Map', href: '/map', badge: undefined, active: false },
    { icon: '📊', label: 'Dashboard', href: '/admin', badge: undefined, active: true },
    { icon: '🚌', label: 'Buses', href: '/dashboard', badge: String(buses.length), active: false },
    { icon: '🛣', label: 'Routes', href: '#', badge: String(routes.length), active: false },
    { icon: '🔔', label: 'Alerts', href: '/alerts', badge: String(alerts.length), active: false },
    { icon: '⚙️', label: 'Settings', href: '/settings', badge: undefined, active: false },
  ];

  return (
    <div className="radar-grid min-h-screen">
      {/* ── TOP NAVBAR ── */}
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
              <path d="M20 2L4 12v16l16 10 16-10V12L20 2z" fill="#E53935" />
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

      {/* ── SIDEBAR ── */}
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

      {/* ── MAIN CONTENT ── */}
      <main
        className={`min-h-screen pt-16 transition-all duration-300 ${
          sidebarOpen ? 'pl-56' : 'pl-16'
        }`}
      >
        <div className="p-6">
          {/* Page title */}
          <div className="mb-8">
            <h2 className="font-orbitron text-2xl font-bold uppercase tracking-[0.1em] text-[#F0F4FF]">
              Command Center
            </h2>
            <p className="mt-1 text-sm text-[#8892A4]">
              Real-time Tamil Nadu Bus Network
              <span className="mx-2 inline-block h-3 w-px bg-[#8892A4]/30" />
              <span className="font-tamil text-xs">தமிழ்நாடு பேருந்து வலையமைப்பு</span>
            </p>
            <div className="mt-3 h-0.5 w-24 rounded-full bg-red-500 shadow-[0_0_12px_rgba(229,57,53,0.5)]" />
          </div>

          {/* ROW 1 — Stat cards */}
          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <AdminStatCard
              icon="🚌"
              value={activeBuses}
              label="Buses Active"
              trend="3 from yesterday"
              trendUp
              accent="teal"
              subtext="LIVE"
            />
            <AdminStatCard
              icon="👥"
              value={totalPassengers}
              label="Today's Passengers"
              trend="8% from yesterday"
              trendUp
              accent="gold"
              suffix=""
            />
            <AdminStatCard
              icon="⚠️"
              value={delayedBuses.length}
              label="Buses Delayed"
              trend={delayedBuses.map((b) => b.route.number).join(', ') || 'None'}
              trendUp={false}
              accent="red"
              subtext={delayedBuses.length ? 'ACTION NEEDED' : undefined}
            />
            <AdminStatCard
              icon="💺"
              value={avgSeatsPct}
              label="Seats Available"
              trend="Network average"
              trendUp
              accent="green"
              suffix="%"
            />
          </div>

          {/* ROW 2 — Map + Activity */}
          <div className="mb-6 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
            {/* Map preview */}
            <div className="rounded-2xl border border-white/5 bg-[#1A2235] p-5">
              <div className="mb-4 flex items-center gap-2">
                <span className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
                <h3 className="font-orbitron text-xs font-semibold uppercase tracking-[0.2em] text-[#F0F4FF]">
                  Live Bus Positions
                </h3>
                <span className="ml-auto font-jetbrains text-[10px] text-[#8892A4]">
                  Refreshing every 5s
                </span>
              </div>
              <div className="relative flex h-[320px] items-center justify-center overflow-hidden rounded-xl bg-[#0A0F1E]">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative h-full w-full">
                    <img
                      src={`https://cartodb-basemaps-a.global.ssl.fastly.net/dark_matter/10/550/375.png`}
                      alt="Map"
                      className="h-full w-full object-cover opacity-40"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1A2235] via-transparent to-transparent" />
                    {/* Bus dots overlay */}
                    {buses.map((bus) => (
                      <div
                        key={bus.id}
                        className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full"
                        style={{
                          left: `${((bus.longitude + 180) / 360) * 100}%`,
                          top: `${((90 - bus.latitude) / 180) * 100}%`,
                          background: bus.status === 'running' ? '#00BCD4' : bus.status === 'delayed' ? '#E53935' : '#FFB300',
                          boxShadow: `0 0 8px ${bus.status === 'running' ? 'rgba(0,188,212,0.7)' : bus.status === 'delayed' ? 'rgba(229,57,53,0.7)' : 'rgba(255,179,0,0.7)'}`,
                          animation: bus.status === 'running' ? 'pulse-dot 2s infinite' : 'none'
                        }}
                      />
                    ))}
                  </div>
                </div>
                <p className="relative z-10 text-xs text-[#8892A4]">
                  {buses.length} buses • {routes.length} routes
                </p>
              </div>
            </div>

            {/* Activity feed */}
            <AdminActivityFeed />
          </div>

          {/* ROW 3 — Bus Table + Charts */}
          <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
            <AdminBusTable />

            {/* Alerts panel */}
            <div className="rounded-2xl border border-white/5 bg-[#1A2235] p-5">
              <div className="mb-4 flex items-center gap-2">
                <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
                <h3 className="font-orbitron text-xs font-semibold uppercase tracking-[0.2em] text-[#F0F4FF]">Active Alerts</h3>
              </div>
              <div className="space-y-2">
                {alerts.slice(0, 4).map((alert) => (
                  <div
                    key={alert.id}
                    className="rounded-xl border border-white/5 bg-[#111827] p-3 transition hover:bg-[#0A0F1E]"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          alert.severity === 'CRITICAL'
                            ? 'bg-red-500'
                            : alert.severity === 'WARNING'
                              ? 'bg-yellow-400'
                              : 'bg-cyan-400'
                        }`}
                      />
                      <span className="text-xs font-semibold uppercase tracking-wider text-[#8892A4]">
                        {alert.severity}
                      </span>
                      <span className="ml-auto font-jetbrains text-[10px] text-[#8892A4]">
                        {new Date(alert.createdAt).toLocaleTimeString('en-IN', { hour12: false })}
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-medium text-[#F0F4FF]">{alert.title}</p>
                    <p className="mt-0.5 text-xs text-[#8892A4]">{alert.message}</p>
                  </div>
                ))}
                <a
                  href="/alerts"
                  className="mt-2 block rounded-xl border border-dashed border-white/10 bg-transparent py-2 text-center text-xs font-medium text-[#8892A4] transition hover:border-cyan-400/30 hover:text-cyan-400"
                >
                  View all alerts →
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
