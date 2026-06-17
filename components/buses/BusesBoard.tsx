'use client';

import { useEffect, useMemo, useState } from 'react';
import { subscribeBusLocationUpdate } from '@/lib/socket';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useLanguage } from '@/lib/LanguageContext';

interface LiveBus {
  id: string;
  number: string;
  routeName: string;
  currentStop: string;
  status: 'running' | 'delayed' | 'stopped';
  speed: number;
  latitude: number;
  longitude: number;
  seatsAvailable: number;
  seatCapacity: number;
  inside: number;
}

function normalize(raw: any): LiveBus {
  return {
    id: raw.busId || raw.id,
    number: raw.busNumber || raw.number || raw.busId || 'Unknown',
    routeName: raw.route || raw.routeName || 'Unknown',
    currentStop: raw.currentStop || '',
    status: raw.status || (raw.speed > 0 ? 'running' : 'stopped'),
    speed: raw.speed || 0,
    latitude: raw.lat ?? raw.latitude ?? 0,
    longitude: raw.lng ?? raw.longitude ?? 0,
    seatsAvailable: raw.seats ?? raw.seatsAvailable ?? 0,
    seatCapacity: raw.seatCapacity ?? raw.totalSeats ?? 42,
    inside: raw.inside ?? raw.passengersInside ?? 0,
  };
}

export function BusesBoard() {
  const { t, lang } = useLanguage();
  const [buses, setBuses] = useState<LiveBus[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchBuses();
    const unsub = subscribeBusLocationUpdate((payload: any) => {
      const raw = Array.isArray(payload) ? payload : [payload];
      if (Array.isArray(raw)) setBuses(raw.map(normalize));
    });
    return unsub;
  }, []);

  async function fetchBuses() {
    try {
      const res = await fetch('/api/buses');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setBuses(data.map(normalize));
      }
    } catch (_) {}
  }

  const filteredBuses = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return q ? buses.filter(b => b.number.toLowerCase().includes(q) || b.routeName.toLowerCase().includes(q)) : buses;
  }, [buses, searchTerm]);

  const runningCount = buses.filter(b => b.status === 'running').length;
  const seatsAvailable = buses.reduce((sum, b) => sum + b.seatsAvailable, 0);
  const totalPassengers = buses.reduce((sum, b) => sum + b.inside, 0);

  return (
    <div className="space-y-5 pb-28 max-sm:space-y-4">
      <div className="gradient-header rounded-3xl p-6 shadow-lg shadow-[var(--shadow-heavy)] max-sm:rounded-2xl max-sm:p-5">
        <div className="gradient-header-text flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-orbitron text-[10px] uppercase tracking-[0.3em] text-white/60">{t('buses.liveBuses')}</p>
            <h1 className="mt-2 text-2xl font-bold text-white max-sm:text-xl">{t('buses.title')}</h1>
            <p className="mt-2 text-sm text-white/70">{t('buses.subtitle')}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Card title={t('buses.running')} value={String(runningCount)} compact glow="blue" />
            <Card title={t('buses.seatsOpen')} value={String(seatsAvailable)} compact glow="teal" />
            <Card title={t('passenger.inside')} value={String(totalPassengers)} compact />
          </div>
        </div>
      </div>

      <div className="glass rounded-3xl p-5 shadow-lg shadow-[var(--shadow-heavy)]">
        <Input
          placeholder={t('buses.search')}
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {filteredBuses.length === 0 ? (
          <div className="col-span-full rounded-3xl border border-dashed border-[var(--border-subtle)] bg-[var(--bg-secondary)]/50 p-8 text-center max-sm:p-6">
            <p className="text-sm text-[var(--text-muted)]">
              {searchTerm ? 'No buses found' : 'No buses active. Set up a bus in /setup'}
            </p>
          </div>
        ) : (
          filteredBuses.map((bus) => (
            <div key={bus.id} className="rounded-2xl border border-white/20 bg-white/70 p-4 shadow-lg backdrop-blur-xl border-l-4 border-l-[#22C55E]">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#22C55E]" />
                <span className="text-xs font-semibold text-[var(--text-secondary)]">{bus.number}</span>
              </div>
              <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">{bus.routeName}</p>
              <div className="mt-3 grid grid-cols-3 gap-3">
                <div>
                  <p className="text-[9px] uppercase text-[var(--text-muted)]">வேகம்</p>
                  <p className="font-jetbrains text-sm font-bold">{bus.speed} km/h</p>
                </div>
                <div>
                  <p className="text-[9px] uppercase text-[var(--text-muted)]">இருக்கைகள்</p>
                  <p className="font-jetbrains text-sm font-bold">{bus.seatsAvailable}/{bus.seatCapacity}</p>
                </div>
                <div>
                  <p className="text-[9px] uppercase text-[var(--text-muted)]">உள்ளே</p>
                  <p className="font-jetbrains text-sm font-bold">{bus.inside}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
