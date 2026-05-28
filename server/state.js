const seed = require('../data/tn-bustrack.seed.json');
const bcrypt = require('bcryptjs');

const routeMap = new Map(seed.routes.map((route) => [route.id, route]));
const SECONDS_PER_TICK = 5;
const SEGMENT_STEPS = 12;

function buildPath(stops) {
  const points = [];
  for (let index = 0; index < stops.length - 1; index += 1) {
    const start = stops[index];
    const end = stops[index + 1];
    for (let step = 0; step < SEGMENT_STEPS; step += 1) {
      const ratio = step / SEGMENT_STEPS;
      points.push({
        lat: Number((start.lat + (end.lat - start.lat) * ratio).toFixed(6)),
        lng: Number((start.lng + (end.lng - start.lng) * ratio).toFixed(6))
      });
    }
  }
  points.push({ lat: stops[stops.length - 1].lat, lng: stops[stops.length - 1].lng });
  return points;
}

const routes = seed.routes.map((route) => ({
  ...route,
  path: buildPath(route.stops)
}));

const stops = routes.flatMap((route) => route.stops.map((stop) => ({ ...stop, routeId: route.id })));

const alerts = [...seed.alerts];

const users = [];
const favorites = [];

const buses = seed.buses.map((bus) => {
  const route = routeMap.get(bus.routeId);
  return {
    ...bus,
    route,
    path: route ? buildPath(route.stops) : [],
    tickCount: 0,
    lastUpdated: new Date().toISOString()
  };
});

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function currentStopFor(bus) {
  const route = bus.route;
  if (!route?.stops?.length) return bus.currentStop;
  const stopIndex = Math.min(Math.floor(bus.pathIndex / SEGMENT_STEPS), route.stops.length - 1);
  return route.stops[stopIndex].name;
}

function updateBus(bus) {
  const route = bus.route;
  if (!route?.path?.length) return bus;

  const next = { ...bus };
  next.tickCount += 1;

  const movement =
    next.status === 'stopped' ? (next.tickCount % 3 === 0 ? 1 : 0) : next.status === 'delayed' ? (next.tickCount % 2 === 0 ? 1 : 0) : 1;

  next.pathIndex = (next.pathIndex + movement) % route.path.length;
  const point = route.path[next.pathIndex];
  next.latitude = point.lat;
  next.longitude = point.lng;
  next.currentStop = currentStopFor(next);

  const stopIndex = Math.min(Math.floor(next.pathIndex / SEGMENT_STEPS), route.stops.length - 1);
  const remainingStops = route.stops.length - stopIndex - 1;
  const trafficJitter = next.status === 'delayed' ? 4 : next.status === 'stopped' ? 2 : 0;
  next.etaMinutes = clamp(remainingStops * 4 + trafficJitter + (next.tickCount % 2), 2, 240);

  const seatDrift = next.status === 'running' ? -1 : next.status === 'delayed' ? 1 : 0;
  next.seatsAvailable = clamp(next.seatsAvailable + seatDrift + (next.tickCount % 2 === 0 ? 1 : 0), 0, next.seatCapacity);
  next.lastUpdated = new Date().toISOString();
  return next;
}

function advanceBuses() {
  for (let index = 0; index < buses.length; index += 1) {
    buses[index] = updateBus(buses[index]);
  }
  return getPublicBuses();
}

function getPublicBuses() {
  return buses.map(({ path, tickCount, lastUpdated, route, ...bus }) => ({ ...bus, route }));
}

function getBusById(id) {
  return getPublicBuses().find((bus) => bus.id === id) || null;
}

function getLiveBusLocation(id) {
  const bus = getBusById(id);
  if (!bus) return null;
  return {
    id: bus.id,
    latitude: bus.latitude,
    longitude: bus.longitude,
    status: bus.status,
    updatedAt: new Date().toISOString()
  };
}

function registerUser({ name, email, password }) {
  if (users.some((user) => user.email === email)) {
    return { error: 'Email already registered' };
  }

  const user = {
    id: `user-${users.length + 1}`,
    name,
    email,
    passwordHash: bcrypt.hashSync(password, 10),
    favorites: []
  };

  users.push(user);
  return user;
}

function loginUser({ email, password }) {
  const user = users.find((entry) => entry.email === email);
  if (!user) return null;
  if (!bcrypt.compareSync(password, user.passwordHash)) return null;
  return user;
}

function saveFavorite(routeId) {
  const exists = favorites.find((favorite) => favorite.routeId === routeId);
  if (exists) return exists;
  const favorite = { id: `fav-${favorites.length + 1}`, routeId, savedAt: new Date().toISOString() };
  favorites.push(favorite);
  return favorite;
}

function deleteFavorite(id) {
  const index = favorites.findIndex((favorite) => favorite.id === id);
  if (index === -1) return false;
  favorites.splice(index, 1);
  return true;
}

function getFavorites() {
  return favorites;
}

function getRoutes() {
  return routes;
}

function getStops() {
  return stops;
}

function getAlerts() {
  return alerts;
}

module.exports = {
  SECONDS_PER_TICK,
  advanceBuses,
  getAlerts,
  getBusById,
  getFavorites,
  getLiveBusLocation,
  getPublicBuses,
  getRoutes,
  getStops,
  loginUser,
  registerUser,
  saveFavorite,
  deleteFavorite
};
