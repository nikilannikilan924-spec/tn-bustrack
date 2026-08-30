'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';

interface LiveBus {
  id: string;
  number: string;
  routeName: string;
  currentStop: string;
  area: string;
  road: string;
  city: string;
  status: 'running' | 'delayed' | 'stopped';
  speed: number;
  latitude: number;
  longitude: number;
  seatsAvailable: number;
  seatCapacity: number;
  nextStops: { name: string; distKm: string; etaMin: number }[];
  gpsFixed?: boolean;
}

interface Stop {
  id: string;
  name: string;
  lat: number;
  lng: number;
  sequence: number;
  routeId?: string;
}

interface LiveMapProps {
  buses: LiveBus[];
  stops: Stop[];
  onBusSelect: (id: string) => void;
}

function statusColor(status: string) {
  if (status === 'delayed') return '#FFB300';
  if (status === 'stopped') return '#64748B';
  return '#22C55E';
}

function hasValidCoordinates(bus: LiveBus) {
  return Number.isFinite(bus.latitude) && Number.isFinite(bus.longitude) &&
    Math.abs(bus.latitude) <= 90 && Math.abs(bus.longitude) <= 180 &&
    (bus.latitude !== 0 || bus.longitude !== 0);
}

function hasValidStopCoordinates(stop: Stop) {
  return Number.isFinite(stop.lat) && Number.isFinite(stop.lng) &&
    Math.abs(stop.lat) <= 90 && Math.abs(stop.lng) <= 180 &&
    (stop.lat !== 0 || stop.lng !== 0);
}

function makeBusIcon(bus: LiveBus, size: number) {
  const color = statusColor(bus.status);
  const label = String(bus.number || bus.id).split(' ').pop() || bus.id;
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

function makeStopIcon(stop: Stop) {
  return L.divIcon({
    className: '',
    html: `<div style="display:flex;align-items:center;gap:3px;white-space:nowrap">
      <div style="width:11px;height:11px;border-radius:50%;background:#0EA5E9;border:2px solid white;box-shadow:0 1px 5px rgba(0,0,0,0.35)"></div>
      <span style="font-size:9px;font-weight:600;color:#0369A1;background:rgba(255,255,255,0.9);padding:1px 4px;border-radius:4px">${stop.sequence}. ${stop.name}</span>
    </div>`,
    iconSize: [11, 11],
    iconAnchor: [5, 5],
  });
}

function makePopupHtml(bus: LiveBus): string {
  const etaText = bus.nextStops[0]
    ? `<b>${bus.nextStops[0].name}</b> — ${bus.nextStops[0].etaMin} min (${bus.nextStops[0].distKm} km)`
    : '—';
  const passengersInside = bus.seatCapacity - bus.seatsAvailable;
  const gpsLocation = [bus.area, bus.road, bus.city].filter(Boolean).join(', ');
  return `<div style="font-family:system-ui;min-width:200px">
    <div style="font-weight:700;font-size:15px;margin-bottom:2px">${bus.number}</div>
    <div style="font-size:11px;color:#64748b;margin-bottom:6px">${bus.routeName}</div>
    <table style="font-size:12px;width:100%">
      <tr><td style="color:#64748b;padding:2px 0">Speed</td><td style="font-weight:600;text-align:right;padding:2px 0">${bus.speed} km/h</td></tr>
      <tr><td style="color:#64748b;padding:2px 0">Location</td><td style="font-weight:600;text-align:right;padding:2px 0;color:#0EA5E9">${gpsLocation || bus.latitude.toFixed(4) + ', ' + bus.longitude.toFixed(4)}</td></tr>
      <tr><td style="color:#64748b;padding:2px 0">Next Stop</td><td style="font-weight:600;text-align:right;padding:2px 0">${bus.nextStops[0] ? bus.nextStops[0].name + ' ' + bus.nextStops[0].etaMin + 'min' : '—'}</td></tr>
      <tr><td style="color:#64748b;padding:2px 0">Passengers</td><td style="font-weight:600;text-align:right;padding:2px 0">${passengersInside} / ${bus.seatCapacity}</td></tr>
      <tr><td style="color:#64748b;padding:2px 0">GPS</td><td style="font-weight:600;text-align:right;padding:2px 0;font-size:10px">${bus.gpsFixed === true ? '<span style="color:#22C55E">FIX</span>' : '<span style="color:#F59E0B">SEARCHING</span>'}</td></tr>
    </table>
  </div>`;
}

export default function LiveMap({ buses, stops, onBusSelect }: LiveMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const stopMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const centeredRef = useRef(false);

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
      stopMarkersRef.current.clear();
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const markers = stopMarkersRef.current;
    const seen = new Set<string>();

    stops.forEach((stop) => {
      if (!hasValidStopCoordinates(stop)) return;
      const id = String(stop.id || `${stop.routeId || 'route'}-${stop.sequence}-${stop.name}`);
      seen.add(id);
      const position: L.LatLngExpression = [stop.lat, stop.lng];
      const marker = markers.get(id);

      if (marker) {
        marker.setLatLng(position);
        marker.setIcon(makeStopIcon(stop));
      } else {
        const nextMarker = L.marker(position, { icon: makeStopIcon(stop), zIndexOffset: -100 });
        nextMarker.bindTooltip(stop.name, { direction: 'top', offset: [0, -6] });
        nextMarker.addTo(map);
        markers.set(id, nextMarker);
      }
    });

    markers.forEach((marker, id) => {
      if (!seen.has(id)) {
        marker.removeFrom(map);
        markers.delete(id);
      }
    });
  }, [stops]);

  const prevDataRef = useRef<Map<string, string>>(new Map());
  const prevIconRef = useRef<Map<string, string>>(new Map());
  const animFrameRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const markers = markersRef.current;
    const prev = prevDataRef.current;
    const prevIcon = prevIconRef.current;
    const anims = animFrameRef.current;
    const seen = new Set<string>();

    buses.forEach((bus) => {
      if (!hasValidCoordinates(bus)) return;
      seen.add(bus.id);
      const targetLatLng: L.LatLngExpression = [bus.latitude, bus.longitude];
      const serialized = `${bus.latitude},${bus.longitude},${bus.speed},${bus.seatsAvailable},${bus.currentStop},${bus.status},${bus.gpsFixed},${bus.nextStops.map(s=>s.name+s.etaMin).join('|')}`;
      const iconKey = `${bus.status}|${bus.number}|${bus.currentStop}`;

      if (markers.has(bus.id)) {
        const marker = markers.get(bus.id)!;
        const last = prev.get(bus.id);
        if (last !== serialized) {
          if (anims.has(bus.id)) cancelAnimationFrame(anims.get(bus.id)!);
          const cur = marker.getLatLng();
          if (cur.lat !== bus.latitude || cur.lng !== bus.longitude) {
            const dLat = bus.latitude - cur.lat;
            const dLng = bus.longitude - cur.lng;
            if (Math.abs(dLat) < 0.0002 && Math.abs(dLng) < 0.0002) {
              marker.setLatLng([bus.latitude, bus.longitude]);
            } else {
              const startLat = cur.lat, startLng = cur.lng;
              const endLat = bus.latitude, endLng = bus.longitude;
              const startTime = performance.now();
              const duration = 1500;
              function animate(time: number) {
                const t = Math.min((time - startTime) / duration, 1);
                const lat = startLat + (endLat - startLat) * t;
                const lng = startLng + (endLng - startLng) * t;
                marker.setLatLng([lat, lng]);
                if (t < 1) anims.set(bus.id, requestAnimationFrame(animate));
                else anims.delete(bus.id);
              }
              anims.set(bus.id, requestAnimationFrame(animate));
            }
          }
          if (prevIcon.get(bus.id) !== iconKey) {
            marker.setIcon(makeBusIcon(bus, 14));
            prevIcon.set(bus.id, iconKey);
          }
          if (marker.getPopup()) {
            marker.setPopupContent(makePopupHtml(bus));
          }
          prev.set(bus.id, serialized);
        }
      } else {
        const icon = makeBusIcon(bus, 14);
        const marker = L.marker(targetLatLng, { icon });
        marker.bindPopup(makePopupHtml(bus), { closeButton: false });
        marker.on('click', () => onBusSelect(bus.id));
        marker.addTo(map);
        markers.set(bus.id, marker);
        prev.set(bus.id, serialized);
        prevIcon.set(bus.id, iconKey);
      }
    });

    markers.forEach((marker, id) => {
      if (!seen.has(id)) {
        marker.removeFrom(map);
        markers.delete(id);
        prev.delete(id);
      }
    });
  }, [buses, onBusSelect]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || centeredRef.current) return;

    const points: L.LatLngExpression[] = [
      ...buses.filter(hasValidCoordinates).map((bus) => [bus.latitude, bus.longitude] as L.LatLngExpression),
      ...stops.filter(hasValidStopCoordinates).map((stop) => [stop.lat, stop.lng] as L.LatLngExpression),
    ];
    if (points.length === 0) return;

    if (points.length === 1) {
      map.setView(points[0], 15, { animate: true });
      centeredRef.current = true;
    } else {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12, animate: true });
      centeredRef.current = true;
    }
  }, [buses, stops]);

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
