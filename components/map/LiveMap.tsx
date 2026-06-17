'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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

const defaultCenter: L.LatLngExpression = [13.0827, 80.2707];

const tnBounds = L.latLngBounds(
  [8.0, 76.2],
  [13.5, 80.5]
);

function statusColor(status: string) {
  if (status === 'delayed') return '#FFB300';
  if (status === 'stopped') return '#64748B';
  return '#22C55E';
}

export default function LiveMap({ buses, onBusSelect }: LiveMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const popupRef = useRef<L.Popup | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: defaultCenter,
      zoom: 8,
      zoomControl: false,
      attributionControl: false
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      minZoom: 5
    }).addTo(map);

    L.control.zoom({ position: 'topleft' }).addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);

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
        const statusLabel = bus.status === 'running' ? 'இயக்கத்தில்' : bus.status === 'delayed' ? 'தாமதம்' : 'நிறுத்தப்பட்டது';
        popupRef.current = L.popup({ closeButton: true, offset: [0, -10] })
          .setLatLng([bus.latitude, bus.longitude])
          .setContent(`
            <div style="font-family: sans-serif; line-height: 1.4; min-width: 160px;">
              <p style="font-weight: 700; margin: 0 0 4px;">${bus.number}</p>
              <p style="margin: 0; font-size: 12px; color: #555;">${bus.routeName}</p>
              <p style="margin: 4px 0 0; font-size: 12px; color: #555;">நிலை: ${statusLabel}</p>
              <p style="margin: 0; font-size: 12px; color: #555;">வேகம்: ${bus.speed} km/h</p>
              <p style="margin: 0; font-size: 12px; color: #555;">இருக்கைகள்: ${bus.seatsAvailable}/${bus.seatCapacity}</p>
              ${bus.nextStops[0] ? `<p style="margin: 0; font-size: 12px; color: #555;">அடுத்த நிறுத்தம்: ${bus.nextStops[0].name} (${bus.nextStops[0].distKm} km)</p>` : ''}
            </div>
          `)
          .addTo(mapRef.current!);
      });
    });
  }, [buses, onBusSelect]);



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
