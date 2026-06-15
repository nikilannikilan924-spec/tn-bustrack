'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Bus, Route } from '@/lib/mock-data';

interface LiveMapProps {
  buses: Bus[];
  routes: Route[];
  onBusSelect: (id: string) => void;
}

const defaultCenter: L.LatLngExpression = [13.0827, 80.2707];

const tnBounds = L.latLngBounds(
  [8.0, 76.2],
  [13.5, 80.5]
);

function statusColor(status: Bus['status']) {
  if (status === 'delayed') return '#FFB300';
  if (status === 'stopped') return '#64748B';
  return '#22C55E';
}

const routeColors: Record<string, string> = {
  TNSTC: '#0EA5E9'
};

export default function LiveMap({ buses, routes, onBusSelect }: LiveMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const routesLayerRef = useRef<L.LayerGroup | null>(null);
  const popupRef = useRef<L.Popup | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: defaultCenter,
      zoom: 8,
      maxBounds: tnBounds,
      maxBoundsViscosity: 1,
      zoomControl: false,
      attributionControl: false
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      minZoom: 7
    }).addTo(map);

    L.control.zoom({ position: 'topleft' }).addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);
    routesLayerRef.current = L.layerGroup().addTo(map);

    map.on('load', () => setLoaded(true));

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!markersLayerRef.current || !mapRef.current) return;
    const layer = markersLayerRef.current;

    layer.clearLayers();

    buses.forEach((bus) => {
      const color = statusColor(bus.status);
      const icon = L.divIcon({
        className: '',
        html: `<div style="
          width: 16px; height: 16px;
          border-radius: 50%;
          background: ${color};
          border: 3px solid white;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          cursor: pointer;
        "></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      });

      const marker = L.marker([bus.latitude, bus.longitude], { icon }).addTo(layer);

      marker.on('click', () => {
        onBusSelect(bus.id);
        if (popupRef.current) popupRef.current.remove();
        popupRef.current = L.popup({ closeButton: true, offset: [0, -10] })
          .setLatLng([bus.latitude, bus.longitude])
          .setContent(`
            <div style="font-family: sans-serif; line-height: 1.4; min-width: 160px;">
              <p style="font-weight: 700; margin: 0 0 4px;">${bus.number}</p>
              <p style="margin: 0; font-size: 12px; color: #555;">${bus.route.origin} &rarr; ${bus.route.destination}</p>
              <p style="margin: 4px 0 0; font-size: 12px; color: #555;">நிலை: ${bus.status === 'running' ? 'இயக்கத்தில்' : bus.status === 'delayed' ? 'தாமதம்' : 'நிறுத்தப்பட்டது'}</p>
              <p style="margin: 0; font-size: 12px; color: #555;">வேகம்: ${bus.speed} km/h</p>
              <p style="margin: 0; font-size: 12px; color: #555;">இருக்கைகள்: ${bus.seatsAvailable}/${bus.seatCapacity}</p>
            </div>
          `)
          .addTo(mapRef.current!);
      });
    });
  }, [buses, onBusSelect]);

  useEffect(() => {
    if (!routesLayerRef.current) return;
    const layer = routesLayerRef.current;

    layer.clearLayers();

    routes.forEach((route) => {
      const coords = route.stops.map((s) => [s.lat, s.lng] as L.LatLngTuple);
      L.polyline(coords, {
        color: routeColors[route.operator] || '#0EA5E9',
        weight: 4,
        opacity: 0.7
      }).addTo(layer);
    });
  }, [routes]);

  return (
    <div className="relative h-[calc(100vh-5rem)] min-h-[500px] overflow-hidden rounded-3xl border border-[var(--border)] bg-white/80 shadow-lg shadow-[var(--shadow-heavy)] max-sm:h-[calc(100dvh-4rem)] max-sm:rounded-2xl max-sm:min-h-[400px]">
      <div ref={containerRef} className="h-full w-full" />

      {!loaded && (
        <div className="absolute inset-0 z-20 grid place-items-center rounded-3xl border border-[var(--border)] bg-white/80 text-center text-sm text-[var(--text-secondary)] backdrop-blur">
          Loading map...
        </div>
      )}

      <div className="absolute right-6 top-6 z-30 rounded-3xl border border-[var(--border)] bg-white/80 px-4 py-3 font-orbitron text-[10px] uppercase tracking-[0.25em] text-[var(--text-secondary)] shadow-lg backdrop-blur-xl">
        OpenStreetMap
      </div>

      <div className="absolute bottom-6 left-6 z-30 flex flex-wrap gap-2 rounded-3xl border border-[var(--border)] bg-white/80 p-3 text-[10px] uppercase tracking-[0.22em] shadow-lg backdrop-blur-xl">
        <span className="rounded-full bg-[#22C55E]/15 px-3 py-1 text-[#22C55E]">இயக்கத்தில்</span>
        <span className="rounded-full bg-[#FFB300]/15 px-3 py-1 text-[#FFB300]">தாமதம்</span>
        <span className="rounded-full bg-[#64748B]/20 px-3 py-1 text-[var(--text-secondary)]">நிறுத்தப்பட்டது</span>
      </div>
    </div>
  );
}
