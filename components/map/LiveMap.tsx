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

function makeBusIcon(bus: LiveBus, size: number) {
  const color = statusColor(bus.status);
  const label = bus.number.split(' ').pop() || bus.number;
  return L.divIcon({
    className: '',
    html: `<div style="display:flex;flex-direction:column;align-items:center;gap:1px">
      <div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4);cursor:pointer"></div>
      <span style="font-size:9px;font-weight:700;color:#1e293b;background:rgba(255,255,255,0.9);padding:0 4px;border-radius:4px;white-space:nowrap">${label}</span>
      <span style="font-size:8px;font-weight:600;color:#0EA5E9;background:rgba(255,255,255,0.95);padding:0 4px;border-radius:3px;white-space:nowrap">${bus.currentStop}</span>
    </div>`,
    iconSize: [size, size + 34],
    iconAnchor: [size / 2, size / 2],
  });
}

function makePopupHtml(bus: LiveBus): string {
  const etaText = bus.nextStops[0]
    ? `<b>${bus.nextStops[0].name}</b> — ${bus.nextStops[0].etaMin} min (${bus.nextStops[0].distKm} km)`
    : 'N/A';
  const passengersInside = bus.seatCapacity - bus.seatsAvailable;
  return `<div style="font-family:system-ui;min-width:200px">
    <div style="font-weight:700;font-size:15px;margin-bottom:2px">${bus.number}</div>
    <div style="font-size:11px;color:#64748b;margin-bottom:6px">${bus.routeName}</div>
    <table style="font-size:12px;width:100%">
      <tr><td style="color:#64748b;padding:2px 0">Speed</td><td style="font-weight:600;text-align:right;padding:2px 0">${bus.speed} km/h</td></tr>
      <tr><td style="color:#64748b;padding:2px 0">Current Stop</td><td style="font-weight:600;text-align:right;padding:2px 0;color:#0EA5E9">${bus.currentStop}</td></tr>
      <tr><td style="color:#64748b;padding:2px 0">Next Stop ETA</td><td style="font-weight:600;text-align:right;padding:2px 0">${bus.nextStops[0] ? bus.nextStops[0].name + ' ' + bus.nextStops[0].etaMin + 'min' : '—'}</td></tr>
      <tr><td style="color:#64748b;padding:2px 0">Passengers</td><td style="font-weight:600;text-align:right;padding:2px 0">${passengersInside} / ${bus.seatCapacity}</td></tr>
      <tr><td style="color:#64748b;padding:2px 0">GPS</td><td style="font-weight:400;text-align:right;padding:2px 0;font-size:10px;color:#94a3b8">${bus.latitude.toFixed(4)}, ${bus.longitude.toFixed(4)}</td></tr>
    </table>
  </div>`;
}

export default function LiveMap({ buses, onBusSelect }: LiveMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const container = containerRef.current;
    container.style.touchAction = 'none';

    const map = L.map(container, {
      center: [11.3, 78.1],
      zoom: 9,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      minZoom: 5,
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const markers = markersRef.current;
    const seen = new Set<string>();

    buses.forEach((bus) => {
      seen.add(bus.id);
      const targetLatLng: L.LatLngExpression = [bus.latitude, bus.longitude];

      if (markers.has(bus.id)) {
        const marker = markers.get(bus.id)!;
        const cur = marker.getLatLng();
        if (cur.lat !== bus.latitude || cur.lng !== bus.longitude) {
          const startLat = cur.lat, startLng = cur.lng;
          const endLat = bus.latitude, endLng = bus.longitude;
          const startTime = performance.now();
          const duration = 1500;
          function animate(time: number) {
            const t = Math.min((time - startTime) / duration, 1);
            const lat = startLat + (endLat - startLat) * t;
            const lng = startLng + (endLng - startLng) * t;
            marker.setLatLng([lat, lng]);
            if (t < 1) requestAnimationFrame(animate);
          }
          requestAnimationFrame(animate);
        }
        marker.setIcon(makeBusIcon(bus, 14));
        if (marker.getPopup()) {
          marker.setPopupContent(makePopupHtml(bus));
        }
      } else {
        const icon = makeBusIcon(bus, 14);
        const marker = L.marker(targetLatLng, { icon });
        marker.bindPopup(makePopupHtml(bus), { closeButton: false });
        marker.on('click', () => onBusSelect(bus.id));
        marker.addTo(map);
        markers.set(bus.id, marker);
      }
    });

    markers.forEach((marker, id) => {
      if (!seen.has(id)) {
        marker.removeFrom(map);
        markers.delete(id);
      }
    });
  }, [buses, onBusSelect]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || buses.length === 0) return;
    const hasValidCoord = buses.some(b => b.latitude !== 0 || b.longitude !== 0);
    if (!hasValidCoord) return;

    const valid = buses.filter(b => b.latitude !== 0 || b.longitude !== 0);
    if (valid.length === 0) return;
    if (valid.length === 1) {
      map.setView([valid[0].latitude, valid[0].longitude], map.getZoom(), { animate: true });
    } else {
      const bounds = L.latLngBounds(valid.map(b => [b.latitude, b.longitude] as L.LatLngExpression));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12, animate: true });
    }
  }, [buses]);

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
