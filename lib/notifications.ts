export interface ArrivalNotification {
  busId: string;
  busNumber: string;
  stopName: string;
  routeNumber: string;
  origin: string;
  destination: string;
  minutesUntilArrival: number;
  confidence: 'high' | 'medium' | 'low';
  timestamp: number;
}

const notifiedArrivals = new Map<string, number>();

function notifyKey(busId: string, stopName: string): string {
  return `${busId}::${stopName}`;
}

const NOTIFY_THRESHOLDS = [1, 2, 5, 10, 15];

export function checkArrivalNotification(
  busId: string,
  busNumber: string,
  stopName: string,
  routeNumber: string,
  origin: string,
  destination: string,
  minutesUntilArrival: number,
  confidence: 'high' | 'medium' | 'low'
): ArrivalNotification | null {
  if (minutesUntilArrival < 1 || confidence === 'low') return null;

  const key = notifyKey(busId, stopName);
  const lastNotified = notifiedArrivals.get(key);

  for (const threshold of NOTIFY_THRESHOLDS) {
    if (
      minutesUntilArrival <= threshold &&
      minutesUntilArrival > threshold - 1.5 &&
      (!lastNotified || Date.now() - lastNotified > 60000)
    ) {
      notifiedArrivals.set(key, Date.now());
      return { busId, busNumber, stopName, routeNumber, origin, destination, minutesUntilArrival, confidence, timestamp: Date.now() };
    }
  }

  return null;
}

export function canShowNotification(): boolean {
  if (typeof window === 'undefined') return false;
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'default') {
    Notification.requestPermission();
  }
  return false;
}

export function showBrowserNotification(notif: ArrivalNotification): void {
  if (!canShowNotification()) return;
  try {
    new Notification(`Bus ${notif.busNumber} arriving`, {
      body: `${notif.routeNumber} • ${notif.origin}→${notif.destination} — ${notif.minutesUntilArrival} min away from ${notif.stopName}`,
      icon: '/icon-192.png',
      tag: `bus-arrival-${notif.busId}-${notif.stopName}`,
      silent: false
    });
  } catch {}
}

const STOP_WATCH_PREFIX = 'tn-bustrack-watch-';
export function getWatchedStops(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(`${STOP_WATCH_PREFIX}list`);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
export function toggleWatchedStop(stopName: string): boolean {
  const current = getWatchedStops();
  const idx = current.indexOf(stopName);
  if (idx >= 0) current.splice(idx, 1);
  else current.push(stopName);
  localStorage.setItem(`${STOP_WATCH_PREFIX}list`, JSON.stringify(current));
  return idx < 0;
}
export function isStopWatched(stopName: string): boolean {
  return getWatchedStops().includes(stopName);
}
