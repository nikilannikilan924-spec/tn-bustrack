const TIME_BUCKETS = ['early-morning', 'morning-rush', 'midday', 'evening-rush', 'night'] as const;
type TimeBucket = typeof TIME_BUCKETS[number];

function getTimeBucket(hour: number): TimeBucket {
  if (hour < 6) return 'early-morning';
  if (hour < 10) return 'morning-rush';
  if (hour < 16) return 'midday';
  if (hour < 20) return 'evening-rush';
  return 'night';
}

interface OccupancyRecord {
  time: Date;
  occupancy: number;
  capacity: number;
}

function occupancyPct(record: OccupancyRecord): number {
  return Math.round((record.occupancy / record.capacity) * 100);
}

type CrowdLevel = 'empty' | 'light' | 'moderate' | 'crowded' | 'full';

const CROWD_THRESHOLDS: { level: CrowdLevel; max: number }[] = [
  { level: 'empty', max: 15 },
  { level: 'light', max: 35 },
  { level: 'moderate', max: 60 },
  { level: 'crowded', max: 85 },
  { level: 'full', max: 100 }
];

export function getCrowdLevel(pct: number): CrowdLevel {
  for (const t of CROWD_THRESHOLDS) {
    if (pct <= t.max) return t.level;
  }
  return 'full';
}

export function predictOccupancy(
  hour: number,
  dayOfWeek: number,
  currentOccupancy: number,
  currentCapacity: number,
  history: OccupancyRecord[] = []
): { predictedPct: number; crowdLevel: CrowdLevel; trend: 'rising' | 'falling' | 'stable' } {
  const bucket = getTimeBucket(hour);
  const isWeekend = dayOfWeek >= 6;

  const currentPct = occupancyPct({ time: new Date(), occupancy: currentOccupancy, capacity: currentCapacity });

  const matchingRecords = history.filter(r => {
    const rHour = new Date(r.time).getHours();
    const rDay = new Date(r.time).getDay();
    return getTimeBucket(rHour) === bucket && (rDay >= 6) === isWeekend;
  });

  let predictedPct: number;
  if (matchingRecords.length > 0) {
    const avgHistorical = matchingRecords.reduce((s, r) => s + occupancyPct(r), 0) / matchingRecords.length;
    predictedPct = Math.round((currentPct * 0.6) + (avgHistorical * 0.4));
  } else {
    const BASE_BY_BUCKET: Record<TimeBucket, number> = {
      'early-morning': 10,
      'morning-rush': 75,
      'midday': 45,
      'evening-rush': 80,
      'night': 25
    };
    predictedPct = Math.round((currentPct * 0.7) + (BASE_BY_BUCKET[bucket] * 0.3));
  }

  const recentRecords = history.slice(-3);
  let trend: 'rising' | 'falling' | 'stable' = 'stable';
  if (recentRecords.length >= 2) {
    const recentAvg = recentRecords.reduce((s, r) => s + occupancyPct(r), 0) / recentRecords.length;
    if (recentAvg > currentPct + 5) trend = 'falling';
    else if (recentAvg < currentPct - 5) trend = 'rising';
  }

  return { predictedPct, crowdLevel: getCrowdLevel(predictedPct), trend };
}

export function predictArrival(
  distanceKm: number,
  speedKmh: number,
  stopsRemaining: number
): { minutes: number; confidence: 'high' | 'medium' | 'low' } {
  if (speedKmh < 1) return { minutes: stopsRemaining * 5, confidence: 'low' };

  const etaFromDist = Math.round((distanceKm / speedKmh) * 60);
  const etaFromStops = stopsRemaining * 4;
  const minutes = Math.round((etaFromDist * 0.6) + (etaFromStops * 0.4));

  const confidence = speedKmh > 20 && stopsRemaining < 10 ? 'high'
    : speedKmh > 10 ? 'medium' : 'low';

  return { minutes: Math.max(1, minutes), confidence };
}
