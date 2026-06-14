import { haversineKm } from './distance';
import type { Bus, Stop } from './mock-data';

export interface ApproachingBus {
  bus: Bus;
  etaMinutes: number;
  crowdedness: number;
  status: 'empty' | 'moderate' | 'crowded' | 'full';
}

export interface NearbyStop {
  stop: Stop;
  distance: number;
  approachingBuses: ApproachingBus[];
}

const CROWDED_THRESHOLD = 0.7;
const FULL_THRESHOLD = 0.9;
const DEFAULT_RADIUS_KM = 1.5;

export function getOccupancyStatus(ratio: number): ApproachingBus['status'] {
  if (ratio >= FULL_THRESHOLD) return 'full';
  if (ratio >= CROWDED_THRESHOLD) return 'crowded';
  if (ratio >= 0.3) return 'moderate';
  return 'empty';
}

export function findNearbyStops(
  userLat: number,
  userLng: number,
  stops: Stop[],
  buses: Bus[],
  radiusKm: number = DEFAULT_RADIUS_KM
): NearbyStop[] {
  const visited = new Set<string>();
  const result: NearbyStop[] = [];

  for (const stop of stops) {
    const key = `${stop.name}-${stop.routeId}`;
    if (visited.has(key)) continue;
    visited.add(key);

    const dist = haversineKm(userLat, userLng, stop.lat, stop.lng);
    if (dist > radiusKm) continue;

    const approachingBuses: ApproachingBus[] = buses
      .filter((b) => b.routeId === stop.routeId)
      .map((b) => {
        const ratio = b.passengersInside / b.seatCapacity;
        return {
          bus: b,
          etaMinutes: b.etaMinutes,
          crowdedness: Math.round(ratio * 100) / 100,
          status: getOccupancyStatus(ratio),
        };
      })
      .sort((a, b) => a.etaMinutes - b.etaMinutes);

    result.push({ stop, distance: Math.round(dist * 10) / 10, approachingBuses });
  }

  return result.sort((a, b) => a.distance - b.distance);
}

export function getCrowdednessColor(status: ApproachingBus['status']): string {
  switch (status) {
    case 'full':
      return 'text-red-500 bg-red-500/10';
    case 'crowded':
      return 'text-orange-500 bg-orange-500/10';
    case 'moderate':
      return 'text-yellow-600 bg-yellow-500/10';
    case 'empty':
      return 'text-green-500 bg-green-500/10';
  }
}

export function getCrowdednessLabel(status: ApproachingBus['status'], t: (key: string) => string): string {
  switch (status) {
    case 'full':
      return 'full';
    case 'crowded':
      return 'crowded';
    case 'moderate':
      return 'moderate';
    case 'empty':
      return 'empty';
  }
}
