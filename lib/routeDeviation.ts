import { haversineKm } from '@/lib/distance';

interface RoutePoint {
  lat: number;
  lng: number;
}

export function isDeviating(
  busLat: number,
  busLng: number,
  routeStops: RoutePoint[],
  thresholdKm: number = 1.5
): { deviated: boolean; distanceKm: number; nearestStopIndex: number } {
  if (!routeStops.length) return { deviated: false, distanceKm: 0, nearestStopIndex: -1 };

  let minDist = Infinity;
  let nearestIndex = 0;

  for (let i = 0; i < routeStops.length; i++) {
    const d = haversineKm(busLat, busLng, routeStops[i].lat, routeStops[i].lng);
    if (d < minDist) {
      minDist = d;
      nearestIndex = i;
    }
  }

  if (nearestIndex > 0 && nearestIndex < routeStops.length - 1) {
    const prev = routeStops[nearestIndex - 1];
    const next = routeStops[nearestIndex + 1];
    const toPrev = haversineKm(busLat, busLng, prev.lat, prev.lng);
    const toNext = haversineKm(busLat, busLng, next.lat, next.lng);
    minDist = Math.min(minDist, toPrev, toNext);
  }

  return {
    deviated: minDist > thresholdKm,
    distanceKm: Math.round(minDist * 100) / 100,
    nearestStopIndex: nearestIndex
  };
}
