'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { subscribeBusLocationUpdate } from '@/lib/socket';
import { fetchBuses, fetchStops, normalizeAPIBus } from '@/lib/types';
import type { Bus, Stop } from '@/lib/types';
import { useLanguage } from '@/lib/LanguageContext';
import { findNearbyStops, type NearbyStop, getCrowdednessColor } from '@/lib/nearby';
import { haversineKm, formatKm } from '@/lib/distance';

export default function NearbyPage() {
  const { t } = useLanguage();
  const [buses, setBuses] = useState<Bus[]>([]);
  const [stops, setStops] = useState<Stop[]>([]);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [radius, setRadius] = useState(50);

  useEffect(() => {
    let doneStops = false;
    let doneGeo = false;
    function tryDone() {
      if (doneStops && doneGeo) setLoading(false);
    }

    fetchStops().then(async allStops => {
      setStops(allStops);
      const apiBuses = await fetchBuses(allStops);
      setBuses(apiBuses);
      doneStops = true;
      tryDone();
    });

    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      doneGeo = true;
      tryDone();
    } else {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          doneGeo = true;
          tryDone();
        },
        (err) => {
          setError(err.message + '. You can enter coordinates below.');
          doneGeo = true;
          tryDone();
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeBusLocationUpdate((payload: any) => {
      if (Array.isArray(payload)) {
        setBuses(payload.map(b => normalizeAPIBus(b, stops)));
      } else {
        setBuses(prev => {
          const updated = normalizeAPIBus(payload, stops);
          const idx = prev.findIndex(b => b.id === updated.id);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = updated;
            return next;
          }
          return [...prev, updated];
        });
      }
    });
    return unsubscribe;
  }, [stops]);

  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');

  const nearbyStops: NearbyStop[] = useMemo(() => {
    if (!location) return [];
    return findNearbyStops(location.lat, location.lng, stops, buses, radius);
  }, [location, stops, buses, radius]);

  const nearbyBuses = useMemo(() => {
    if (!location || buses.length === 0) return [];
    return buses
      .map(b => ({
        bus: b,
        distKm: haversineKm(location.lat, location.lng, b.latitude, b.longitude),
      }))
      .filter(x => x.distKm <= radius)
      .sort((a, b) => a.distKm - b.distKm);
  }, [location, buses, radius]);

  const handleRefresh = useCallback(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setError(null); },
      (err) => setError(err.message),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  function useManualLocation() {
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);
    if (!isNaN(lat) && !isNaN(lng)) {
      setLocation({ lat, lng });
      setError(null);
    }
  }

  return (
    <div className="space-y-5 pb-28 max-sm:space-y-4">
      <div className="gradient-header rounded-3xl p-6 shadow-lg shadow-[var(--shadow-heavy)] max-sm:rounded-2xl max-sm:p-5">
        <div className="gradient-header-text">
          <p className="font-orbitron text-[10px] uppercase tracking-[0.3em] text-white/60">
            {t('nav.nearby')}
          </p>
          <h1 className="mt-2 text-2xl font-bold text-white max-sm:text-xl">
            {t('nearby.title')}
          </h1>
          <p className="mt-2 text-sm text-white/70">
            {t('nearby.subtitle')}
          </p>
        </div>
      </div>

      {loading && (
        <div className="rounded-3xl border border-dashed border-[var(--border-subtle)] bg-white/50 p-12 text-center backdrop-blur">
          <div className="animate-pulse space-y-3">
            <div className="mx-auto h-8 w-8 rounded-full bg-[#0EA5E9]/20" />
            <p className="text-sm text-[var(--text-secondary)]">{t('nearby.fetching')}</p>
          </div>
        </div>
      )}

      {!location && !loading && (
        <div className="rounded-3xl border border-dashed border-[var(--border-subtle)] bg-white/50 p-6 text-center backdrop-blur">
          <p className="mb-2 text-lg">📍</p>
          <p className="text-sm font-medium text-[var(--text-primary)]">{t('nearby.error')}</p>
          {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
          <div className="mx-auto mt-4 flex max-w-xs gap-2">
            <input value={manualLat} onChange={e => setManualLat(e.target.value)} placeholder="Latitude"
              className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-xs outline-none" />
            <input value={manualLng} onChange={e => setManualLng(e.target.value)} placeholder="Longitude"
              className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-xs outline-none" />
          </div>
          <div className="mt-3 flex justify-center gap-2">
            <button onClick={useManualLocation}
              className="rounded-xl bg-[#0EA5E9] px-5 py-2 text-xs font-semibold text-white hover:bg-[#0284C7]">
              Set Location
            </button>
            <button onClick={handleRefresh}
              className="rounded-xl bg-[var(--overlay-hover)] px-5 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:bg-black/10">
              {t('nearby.retry')}
            </button>
          </div>
        </div>
      )}

      {location && !loading && (
        <>
          <div className="flex items-center justify-between gap-4 rounded-3xl border border-[var(--border)] bg-white/80 p-4 shadow-lg shadow-[var(--shadow-heavy)] backdrop-blur max-sm:flex-col max-sm:items-stretch">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0EA5E9]/10 text-lg">
                📡
              </span>
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  {t('nearby.yourLocation')}
                </p>
                <p className="font-jetbrains text-[10px] text-[var(--text-muted)]">
                  {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                </p>
                <p className="font-jetbrains text-[9px] text-[var(--text-muted)]">
                  {buses.length} bus{buses.length !== 1 ? 'es' : ''} in system
                  {nearbyBuses.length > 0 && ` · ${nearbyBuses.length} within ${radius}km`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-[0.1em] text-[var(--text-muted)]">
                  {t('nearby.radius')}
                </span>
                <select
                  value={radius}
                  onChange={(e) => setRadius(Number(e.target.value))}
                  className="rounded-xl border border-[var(--border)] bg-white/80 px-3 py-2 text-sm font-medium text-[var(--text-primary)]"
                >
                  <option value={1}>1 km</option>
                  <option value={5}>5 km</option>
                  <option value={10}>10 km</option>
                  <option value={25}>25 km</option>
                  <option value={50}>50 km</option>
                  <option value={100}>100 km</option>
                </select>
              </div>
              <button
                type="button"
                onClick={handleRefresh}
                className="rounded-xl bg-[#0EA5E9]/10 px-4 py-2 text-sm font-semibold text-[#0EA5E9] transition hover:bg-[#0EA5E9]/20"
              >
                {t('nearby.refresh')}
              </button>
            </div>
          </div>

          {buses.length > 0 && (
            <div className="rounded-3xl border border-[var(--border)] bg-white/80 p-5 shadow-lg backdrop-blur">
              <h2 className="font-orbitron text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--text-secondary)]">
                All Buses
              </h2>
              <div className="mt-3 space-y-2">
                {buses.map((bus) => {
                  const dist = haversineKm(location.lat, location.lng, bus.latitude, bus.longitude);
                  return (
                    <div key={bus.id} className="flex items-center justify-between rounded-xl bg-[var(--overlay-subtle)] px-4 py-3">
                      <div>
                        <p className="text-sm font-semibold text-[var(--text-primary)]">{bus.number}</p>
                        <p className="font-jetbrains text-[10px] text-[var(--text-muted)]">
                          {formatKm(dist)} away · {bus.latitude.toFixed(4)}, {bus.longitude.toFixed(4)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-jetbrains text-sm font-bold text-[var(--text-primary)]">{bus.speed} km/h</p>
                        <p className="text-[10px] text-[var(--text-muted)]">{bus.passengersInside}/{bus.seatCapacity}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {nearbyBuses.length > 0 && nearbyBuses.length < buses.length && (
            <div className="rounded-3xl border border-[var(--border)] bg-white/80 p-5 shadow-lg backdrop-blur">
              <h2 className="font-orbitron text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--text-secondary)]">
                Within {radius}km
              </h2>
              <div className="mt-3 space-y-2">
                {nearbyBuses.map(({ bus, distKm }) => (
                  <div key={bus.id} className="flex items-center justify-between rounded-xl bg-[var(--overlay-subtle)] px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-[var(--text-primary)]">{bus.number}</p>
                      <p className="font-jetbrains text-[10px] text-[var(--text-muted)]">{formatKm(distKm)} away</p>
                    </div>
                    <div className="text-right">
                      <p className="font-jetbrains text-sm font-bold text-[var(--text-primary)]">{bus.speed} km/h</p>
                      <p className="text-[10px] text-[var(--text-muted)]">{bus.passengersInside}/{bus.seatCapacity}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {nearbyStops.length === 0 ? (
            nearbyBuses.length === 0 && (
              <div className="rounded-3xl border border-dashed border-[var(--border-subtle)] bg-white/50 p-12 text-center backdrop-blur">
                <p className="mb-2 text-3xl">🗺️</p>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  {t('nearby.none')}
                </p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  {t('nearby.noneDesc')}
                </p>
              </div>
            )
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-[var(--text-secondary)]">
                  {t('nearby.found')}: {nearbyStops.length} {t('nearby.stops').toLowerCase()}
                </p>
                <p className="font-jetbrains text-[10px] text-[var(--text-muted)]">
                  {t('nearby.liveUpdate')}
                </p>
              </div>

              <div className="grid gap-4">
                {nearbyStops.map((item) => (
                  <NearbyStopCard key={`${item.stop.name}-${item.stop.routeId}`} item={item} t={t} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function NearbyStopCard({ item, t }: { item: NearbyStop; t: (key: string) => string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-3xl border border-[var(--border)] bg-white/80 shadow-lg shadow-[var(--shadow-heavy)] backdrop-blur transition hover:shadow-xl">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between p-5 text-left max-sm:p-4"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0097A7]/10 text-base">
            🚏
          </span>
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              {item.stop.name}
            </h3>
            <p className="font-jetbrains text-[10px] text-[var(--text-muted)]">
              {formatKm(item.distance)} {t('nearby.away')}
              {item.approachingBuses.length > 0 && (
                <> &middot; {item.approachingBuses.length} {t('nearby.buses')}</>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {item.approachingBuses.length > 0 && (
            <span className={`rounded-full px-3 py-1 font-jetbrains text-[10px] font-semibold uppercase ${getCrowdednessColor(item.approachingBuses[0].status)}`}>
              {t(`nearby.${item.approachingBuses[0].status}`)}
            </span>
          )}
          <span className="text-[var(--text-muted)] transition group-open:rotate-180">
            {expanded ? '▲' : '▼'}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-[var(--border)] px-5 pb-5 pt-3 max-sm:px-4 max-sm:pb-4">
          {item.approachingBuses.length === 0 ? (
            <p className="text-center text-xs text-[var(--text-muted)]">{t('nearby.noBuses')}</p>
          ) : (
            <div className="space-y-2">
              {item.approachingBuses.map((ab) => (
                <div
                  key={ab.bus.id}
                  className="flex items-center justify-between rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)]/50 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0EA5E9]/10 text-xs font-bold text-[#0EA5E9]">
                      {ab.bus.number.slice(-2)}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-[var(--text-primary)]">
                        {ab.bus.number}
                      </p>
                      <p className="text-[10px] text-[var(--text-muted)]">
                        {ab.bus.route.origin} &rarr; {ab.bus.route.destination}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-jetbrains text-sm font-bold text-[var(--text-primary)]">
                        {ab.etaMinutes}m
                      </p>
                      <p className="text-[10px] text-[var(--text-muted)]">ETA</p>
                    </div>
                    <div className="text-right">
                      <span className={`rounded-full px-2.5 py-0.5 font-jetbrains text-[10px] font-semibold uppercase ${getCrowdednessColor(ab.status)}`}>
                        {t(`nearby.${ab.status}`)}
                      </span>
                      <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">
                        {ab.bus.passengersInside}/{ab.bus.seatCapacity}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
