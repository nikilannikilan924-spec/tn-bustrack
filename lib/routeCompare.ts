import type { Bus, Route } from '@/lib/types';
import { haversineKm } from '@/lib/distance';
import { predictArrival } from '@/lib/prediction';

export interface RouteOption {
  bus: Bus;
  route: Route;
  departureStop: string;
  arrivalStop: string;
  totalDistanceKm: number;
  estimatedMinutes: number;
  confidence: 'high' | 'medium' | 'low';
  stopsToTravel: number;
}

export function findRouteOptions(
  fromStopName: string,
  toStopName: string,
  buses: Bus[]
): RouteOption[] {
  const options: RouteOption[] = [];

  for (const bus of buses) {
    const stopNames = bus.route.stops.map(s => s.name);
    const fromIdx = stopNames.indexOf(fromStopName);
    const toIdx = stopNames.indexOf(toStopName);
    if (fromIdx === -1 || toIdx === -1 || toIdx <= fromIdx) continue;

    const relevantStops = bus.route.stops.slice(fromIdx, toIdx + 1);
    let totalDist = 0;
    for (let i = 0; i < relevantStops.length - 1; i++) {
      totalDist += haversineKm(relevantStops[i].lat, relevantStops[i].lng, relevantStops[i + 1].lat, relevantStops[i + 1].lng);
    }

    const prediction = predictArrival(totalDist, bus.speed, toIdx - fromIdx);
    options.push({
      bus,
      route: bus.route,
      departureStop: fromStopName,
      arrivalStop: toStopName,
      totalDistanceKm: Math.round(totalDist * 100) / 100,
      estimatedMinutes: prediction.minutes,
      confidence: prediction.confidence,
      stopsToTravel: toIdx - fromIdx
    });
  }

  return options.sort((a, b) => a.estimatedMinutes - b.estimatedMinutes);
}

export function getSmartSuggestion(
  options: RouteOption[]
): { message: string; type: 'board-here' | 'next-less-crowded' | 'alternative' } | null {
  if (options.length === 0) return null;

  const fastest = options[0];

  if (options.length > 1) {
    const lessCrowded = options.slice(1).find(o =>
      o.bus.seatsAvailable > fastest.bus.seatsAvailable + 5 &&
      o.estimatedMinutes <= fastest.estimatedMinutes + 10
    );
    if (lessCrowded) {
      return {
        message: `Bus ${lessCrowded.bus.number} arrives in ${lessCrowded.estimatedMinutes} min with ${lessCrowded.bus.seatsAvailable} seats — only ${lessCrowded.estimatedMinutes - fastest.estimatedMinutes} min longer`,
        type: 'next-less-crowded'
      };
    }
  }

  if (fastest.bus.seatsAvailable < 5) {
    return {
      message: `Bus ${fastest.bus.number} is nearly full. Consider the next service.`,
      type: 'board-here'
    };
  }

  return {
    message: `Bus ${fastest.bus.number} — ${fastest.estimatedMinutes} min via ${fastest.route.number}`,
    type: 'board-here'
  };
}
