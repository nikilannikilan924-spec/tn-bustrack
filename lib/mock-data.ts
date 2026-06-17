import seed from '@/data/tn-bustrack.seed.json';
import type { Operator, BusStatus, AlertSeverity, Stop, Route, Bus, Alert, Favorite } from './types';
export type { Operator, BusStatus, AlertSeverity, Stop, Route, Bus, Alert, Favorite } from './types';
export { normalizeAPIBus, fetchBuses, fetchStops, fetchAlerts } from './types';

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
