'use client';

import { useEffect, useMemo, useState } from 'react';
import { getMockDashboardData, type Bus } from '@/lib/mock-data';
import { subscribeBusLocationUpdate } from '@/lib/socket';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { BusCard } from '@/components/buses/BusCard';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { useLanguage } from '@/lib/LanguageContext';

const operatorFilters = ['All', 'TNSTC'] as const;

export function BusesBoard() {
  const { t, lang } = useLanguage();
  const { buses: seedBuses } = useMemo(() => getMockDashboardData(), []);
  const [buses, setBuses] = useState<Bus[]>(seedBuses);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOperator, setSelectedOperator] = useState<(typeof operatorFilters)[number]>('All');
  const [savedRoutes, setSavedRoutes] = useState<string[]>([]);

  useEffect(() => {
    const stored = window.localStorage.getItem('tn-bustrack-saved-routes');
    if (stored) {
      setSavedRoutes(JSON.parse(stored) as string[]);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeBusLocationUpdate((payload: Bus[] | { buses: Bus[] }) => {
      const liveBuses = Array.isArray(payload) ? payload : payload.buses;
      if (Array.isArray(liveBuses)) {
        setBuses(liveBuses);
      }
    });

    return unsubscribe;
  }, []);

  const filteredBuses = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return buses.filter((bus) => {
      const matchesSearch =
        !query ||
        bus.number.toLowerCase().includes(query) ||
        bus.route.stops.some((stop) => stop.name.toLowerCase().includes(query));
      const matchesOperator = selectedOperator === 'All' || bus.operator === selectedOperator;
      return matchesSearch && matchesOperator;
    });
  }, [buses, searchTerm, selectedOperator]);

  const runningCount = buses.filter((bus) => bus.status === 'running').length;
  const seatsAvailable = buses.reduce((sum, bus) => sum + bus.seatsAvailable, 0);
  const totalPassengers = buses.reduce((sum, bus) => sum + bus.passengersInside, 0);

  const toggleSavedRoute = (routeId: string) => {
    setSavedRoutes((current) => {
      const next = current.includes(routeId) ? current.filter((id) => id !== routeId) : [...current, routeId];
      window.localStorage.setItem('tn-bustrack-saved-routes', JSON.stringify(next));
      return next;
    });
  };

  return (
    <div className="space-y-5 pb-28 max-sm:space-y-4">
      <div className="gradient-header rounded-3xl p-6 shadow-lg shadow-[var(--shadow-heavy)] max-sm:rounded-2xl max-sm:p-5">
        <div className="gradient-header-text flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-white/80 animate-pulse shadow-[0_0_8px_rgba(255,255,255,0.5)]" />
              <p className="font-orbitron text-[10px] uppercase tracking-[0.3em] text-white/60">{t('buses.liveBuses')}</p>
            </div>
            <div className="flex items-center gap-2">
              <h1 className="mt-2 text-2xl font-bold text-white max-sm:text-xl">{t('buses.title')}</h1>
              <span className="mt-2 rounded-md bg-white/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/80">
                {lang === 'ta' ? 'தமிழ்' : 'EN'}
              </span>
            </div>
            <p className="mt-2 text-sm text-white/70">{t('buses.subtitle')}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            <Card title={t('buses.running')} value={String(runningCount)} compact glow="blue" />
            <Card title={t('buses.seatsOpen')} value={String(seatsAvailable)} compact glow="teal" />
            <Card title={t('passenger.inside')} value={String(totalPassengers)} compact />
            <Card title={t('buses.saved')} value={String(savedRoutes.length)} compact glow="amber" />
          </div>
        </div>
      </div>

      <div className="glass rounded-3xl p-5 shadow-lg shadow-[var(--shadow-heavy)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex-1">
            <Input
              placeholder={t('buses.search')}
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {operatorFilters.map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setSelectedOperator(filter)}
                className={`rounded-full border px-4 py-2 text-xs font-semibold tracking-wider uppercase transition ${
                  selectedOperator === filter
                    ? 'border-[#0EA5E9] bg-[#0EA5E9] text-white shadow-[0_0_16px_rgba(14,165,233,0.3)]'
                    : 'border-[var(--border-subtle)] bg-[var(--bg-primary)]/60 text-[var(--text-secondary)] hover:border-[#0EA5E9]/30 hover:text-[var(--text-primary)]'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {filteredBuses.length === 0 ? (
          <div className="col-span-full rounded-3xl border border-dashed border-[var(--border-subtle)] bg-[var(--bg-secondary)]/50 p-8 text-center max-sm:p-6">
            <p className="text-sm text-[var(--text-muted)]">No buses found matching your search</p>
          </div>
        ) : (
          filteredBuses.map((bus) => (
            <BusCard
              key={bus.id}
              bus={bus}
              isSaved={savedRoutes.includes(bus.routeId)}
              onToggleSaved={toggleSavedRoute}
            />
          ))
        )}
      </div>
    </div>
  );
}
