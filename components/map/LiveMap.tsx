'use client';

import { useMemo, useCallback, useRef, useState } from 'react';
import { GoogleMap, MarkerF, PolylineF, InfoWindowF, useJsApiLoader } from '@react-google-maps/api';
import type { Bus, Route } from '@/lib/mock-data';

interface LiveMapProps {
  buses: Bus[];
  routes: Route[];
  onBusSelect: (id: string) => void;
}

const defaultCenter = { lat: 13.0827, lng: 80.2707 };
const containerStyle = { width: '100%', height: '100%' };

function statusColor(status: Bus['status']) {
  if (status === 'delayed') return '#FFB300';
  if (status === 'stopped') return '#64748B';
  return '#22C55E';
}

const routeColors: Record<string, string> = {
  TNSTC: '#0EA5E9'
};

export default function LiveMap({ buses, routes, onBusSelect }: LiveMapProps) {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || ''
  });

  const mapRef = useRef<google.maps.Map | null>(null);
  const [selectedBus, setSelectedBus] = useState<Bus | null>(null);
  const [loaded, setLoaded] = useState(false);

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    setLoaded(true);
  }, []);

  const onUnmount = useCallback(() => {
    mapRef.current = null;
  }, []);

  const allPoints = useMemo(
    () => buses.map((bus) => ({ lat: bus.latitude, lng: bus.longitude })),
    [buses]
  );

  const fitBounds = () => {
    if (!mapRef.current || !allPoints.length) return;
    const bounds = new google.maps.LatLngBounds();
    allPoints.forEach((p) => bounds.extend(p));
    mapRef.current.fitBounds(bounds, 80);
  };

  const zoomMap = (dir: 'in' | 'out') => {
    if (!mapRef.current) return;
    mapRef.current.setZoom((mapRef.current.getZoom() || 11) + (dir === 'in' ? 1 : -1));
  };

  if (!isLoaded) {
    return (
      <div className="grid h-[55vh] min-h-[350px] place-items-center rounded-3xl border border-[var(--border)] bg-white/80 text-sm text-[var(--text-secondary)]">
        Loading Google Maps...
      </div>
    );
  }

  return (
    <div className="relative h-[55vh] min-h-[350px] overflow-hidden rounded-3xl border border-[var(--border)] bg-white/80 shadow-lg shadow-[var(--shadow-heavy)] max-sm:min-h-[300px] max-sm:rounded-2xl">
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={defaultCenter}
        zoom={11}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={{
          mapTypeId: 'roadmap',
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
          styles: [
            { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] }
          ]
        }}
      >
        {routes.map((route) => (
          <PolylineF
            key={route.id}
            path={route.stops.map((s) => ({ lat: s.lat, lng: s.lng }))}
            options={{
              strokeColor: routeColors[route.operator] || '#0EA5E9',
              strokeWeight: 4,
              strokeOpacity: 0.7
            }}
          />
        ))}

        {buses.map((bus) => (
          <MarkerF
            key={bus.id}
            position={{ lat: bus.latitude, lng: bus.longitude }}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: statusColor(bus.status),
              fillOpacity: 1,
              strokeColor: '#FFFFFF',
              strokeWeight: 2
            }}
            onClick={() => {
              setSelectedBus(bus);
              onBusSelect(bus.id);
            }}
          />
        ))}

        {selectedBus && (
          <InfoWindowF
            position={{ lat: selectedBus.latitude, lng: selectedBus.longitude }}
            onCloseClick={() => setSelectedBus(null)}
          >
            <div className="space-y-1 text-sm">
              <p className="font-semibold">{selectedBus.number}</p>
              <p>{selectedBus.route.origin} &rarr; {selectedBus.route.destination}</p>
              <p>Status: {selectedBus.status}</p>
              <p>Speed: {selectedBus.speed} km/h</p>
              <p>Seats: {selectedBus.seatsAvailable}/{selectedBus.seatCapacity}</p>
              <p>Passengers: {selectedBus.passengersInside}</p>
            </div>
          </InfoWindowF>
        )}
      </GoogleMap>

      {!loaded && (
        <div className="absolute inset-4 z-20 grid place-items-center rounded-3xl border border-[var(--border)] bg-white/80 text-center text-sm text-[var(--text-secondary)] backdrop-blur">
          Loading Google Maps...
        </div>
      )}

      <div className="absolute left-6 top-6 z-30 flex flex-col gap-2 rounded-3xl border border-[var(--border)] glass p-3">
        <button
          type="button"
          onClick={() => zoomMap('in')}
          className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)]/90 px-4 py-3 text-sm font-semibold text-[var(--text-primary)] transition hover:border-[#0EA5E9]/30 hover:text-[#0EA5E9]"
        >
          Zoom in
        </button>
        <button
          type="button"
          onClick={() => zoomMap('out')}
          className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)]/90 px-4 py-3 text-sm font-semibold text-[var(--text-primary)] transition hover:border-[#0EA5E9]/30 hover:text-[#0EA5E9]"
        >
          Zoom out
        </button>
        <button
          type="button"
          onClick={fitBounds}
          className="rounded-2xl border border-[#0EA5E9]/30 bg-[#0EA5E9]/10 px-4 py-3 text-sm font-semibold text-[#0EA5E9] transition hover:bg-[#0EA5E9]/20"
        >
          Fit vehicles
        </button>
      </div>

      <div className="absolute right-6 top-6 z-30 rounded-3xl border border-[var(--border)] glass px-4 py-3 font-orbitron text-[10px] uppercase tracking-[0.25em] text-[var(--text-secondary)]">
        Google Maps
      </div>

      <div className="absolute bottom-6 left-6 z-30 flex flex-wrap gap-2 rounded-3xl border border-[var(--border)] glass p-3 text-[10px] uppercase tracking-[0.22em]">
        <span className="rounded-full bg-[#22C55E]/15 px-3 py-1 text-[#22C55E]">Running</span>
        <span className="rounded-full bg-[#FFB300]/15 px-3 py-1 text-[#FFB300]">Delayed</span>
        <span className="rounded-full bg-[#64748B]/20 px-3 py-1 text-[var(--text-secondary)]">Stopped</span>
      </div>
    </div>
  );
}
