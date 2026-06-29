export type Operator = 'TNSTC';
export type BusStatus = 'running' | 'delayed' | 'stopped';
export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export interface Stop {
  id: string;
  name: string;
  lat: number;
  lng: number;
  sequence: number;
  routeId?: string;
}

export interface Route {
  id: string;
  number: string;
  name: string;
  operator: Operator;
  busType: string;
  origin: string;
  destination: string;
  status: string;
  stops: Stop[];
}

export interface Bus {
  id: string;
  number: string;
  routeId: string;
  route: Route;
  operator: Operator;
  busType: string;
  status: BusStatus;
  seatCapacity: number;
  seatsAvailable: number;
  etaMinutes: number;
  currentStop: string;
  area: string;
  road: string;
  city: string;
  latitude: number;
  longitude: number;
  pathIndex: number;
  speed: number;
  passengersInside: number;
}

export interface Alert {
  id: string;
  title: string;
  message: string;
  severity: AlertSeverity;
  routeId?: string;
  createdAt: string;
}

export interface Favorite {
  id: string;
  routeId: string;
  savedAt: string;
}

export function normalizeAPIBus(raw: any, allStops: Stop[]): Bus {
  const speed = raw.speed || 0;
  const status: BusStatus = speed > 0 ? 'running' : raw.status || 'stopped';
  const seatsAvailable = raw.seats ?? raw.seatsAvailable ?? 0;
  const seatCapacity = raw.seatCapacity ?? raw.totalSeats ?? 42;
  const inside = raw.inside ?? raw.passengersInside ?? 0;
  const busId = raw.busId || raw.id;
  const busNumber = raw.busNumber || raw.number || busId;
  const routeName = raw.route || raw.routeName || busId;

  const routeStops = allStops.filter(s => s.routeId === busId);
  const stopsWithRouteKey = routeStops.length > 0 ? routeStops : allStops.filter(s => routeName.toLowerCase().includes(s.routeId || ''));

  const route: Route = {
    id: raw.routeId || busId || '',
    number: raw.routeNumber || busNumber.split(' ').pop() || busNumber,
    name: routeName,
    operator: 'TNSTC',
    busType: 'Normal',
    origin: raw.currentStop || routeName || '',
    destination: stopsWithRouteKey.length > 0 ? stopsWithRouteKey[stopsWithRouteKey.length - 1].name : '',
    status: status,
    stops: stopsWithRouteKey,
  };

  return {
    id: busId,
    number: busNumber,
    routeId: route.id,
    route,
    operator: 'TNSTC',
    busType: 'Normal',
    status,
    seatCapacity,
    seatsAvailable,
    etaMinutes: raw.nextStops?.[0]?.etaMin ?? 0,
    currentStop: raw.currentStop || '',
    area: raw.area || '',
    road: raw.road || '',
    city: raw.city || '',
    latitude: raw.lat ?? raw.latitude ?? 0,
    longitude: raw.lng ?? raw.longitude ?? 0,
    pathIndex: 0,
    speed,
    passengersInside: inside,
  };
}

export async function fetchBuses(stops: Stop[]): Promise<Bus[]> {
  try {
    const res = await fetch('/api/buses');
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data.map(b => normalizeAPIBus(b, stops));
  } catch {
    return [];
  }
}

export async function fetchStops(): Promise<Stop[]> {
  try {
    const res = await fetch('/api/stops');
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function fetchAlerts(): Promise<Alert[]> {
  try {
    const res = await fetch('/api/alerts');
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}
