import type { Bus } from '@/lib/types';
import { haversineKm } from '@/lib/distance';

export function estimateEtaToStop(bus: Bus, stopSequence: number): number | null {
  const currentIdx = bus.route.stops.findIndex((s) => s.name === bus.currentStop);
  if (currentIdx === -1) return null;
  if (stopSequence <= currentIdx) return null;

  const stop = bus.route.stops[stopSequence - 1];
  const dist = haversineKm(bus.latitude, bus.longitude, stop.lat, stop.lng);

  if (bus.speed > 5) {
    return Math.round((dist / bus.speed) * 60);
  }

  let totalRemainingDist = 0;
  for (let i = currentIdx + 1; i < bus.route.stops.length; i++) {
    const prev = i === currentIdx + 1
      ? { lat: bus.latitude, lng: bus.longitude }
      : bus.route.stops[i - 1];
    totalRemainingDist += haversineKm(prev.lat, prev.lng, bus.route.stops[i].lat, bus.route.stops[i].lng);
  }

  if (totalRemainingDist === 0) return null;
  return Math.round((dist / totalRemainingDist) * bus.etaMinutes);
}
