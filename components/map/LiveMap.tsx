'use client';

import { useEffect, useMemo, useState } from 'react';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Bus, Route } from '@/lib/mock-data';

interface LiveMapProps {
  buses: Bus[];
  routes: Route[];
  onBusSelect: (id: string) => void;
}

const defaultCenter: [number, number] = [13.0827, 80.2707];

function MapInitializer({ onReady }: { onReady: (map: L.Map) => void }) {
  const map = useMap();

  useEffect(() => {
    onReady(map);
  }, [map, onReady]);

  return null;
}

function statusColor(status: Bus['status']) {
  if (status === 'delayed') return '#FFB300';
  if (status === 'stopped') return '#64748B';
  return '#E53935';
}

function busSvg(color: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="${color}">
    <path d="M4 16c0 .88.46 1.66 1.14 2.1l-.64 1.28c-.07.14-.07.3-.07.45V21c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h10v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1.17c0-.15-.02-.31-.07-.45l-.64-1.28A2.49 2.49 0 0 0 20 16H4zm15 1.5c0 .83-.67 1.5-1.5 1.5S16 18.33 16 17.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5zm-13 0c0 .83-.67 1.5-1.5 1.5S3 18.33 3 17.5 3.67 16 4.5 16 6 16.67 6 17.5zM19 12H5V5h14v7zM8 3h-.5C7.22 3 7 3.22 7 3.5V4H5V3.5C5 2.12 6.12 1 7.5 1h9C17.88 1 19 2.12 19 3.5V4h-2v-.5c0-.28-.22-.5-.5-.5H8z"/>
  </svg>`;
}

function busIcon(bus: Bus) {
  const color = statusColor(bus.status);
  return L.divIcon({
    className: 'tn-bustrack-marker',
    html: `
      <div class="tn-bustrack-marker__outer" style="background:${color};border:2px solid ${color};">
        ${busSvg('#FFFFFF')}
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });
}

const routeColors: Record<string, string> = {
  TNSTC: '#E53935'
};

export default function LiveMap({ buses, routes, onBusSelect }: LiveMapProps) {
  const [map, setMap] = useState<L.Map | null>(null);
  const [loaded, setLoaded] = useState(false);

  const allPoints = useMemo(() => buses.map((bus) => [bus.latitude, bus.longitude] as [number, number]), [buses]);

  useEffect(() => {
    if (!map || !allPoints.length) return;
    const bounds = L.latLngBounds(allPoints);
    map.fitBounds(bounds.pad(0.18));
  }, [allPoints, map]);

  const zoomMap = (direction: 'in' | 'out') => {
    if (!map) return;
    const currentZoom = map.getZoom() ?? 11;
    map.setZoom(direction === 'in' ? currentZoom + 1 : currentZoom - 1);
  };

  const focusAllBuses = () => {
    if (!map || !allPoints.length) return;
    map.fitBounds(L.latLngBounds(allPoints).pad(0.18));
  };

  return (
    <div className="relative h-[55vh] min-h-[350px] overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--bg-primary)] p-4 shadow-lg shadow-[var(--shadow)] max-sm:min-h-[300px] max-sm:rounded-2xl">
      <MapContainer
        center={defaultCenter}
        zoom={11}
        className="h-full w-full rounded-3xl"
      >
        <MapInitializer
          onReady={(instance) => {
            setMap(instance);
            setLoaded(true);
          }}
        />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {routes.map((route) => (
          <Polyline
            key={route.id}
            positions={route.stops.map((stop) => [stop.lat, stop.lng] as [number, number])}
            pathOptions={{
              color: routeColors[route.operator] || '#E53935',
              weight: 4,
              opacity: 0.7
            }}
          />
        ))}

        {buses.map((bus) => (
          <Marker
            key={bus.id}
            position={[bus.latitude, bus.longitude]}
            icon={busIcon(bus)}
            eventHandlers={{ click: () => onBusSelect(bus.id) }}
          >
            <Popup>
              <div className="space-y-1 text-sm">
                <p className="font-semibold">{bus.number}</p>
                <p>{bus.route.origin} → {bus.route.destination}</p>
                <p>Status: {bus.status}</p>
                <p>Speed: {bus.speed} km/h</p>
                <p>Seats: {bus.seatsAvailable}/{bus.seatCapacity}</p>
                <p>Passengers: {bus.passengersInside}</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {!loaded && (
        <div className="absolute inset-4 z-20 grid place-items-center rounded-3xl border border-[var(--border)] bg-[var(--bg-primary)]/85 text-center text-sm text-[var(--text-secondary)] backdrop-blur">
          Loading OpenStreetMap...
        </div>
      )}

      <div className="absolute left-6 top-6 z-30 flex flex-col gap-2 rounded-3xl border border-[var(--border)] bg-[var(--bg-elevated)] p-3 backdrop-blur">
        <button
          type="button"
          onClick={() => zoomMap('in')}
          className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)]/90 px-4 py-3 text-sm font-semibold text-[var(--text-primary)] transition hover:border-[#E53935]/30 hover:text-[#E53935]"
        >
          Zoom in
        </button>
        <button
          type="button"
          onClick={() => zoomMap('out')}
          className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)]/90 px-4 py-3 text-sm font-semibold text-[var(--text-primary)] transition hover:border-[#E53935]/30 hover:text-[#E53935]"
        >
          Zoom out
        </button>
        <button
          type="button"
          onClick={focusAllBuses}
          className="rounded-2xl border border-[#E53935]/30 bg-[#E53935]/10 px-4 py-3 text-sm font-semibold text-[#E53935] transition hover:bg-[#E53935]/20"
        >
          Fit vehicles
        </button>
      </div>

      <div className="absolute right-6 top-6 z-30 rounded-3xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3 font-orbitron text-[10px] uppercase tracking-[0.25em] text-[var(--text-secondary)] backdrop-blur">
        Live GPS markers
      </div>

      <div className="absolute bottom-6 left-6 z-30 flex flex-wrap gap-2 rounded-3xl border border-[var(--border)] bg-[var(--bg-elevated)] p-3 text-[10px] uppercase tracking-[0.22em] backdrop-blur">
        <span className="rounded-full bg-[#E53935]/15 px-3 py-1 text-[#E53935]">Running</span>
        <span className="rounded-full bg-[#FFB300]/15 px-3 py-1 text-[#FFB300]">Delayed</span>
        <span className="rounded-full bg-[#64748B]/20 px-3 py-1 text-[var(--text-secondary)]">Stopped</span>
      </div>
    </div>
  );
}
