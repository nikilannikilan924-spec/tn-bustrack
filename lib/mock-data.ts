import seed from '@/data/tn-bustrack.seed.json';

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

const routes: Route[] = seed.routes as Route[];
const routeMap = new Map(routes.map((route) => [route.id, route]));

const buses: Bus[] = (seed.buses as Omit<Bus, 'route'>[]).map((bus) => ({
  ...bus,
  route: routeMap.get(bus.routeId) as Route
}));

const alerts: Alert[] = seed.alerts as Alert[];
const favorites: Favorite[] = [];

const stops = routes.flatMap((route) => route.stops.map((stop) => ({ ...stop, routeId: route.id })));

const mockData = Object.freeze({ buses, routes, stops, alerts, favorites });

export { routes, buses, alerts, favorites, stops };

export function getMockDashboardData() {
  return mockData;
}
