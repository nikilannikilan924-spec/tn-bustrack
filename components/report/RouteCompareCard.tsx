'use client';

import { useMemo, useState } from 'react';
import type { Bus } from '@/lib/mock-data';
import { useLanguage } from '@/lib/LanguageContext';
import { findRouteOptions, getSmartSuggestion } from '@/lib/routeCompare';

interface RouteCompareCardProps {
  buses: Bus[];
  allStopNames: string[];
}

export function RouteCompareCard({ buses, allStopNames }: RouteCompareCardProps) {
  const { t } = useLanguage();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [showFromSuggest, setShowFromSuggest] = useState(false);
  const [showToSuggest, setShowToSuggest] = useState(false);

  const fromSuggestions = useMemo(() => {
    if (!from.trim()) return [];
    return allStopNames.filter(n => n.toLowerCase().includes(from.toLowerCase())).slice(0, 6);
  }, [from, allStopNames]);

  const toSuggestions = useMemo(() => {
    if (!to.trim()) return [];
    return allStopNames.filter(n => n.toLowerCase().includes(to.toLowerCase())).slice(0, 6);
  }, [to, allStopNames]);

  const options = useMemo(() => {
    if (!from || !to || from === to) return [];
    return findRouteOptions(from, to, buses);
  }, [from, to, buses]);

  const suggestion = useMemo(() => getSmartSuggestion(options), [options]);

  return (
    <div className="rounded-3xl border border-[var(--border)] bg-white/80 p-5 shadow-lg shadow-[var(--shadow-heavy)] backdrop-blur">
      <h3 className="font-orbitron text-[10px] uppercase tracking-[0.3em] text-[var(--text-secondary)] mb-4">
        Route Compare
      </h3>

      <div className="relative mb-2">
        <input
          value={from}
          onChange={e => { setFrom(e.target.value); setShowFromSuggest(true); }}
          onFocus={() => setShowFromSuggest(true)}
          onBlur={() => setTimeout(() => setShowFromSuggest(false), 200)}
          placeholder="From stop..."
          className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0097A7]/20"
        />
        {showFromSuggest && fromSuggestions.length > 0 && (
          <div className="absolute z-20 mt-1 w-full rounded-2xl border border-[var(--border)] bg-white p-2 shadow-xl">
            {fromSuggestions.map(n => (
              <button key={n} onMouseDown={() => { setFrom(n); setShowFromSuggest(false); }} className="block w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-[var(--overlay-hover)]">{n}</button>
            ))}
          </div>
        )}
      </div>

      <div className="relative mb-4">
        <input
          value={to}
          onChange={e => { setTo(e.target.value); setShowToSuggest(true); }}
          onFocus={() => setShowToSuggest(true)}
          onBlur={() => setTimeout(() => setShowToSuggest(false), 200)}
          placeholder="To stop..."
          className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0097A7]/20"
        />
        {showToSuggest && toSuggestions.length > 0 && (
          <div className="absolute z-20 mt-1 w-full rounded-2xl border border-[var(--border)] bg-white p-2 shadow-xl">
            {toSuggestions.map(n => (
              <button key={n} onMouseDown={() => { setTo(n); setShowToSuggest(false); }} className="block w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-[var(--overlay-hover)]">{n}</button>
            ))}
          </div>
        )}
      </div>

      {suggestion && (
        <div className="mb-3 rounded-2xl bg-[#0097A7]/10 border border-[#0097A7]/20 p-3">
          <p className="text-xs font-medium text-[#0097A7]">💡 {suggestion.message}</p>
        </div>
      )}

      <div className="space-y-2 max-h-60 overflow-y-auto">
        {options.length === 0 && from && to && (
          <p className="text-center text-sm text-[var(--text-muted)] py-4">No direct routes found between these stops.</p>
        )}
        {options.slice(0, 5).map(opt => (
          <div key={opt.bus.id} className="flex items-center justify-between rounded-2xl bg-[var(--bg-secondary)] p-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[var(--text-primary)]">{opt.route.number} — Bus {opt.bus.number}</p>
              <p className="text-[10px] text-[var(--text-muted)]">{opt.stopsToTravel} stops • {opt.totalDistanceKm} km</p>
            </div>
            <div className="text-right shrink-0 ml-3">
              <p className="font-jetbrains text-sm font-bold text-[var(--text-primary)]">{opt.estimatedMinutes} min</p>
              <p className="font-jetbrains text-[10px] text-[var(--text-muted)]">{opt.confidence}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
