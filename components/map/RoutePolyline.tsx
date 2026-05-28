'use client';

import { useEffect, useRef } from 'react';
import type { Route } from '@/lib/mock-data';

interface RoutePolylineProps {
  route: Route;
  map: google.maps.Map | null;
}

export function RoutePolyline({ route, map }: RoutePolylineProps) {
  const polylineRef = useRef<google.maps.Polyline | null>(null);

  useEffect(() => {
    if (!map || !route.stops?.length) return;

    const coordinates = route.stops.map((stop) => ({ lat: stop.lat, lng: stop.lng }));
    const strokeColor = '#E53935';

    if (!polylineRef.current) {
      polylineRef.current = new google.maps.Polyline({
        path: coordinates,
        map,
        strokeColor,
        strokeOpacity: 0.65,
        strokeWeight: 4,
        geodesic: true
      });
    }

    polylineRef.current.setMap(map);
    polylineRef.current.setPath(coordinates);
    polylineRef.current.setOptions({ strokeColor });

    return () => {
      polylineRef.current?.setMap(null);
    };
  }, [map, route.stops]);

  return null;
}
