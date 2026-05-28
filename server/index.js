require('dotenv').config();

const express = require('express');
const http = require('http');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const { Server } = require('socket.io');

const Bus = require('./models/bus');
const Route = require('./models/route');
const Stop = require('./models/stop');
const Alert = require('./models/alert');
const User = require('./models/user');
const seed = require('../data/tn-bustrack.seed.json');

const port = Number(process.env.PORT || 4000);
const jwtSecret = process.env.JWT_SECRET || 'tn-bustrack-secret';
const mongoUri = process.env.MONGODB_URI || '';

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const memory = {
  routes: seed.routes.map((route) => ({ ...route })),
  buses: seed.buses.map((bus) => ({ ...bus, tickCount: 0 })),
  stops: seed.routes.flatMap((route) => route.stops.map((stop) => ({ ...stop, routeId: route.id }))),
  alerts: seed.alerts.map((alert) => ({ ...alert })),
  users: []
};

function isDbReady() {
  return mongoose.connection.readyState === 1;
}

function signToken(user) {
  return jwt.sign({ sub: String(user._id || user.id), email: user.email, name: user.name }, jwtSecret, {
    expiresIn: '7d'
  });
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return res.status(401).json({ error: 'Missing token' });

  try {
    req.user = jwt.verify(token, jwtSecret);
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function buildPath(stops) {
  const points = [];
  for (let index = 0; index < stops.length - 1; index += 1) {
    const start = stops[index];
    const end = stops[index + 1];
    for (let step = 0; step < 12; step += 1) {
      const ratio = step / 12;
      points.push({
        lat: Number((start.lat + (end.lat - start.lat) * ratio).toFixed(6)),
        lng: Number((start.lng + (end.lng - start.lng) * ratio).toFixed(6))
      });
    }
  }
  if (stops.length) {
    const last = stops[stops.length - 1];
    points.push({ lat: last.lat, lng: last.lng });
  }
  return points;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

async function seedDatabase() {
  if (!isDbReady()) return;

  const [routeCount, busCount, stopCount, alertCount, userCount] = await Promise.all([
    Route.countDocuments(),
    Bus.countDocuments(),
    Stop.countDocuments(),
    Alert.countDocuments(),
    User.countDocuments()
  ]);

  if (!routeCount) await Route.insertMany(seed.routes);
  if (!stopCount) await Stop.insertMany(memory.stops);
  if (!busCount) await Bus.insertMany(seed.buses.map((bus) => ({ ...bus, tickCount: 0 })));
  if (!alertCount) await Alert.insertMany(seed.alerts);
  if (!userCount) {
    await User.create({
      name: 'Admin',
      email: 'admin@tnbustrack.local',
      passwordHash: await bcrypt.hash('password123', 10),
      favorites: []
    });
  }
}

async function bootstrap() {
  if (mongoUri) {
    try {
      await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 4000 });
      await seedDatabase();
      console.log('MongoDB connected');
    } catch (error) {
      console.warn('MongoDB connection failed, falling back to memory store:', error.message);
    }
  }
}

function normalizeRoute(route) {
  return {
    ...route,
    stops: route.stops || []
  };
}

async function getRoutesData() {
  if (isDbReady()) {
    const routes = await Route.find().lean();
    return routes.map(normalizeRoute);
  }
  return memory.routes.map(normalizeRoute);
}

async function getStopsData() {
  if (isDbReady()) return Stop.find().lean();
  return memory.stops;
}

async function getAlertsData() {
  if (isDbReady()) return Alert.find().sort({ createdAt: -1 }).lean();
  return memory.alerts;
}

async function getUsersData() {
  if (isDbReady()) return User.find().lean();
  return memory.users;
}

async function getBusesData() {
  const routes = await getRoutesData();
  const routeMap = new Map(routes.map((route) => [route.id, route]));

  if (isDbReady()) {
    const buses = await Bus.find().lean();
    return buses.map((bus) => ({ ...bus, route: routeMap.get(bus.routeId) || null }));
  }

  return memory.buses.map((bus) => ({ ...bus, route: routeMap.get(bus.routeId) || null }));
}

async function getBusById(id) {
  const buses = await getBusesData();
  return buses.find((bus) => String(bus._id || bus.id) === id) || null;
}

async function getLiveLocation(id) {
  const bus = await getBusById(id);
  if (!bus) return null;
  return {
    id: bus._id || bus.id,
    latitude: bus.latitude,
    longitude: bus.longitude,
    status: bus.status,
    updatedAt: new Date().toISOString()
  };
}

async function tickBuses() {
  const routes = await getRoutesData();
  const routeMap = new Map(routes.map((route) => [route.id, route]));

  if (isDbReady()) {
    const buses = await Bus.find();
    for (const bus of buses) {
      const route = routeMap.get(bus.routeId);
      if (!route?.stops?.length) continue;
      const path = buildPath(route.stops);
      const nextPathIndex = (bus.pathIndex + (bus.status === 'stopped' ? (bus.tickCount % 3 === 0 ? 1 : 0) : bus.status === 'delayed' ? (bus.tickCount % 2 === 0 ? 1 : 0) : 1)) % path.length;
      const point = path[nextPathIndex];
      const stopIndex = Math.min(Math.floor(nextPathIndex / 12), route.stops.length - 1);
      const remainingStops = route.stops.length - stopIndex - 1;

      bus.pathIndex = nextPathIndex;
      bus.latitude = point.lat;
      bus.longitude = point.lng;
      bus.currentStop = route.stops[stopIndex].name;
      bus.etaMinutes = clamp(remainingStops * 4 + (bus.status === 'delayed' ? 4 : 0) + (bus.tickCount % 2), 2, 240);
      bus.seatsAvailable = clamp(bus.seatsAvailable + (bus.status === 'running' ? -1 : bus.status === 'delayed' ? 1 : 0), 0, bus.seatCapacity);
      bus.speed = bus.status === 'stopped' ? 0 : clamp(bus.speed + (Math.round(Math.random() * 10) - 5), 0, 80);
      const passengerDelta = bus.status === 'stopped' ? Math.floor(Math.random() * 4) : Math.floor(Math.random() * 2);
      bus.passengersInside = clamp(bus.passengersInside + (Math.random() > 0.5 ? passengerDelta : -passengerDelta), 0, bus.seatCapacity);
      bus.seatsAvailable = bus.seatCapacity - bus.passengersInside;
      bus.tickCount += 1;
      await bus.save();
    }
    return getBusesData();
  }

  for (let index = 0; index < memory.buses.length; index += 1) {
    const bus = memory.buses[index];
    const route = routeMap.get(bus.routeId);
    if (!route?.stops?.length) continue;
    const path = buildPath(route.stops);
    const movement = bus.status === 'stopped' ? (bus.tickCount % 3 === 0 ? 1 : 0) : bus.status === 'delayed' ? (bus.tickCount % 2 === 0 ? 1 : 0) : 1;
    bus.pathIndex = (bus.pathIndex + movement) % path.length;
    const point = path[bus.pathIndex];
    const stopIndex = Math.min(Math.floor(bus.pathIndex / 12), route.stops.length - 1);
    const remainingStops = route.stops.length - stopIndex - 1;

    bus.latitude = point.lat;
    bus.longitude = point.lng;
    bus.currentStop = route.stops[stopIndex].name;
    bus.etaMinutes = clamp(remainingStops * 4 + (bus.status === 'delayed' ? 4 : 0) + (bus.tickCount % 2), 2, 240);
    bus.speed = bus.status === 'stopped' ? 0 : clamp(bus.speed + (Math.round(Math.random() * 10) - 5), 0, 80);
    const passengerDelta = bus.status === 'stopped' ? Math.floor(Math.random() * 4) : Math.floor(Math.random() * 2);
    bus.passengersInside = clamp(bus.passengersInside + (Math.random() > 0.5 ? passengerDelta : -passengerDelta), 0, bus.seatCapacity);
    bus.seatsAvailable = bus.seatCapacity - bus.passengersInside;
    bus.tickCount += 1;
  }

  return getBusesData();
}

async function createResource(model, memoryKey, body) {
  if (isDbReady()) return model.create(body);
  const item = { id: `${memoryKey}-${Date.now()}`, ...body };
  memory[memoryKey].push(item);
  return item;
}

async function updateResource(model, memoryKey, id, body) {
  if (isDbReady()) return model.findByIdAndUpdate(id, body, { new: true });
  const items = memory[memoryKey];
  const index = items.findIndex((item) => String(item._id || item.id) === id);
  if (index === -1) return null;
  items[index] = { ...items[index], ...body };
  return items[index];
}

async function deleteResource(model, memoryKey, id) {
  if (isDbReady()) return model.findByIdAndDelete(id);
  const items = memory[memoryKey];
  const index = items.findIndex((item) => String(item._id || item.id) === id);
  if (index === -1) return null;
  return items.splice(index, 1)[0];
}

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'TN BusTrack API' }));

app.get('/api/routes', async (_req, res) => res.json(await getRoutesData()));
app.get('/api/routes/:id', async (req, res) => {
  const routes = await getRoutesData();
  const route = routes.find((item) => String(item._id || item.id) === req.params.id);
  if (!route) return res.status(404).json({ error: 'Route not found' });
  res.json(route);
});
app.post('/api/routes', async (req, res) => res.status(201).json(await createResource(Route, 'routes', req.body)));
app.put('/api/routes/:id', async (req, res) => {
  const updated = await updateResource(Route, 'routes', req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Route not found' });
  res.json(updated);
});
app.delete('/api/routes/:id', async (req, res) => {
  const deleted = await deleteResource(Route, 'routes', req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Route not found' });
  res.json({ deleted: true });
});

app.get('/api/stops', async (_req, res) => res.json(await getStopsData()));
app.get('/api/stops/:id', async (req, res) => {
  const stops = await getStopsData();
  const stop = stops.find((item) => String(item._id || item.id) === req.params.id);
  if (!stop) return res.status(404).json({ error: 'Stop not found' });
  res.json(stop);
});
app.post('/api/stops', async (req, res) => res.status(201).json(await createResource(Stop, 'stops', req.body)));
app.put('/api/stops/:id', async (req, res) => {
  const updated = await updateResource(Stop, 'stops', req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Stop not found' });
  res.json(updated);
});
app.delete('/api/stops/:id', async (req, res) => {
  const deleted = await deleteResource(Stop, 'stops', req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Stop not found' });
  res.json({ deleted: true });
});

app.get('/api/buses', async (_req, res) => res.json(await getBusesData()));
app.get('/api/buses/:id', async (req, res) => {
  const bus = await getBusById(req.params.id);
  if (!bus) return res.status(404).json({ error: 'Bus not found' });
  res.json(bus);
});
app.get('/api/buses/:id/location', async (req, res) => {
  const location = await getLiveLocation(req.params.id);
  if (!location) return res.status(404).json({ error: 'Bus not found' });
  res.json(location);
});
app.post('/api/buses', async (req, res) => res.status(201).json(await createResource(Bus, 'buses', req.body)));
app.put('/api/buses/:id', async (req, res) => {
  const updated = await updateResource(Bus, 'buses', req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Bus not found' });
  res.json(updated);
});
app.delete('/api/buses/:id', async (req, res) => {
  const deleted = await deleteResource(Bus, 'buses', req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Bus not found' });
  res.json({ deleted: true });
});

app.get('/api/alerts', async (_req, res) => res.json(await getAlertsData()));
app.get('/api/alerts/:id', async (req, res) => {
  const alerts = await getAlertsData();
  const alert = alerts.find((item) => String(item._id || item.id) === req.params.id);
  if (!alert) return res.status(404).json({ error: 'Alert not found' });
  res.json(alert);
});
app.post('/api/alerts', async (req, res) => res.status(201).json(await createResource(Alert, 'alerts', req.body)));
app.put('/api/alerts/:id', async (req, res) => {
  const updated = await updateResource(Alert, 'alerts', req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Alert not found' });
  res.json(updated);
});
app.delete('/api/alerts/:id', async (req, res) => {
  const deleted = await deleteResource(Alert, 'alerts', req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Alert not found' });
  res.json({ deleted: true });
});

app.get('/api/users', async (_req, res) => res.json(await getUsersData()));
app.get('/api/users/:id', async (req, res) => {
  if (isDbReady()) {
    const user = await User.findById(req.params.id).lean();
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json(user);
  }
  const user = memory.users.find((item) => String(item.id) === req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  return res.json(user);
});
app.post('/api/users', async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) return res.status(400).json({ error: 'name, email, and password are required' });
  if (isDbReady()) {
    const user = await User.create({ name, email, passwordHash: await bcrypt.hash(password, 10), favorites: [] });
    return res.status(201).json(user);
  }
  const user = { id: `user-${Date.now()}`, name, email, passwordHash: await bcrypt.hash(password, 10), favorites: [] };
  memory.users.push(user);
  return res.status(201).json(user);
});
app.put('/api/users/:id', async (req, res) => {
  const updated = await updateResource(User, 'users', req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'User not found' });
  res.json(updated);
});
app.delete('/api/users/:id', async (req, res) => {
  const deleted = await deleteResource(User, 'users', req.params.id);
  if (!deleted) return res.status(404).json({ error: 'User not found' });
  res.json({ deleted: true });
});

app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) return res.status(400).json({ error: 'name, email, and password are required' });
  const existing = isDbReady() ? await User.findOne({ email }) : memory.users.find((item) => item.email === email);
  if (existing) return res.status(409).json({ error: 'Email already registered' });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = isDbReady()
    ? await User.create({ name, email, passwordHash, favorites: [] })
    : (() => {
        const created = { id: `user-${Date.now()}`, name, email, passwordHash, favorites: [] };
        memory.users.push(created);
        return created;
      })();

  res.status(201).json({ user: { id: user._id || user.id, name: user.name, email: user.email }, token: signToken(user) });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email and password are required' });

  const user = isDbReady() ? await User.findOne({ email }) : memory.users.find((item) => item.email === email);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

  res.json({ user: { id: user._id || user.id, name: user.name, email: user.email }, token: signToken(user) });
});

app.get('/api/me', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

io.on('connection', (socket) => {
  getBusesData().then((buses) => socket.emit('bus-location-update', buses));
  const timer = setInterval(async () => {
    const liveBuses = await tickBuses();
    io.emit('bus-location-update', liveBuses);
  }, 5000);
  socket.on('disconnect', () => clearInterval(timer));
});

bootstrap().finally(() => {
  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`Port ${port} is already in use. Set PORT to another value and try again.`);
      process.exit(1);
    }
    throw error;
  });
  server.listen(port, () => {
    console.log(`TN BusTrack API running on http://localhost:${port}`);
  });
});
