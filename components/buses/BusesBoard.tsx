'use client';

import { useEffect, useMemo, useState } from 'react';
import { getMockDashboardData, type Bus } from '@/lib/mock-data';
import { subscribeBusLocationUpdate } from '@/lib/socket';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { BusCard } from '@/components/buses/BusCard';
import { useLanguage } from '@/lib/LanguageContext';

const operatorFilters = ['All', 'TNSTC'] as const;

export function BusesBoard() {
  const { t } = useLanguage();
  const { buses: seedBuses } = getMockDashboardData();
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
      <div className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-lg shadow-[var(--shadow)] backdrop-blur max-sm:rounded-2xl max-sm:p-5">
        <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-[#E53935]/8 blur-[80px]" />
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="relative">
            <div className="flex items-center gap-3">
              <span className="live-dot" />
              <p className="font-orbitron text-[10px] uppercase tracking-[0.3em] text-[#E53935]">{t('buses.liveBuses')}</p>
            </div>
            <h1 className="mt-2 text-2xl font-semibold text-[var(--text-primary)] max-sm:text-xl">{t('buses.title')}</h1>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">{t('buses.subtitle')}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            <Card title={t('buses.running')} value={String(runningCount)} compact glow="red" />
            <Card title={t('buses.seatsOpen')} value={String(seatsAvailable)} compact glow="teal" />
            <Card title={t('passenger.inside')} value={String(totalPassengers)} compact />
            <Card title={t('buses.saved')} value={String(savedRoutes.length)} compact glow="gold" />
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5 shadow-lg shadow-[var(--shadow)] backdrop-blur">
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
                    ? 'border-[#E53935] bg-[#E53935] text-white shadow-[0_0_16px_rgba(229,57,53,0.3)]'
                    : 'border-[var(--border-subtle)] bg-[var(--bg-primary)]/60 text-[var(--text-secondary)] hover:border-[#E53935]/30 hover:text-[var(--text-primary)]'
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
