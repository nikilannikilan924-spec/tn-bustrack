'use client';

import { useEffect, useRef } from 'react';
import type { Bus } from '@/lib/mock-data';

interface BusMarkerProps {
  bus: Bus;
  map: google.maps.Map | null;
  onClick: () => void;
}

export function BusMarker({ bus, map, onClick }: BusMarkerProps) {
  const markerRef = useRef<google.maps.Marker | null>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (!map) return;

    const markerColor = bus.status === 'delayed' ? '#f59e0b' : bus.status === 'stopped' ? '#9ca3af' : '#16a34a';

    const iconFor = (scale: number) => ({
      path: google.maps.SymbolPath.CIRCLE,
      scale,
      fillColor: markerColor,
      fillOpacity: 0.95,
      strokeColor: '#0f172a',
      strokeWeight: 2
    });

    if (!markerRef.current) {
      markerRef.current = new google.maps.Marker({
        position: { lat: bus.latitude, lng: bus.longitude },
        map,
        title: `${bus.number} • ${bus.route.number}`,
        icon: iconFor(10)
      });
      markerRef.current.addListener('click', onClick);
    }

    markerRef.current.setMap(map);
    markerRef.current.setPosition({ lat: bus.latitude, lng: bus.longitude });
    markerRef.current.setTitle(`${bus.number} • ${bus.route.number}`);
    markerRef.current.setIcon(iconFor(bus.status === 'running' ? 11 : 10));

    let scale = bus.status === 'stopped' ? 8.5 : 10;
    let expanding = true;
    if (animationRef.current) {
      window.cancelAnimationFrame(animationRef.current);
    }

    const pulse = () => {
      if (!markerRef.current) return;
      scale = expanding ? scale + 0.06 : scale - 0.06;
      if (scale >= 12) expanding = false;
      if (scale <= 9) expanding = true;
      markerRef.current.setIcon(iconFor(Number(scale.toFixed(2))));
      animationRef.current = window.requestAnimationFrame(pulse);
    };

    animationRef.current = window.requestAnimationFrame(pulse);

    return () => {
      if (animationRef.current) {
        window.cancelAnimationFrame(animationRef.current);
      }
      markerRef.current?.setMap(null);
    };
  }, [map, bus.latitude, bus.longitude, bus.number, bus.route.number, bus.status, onClick]);

  return null;
}
