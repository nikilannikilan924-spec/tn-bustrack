'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';

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
  nextStops: { name: string; distKm: string; etaMin: number }[];
}

interface LiveMapProps {
  buses: LiveBus[];
  onBusSelect: (id: string) => void;
}

function statusColor(status: string) {
  if (status === 'delayed') return '#FFB300';
  if (status === 'stopped') return '#64748B';
  return '#22C55E';
}

export default function LiveMap({ buses, onBusSelect }: LiveMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const container = containerRef.current;
    container.style.touchAction = 'none';

    const map = L.map(container, {
      center: [13.0827, 80.2707],
      zoom: 8,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      minZoom: 5,
    }).addTo(map);

    markersRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!markersRef.current || !mapRef.current) return;
    const layer = markersRef.current;
    layer.clearLayers();

    buses.forEach((bus) => {
      const color = statusColor(bus.status);
      const icon = L.divIcon({
        className: '',
        html: `<div style="width:16px;height:16px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);cursor:pointer"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });

      const marker = L.marker([bus.latitude, bus.longitude], { icon }).addTo(layer);
      marker.on('click', () => onBusSelect(bus.id));
    });
  }, [buses, onBusSelect]);

  return (
    <div className="relative h-[calc(100vh-5rem)] min-h-[500px] rounded-3xl border border-[var(--border)] bg-white/80 shadow-lg shadow-[var(--shadow-heavy)] max-sm:h-[calc(100dvh-4rem)] max-sm:rounded-2xl max-sm:min-h-[400px]">
      <div
        ref={containerRef}
        className="h-full w-full"
        style={{ touchAction: 'none' }}
      />
    </div>
  );
}
