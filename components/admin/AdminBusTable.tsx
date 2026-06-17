'use client';

import { useEffect, useMemo, useState } from 'react';
import { subscribeBusLocationUpdate } from '@/lib/socket';
import { fetchBuses, fetchStops, normalizeAPIBus } from '@/lib/types';
import type { Bus } from '@/lib/types';
import Link from 'next/link';

const statusBadge: Record<Bus['status'], { label: string; style: string }> = {
  running: { label: 'MOVING', style: 'bg-cyan-400/20 text-cyan-400 border-cyan-400/30 animate-pulse' },
  delayed: { label: 'DELAYED', style: 'bg-red-500/20 text-red-500 border-red-500/30 pulse-red' },
  stopped: { label: 'STOPPED', style: 'bg-yellow-300/20 text-yellow-300 border-yellow-300/30' }
};

export function AdminBusTable() {
  const [buses, setBuses] = useState<Bus[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Bus['status'] | 'all'>('all');

  useEffect(() => {
    fetchStops().then(async allStops => {
      const apiBuses = await fetchBuses(allStops);
      setBuses(apiBuses);
    });
  }, []);

  useEffect(() => {
    fetchStops().then(allStops => {
      const unsubscribe = subscribeBusLocationUpdate((payload: any) => {
        const raw = Array.isArray(payload) ? payload : [payload];
        const live = raw.map(b => normalizeAPIBus(b, allStops));
        setBuses(live);
      });
      return unsubscribe;
    });
  }, []);

  const filtered = useMemo(() => {
    return buses.filter((b) => {
      const matchSearch = !search || b.number.toLowerCase().includes(search.toLowerCase()) || b.route.number.toLowerCase().includes(search.toLowerCase());
      const matchFilter = filter === 'all' || b.status === filter;
      return matchSearch && matchFilter;
    });
  }, [buses, search, filter]);

  const seatPct = (bus: Bus) => Math.round((bus.passengersInside / bus.seatCapacity) * 100);
  const seatBarColor = (pct: number) =>
    pct > 70 ? 'bg-red-500' : pct > 40 ? 'bg-yellow-400' : 'bg-green-400';

  return (
    <div className="rounded-2xl border border-white/5 bg-[#1A2235] p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h3 className="font-orbitron text-xs font-semibold uppercase tracking-[0.2em] text-[#F0F4FF]">Fleet Management</h3>
          <span className="rounded-full bg-[#111827] px-2 py-0.5 text-[10px] text-[#8892A4]">
            {buses.filter((b) => b.status === 'running').length} Active • {buses.filter((b) => b.status !== 'running').length} Inactive
          </span>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Search bus or route..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-36 rounded-lg border border-white/10 bg-[#111827] px-3 py-1.5 text-xs text-[#F0F4FF] placeholder-[#8892A4] outline-none focus:border-cyan-400/50 lg:w-44"
          />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as Bus['status'] | 'all')}
            className="rounded-lg border border-white/10 bg-[#111827] px-2 py-1.5 text-xs text-[#F0F4FF] outline-none focus:border-cyan-400/50"
          >
            <option value="all">All</option>
            <option value="running">Moving</option>
            <option value="delayed">Delayed</option>
            <option value="stopped">Stopped</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        {filtered.slice(0, 8).map((bus) => {
          const pct = seatPct(bus);
          return (
            <Link
              key={bus.id}
              href={`/bus/${bus.id}`}
              className="flex items-center gap-4 rounded-xl bg-[#111827] p-3 transition hover:bg-[#0A0F1E] hover:shadow-[0_0_15px_rgba(0,188,212,0.1)]"
            >
              <span className="text-lg">🚌</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-jetbrains text-sm font-semibold text-[#F0F4FF]">{bus.number.split(' ').pop()}</span>
                  <span className="text-xs text-[#8892A4]">Route {bus.route.number}</span>
                </div>
                <p className="mt-0.5 truncate text-xs text-[#8892A4]">
                  {bus.route.origin} → {bus.route.destination}
                </p>
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#0A0F1E]">
                    <div className={`h-full rounded-full transition-all ${seatBarColor(pct)}`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="font-jetbrains text-[10px] text-[#8892A4]">{bus.seatsAvailable}/{bus.seatCapacity}</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${statusBadge[bus.status].style}`}>
                  {statusBadge[bus.status].label}
                </span>
                <span className="font-jetbrains text-xs text-[#8892A4]">{bus.speed} km/h</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
