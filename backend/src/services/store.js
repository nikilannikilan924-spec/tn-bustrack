const bcrypt = require('bcryptjs');
const seed = require('../data/seedData');
const { getPrisma } = require('../config/db');
const { lower, createId } = require('../utils/helpers');
const { nearbyStops } = require('./locationService');

const memory = {
  routes: seed.routes.map((route) => ({ ...route, stops: route.stops.map((stop) => ({ ...stop, routeId: route.id })) })),
  buses: seed.buses.map((bus) => ({ ...bus })),
  alerts: seed.alerts.map((alert) => ({ ...alert })),
  users: seed.users.map((user) => ({ ...user }))
};

function prismaReady() {
  return Boolean(process.env.DATABASE_URL && getPrisma());
}

function prisma() {
  return getPrisma();
}

async function listRoutes() {
  if (prismaReady()) {
    return prisma().route.findMany({ include: { stops: { orderBy: { stopOrder: 'asc' } }, buses: true } });
  }
  return memory.routes;
}

async function getRoute(id) {
  if (prismaReady()) {
    return prisma().route.findUnique({ where: { id }, include: { stops: { orderBy: { stopOrder: 'asc' } }, buses: true } });
  }
  return memory.routes.find((route) => route.id === id) || null;
}

async function searchRoutes({ origin, destination, routeNumber } = {}) {
  const routes = await listRoutes();
  return routes.filter((route) => {
    const matchesOrigin = origin ? lower(route.origin).includes(lower(origin)) : true;
    const matchesDestination = destination ? lower(route.destination).includes(lower(destination)) : true;
    const matchesNumber = routeNumber ? lower(route.routeNumber).includes(lower(routeNumber)) : true;
    return matchesOrigin && matchesDestination && matchesNumber;
  });
}

async function listStops() {
  if (prismaReady()) {
    return prisma().stop.findMany({ include: { route: true }, orderBy: [{ routeId: 'asc' }, { stopOrder: 'asc' }] });
  }
  return memory.routes.flatMap((route) => route.stops.map((stop) => ({ ...stop, route: route })));
}

async function getStop(id) {
  if (prismaReady()) {
    return prisma().stop.findUnique({ where: { id }, include: { route: true, alerts: true } });
  }
  return memory.routes.flatMap((route) => route.stops.map((stop) => ({ ...stop, route }))).find((stop) => stop.id === id) || null;
}

async function nearbyStopsQuery(lat, lng, radiusKm = 5) {
  const stops = await listStops();
  return nearbyStops(stops, Number(lat), Number(lng), Number(radiusKm));
}

async function listBuses() {
  if (prismaReady()) {
    return prisma().bus.findMany({ include: { route: { include: { stops: { orderBy: { stopOrder: 'asc' } } } } }, orderBy: { lastUpdated: 'desc' } });
  }
  const routeMap = new Map(memory.routes.map((route) => [route.id, route]));
  return memory.buses.map((bus) => ({ ...bus, route: routeMap.get(bus.routeId) || null }));
}

async function getBus(id) {
  if (prismaReady()) {
    return prisma().bus.findUnique({ where: { id }, include: { route: { include: { stops: { orderBy: { stopOrder: 'asc' } } } } } });
  }
  return (await listBuses()).find((bus) => bus.id === id) || null;
}

async function updateBusLocation(id, payload) {
  if (prismaReady()) {
    return prisma().bus.update({ where: { id }, data: { ...payload, lastUpdated: new Date() } });
  }
  const bus = memory.buses.find((item) => item.id === id);
  if (!bus) return null;
  Object.assign(bus, payload, { lastUpdated: new Date().toISOString() });
  return bus;
}

async function updateBusSeats(id, payload) {
  if (prismaReady()) {
    return prisma().bus.update({ where: { id }, data: { ...payload, lastUpdated: new Date() } });
  }
  const bus = memory.buses.find((item) => item.id === id);
  if (!bus) return null;
  Object.assign(bus, payload, { lastUpdated: new Date().toISOString() });
  return bus;
}

async function listAlerts() {
  if (prismaReady()) {
    return prisma().alert.findMany({ include: { user: true, stop: { include: { route: true } } }, orderBy: { createdAt: 'desc' } });
  }
  return memory.alerts;
}

async function createAlert(payload) {
  if (prismaReady()) {
    return prisma().alert.create({ data: payload });
  }
  const alert = { id: createId('alert'), createdAt: new Date().toISOString(), isActive: true, notifyMinutesBefore: 10, ...payload };
  memory.alerts.push(alert);
  return alert;
}

async function removeAlert(id) {
  if (prismaReady()) {
    return prisma().alert.delete({ where: { id } });
  }
  const index = memory.alerts.findIndex((item) => item.id === id);
  if (index === -1) return null;
  return memory.alerts.splice(index, 1)[0];
}

async function registerUser({ name, phone, email, password }) {
  const passwordHash = await bcrypt.hash(password, 10);
  if (prismaReady()) {
    return prisma().user.create({ data: { name, phone, email, password: passwordHash } });
  }
  const user = { id: createId('user'), name, phone, email, password: passwordHash, createdAt: new Date().toISOString() };
  memory.users.push(user);
  return user;
}

async function findUserByLogin(login) {
  if (prismaReady()) {
    return prisma().user.findFirst({ where: { OR: [{ phone: login }, { email: login }] } });
  }
  return memory.users.find((user) => user.phone === login || user.email === login) || null;
}

async function getProfile(userId) {
  if (prismaReady()) {
    return prisma().user.findUnique({ where: { id: userId }, include: { alerts: true } });
  }
  return memory.users.find((user) => user.id === userId) || null;
}

module.exports = {
  listRoutes,
  getRoute,
  searchRoutes,
  listStops,
  getStop,
  nearbyStopsQuery,
  listBuses,
  getBus,
  updateBusLocation,
  updateBusSeats,
  listAlerts,
  createAlert,
  removeAlert,
  registerUser,
  findUserByLogin,
  getProfile
};
