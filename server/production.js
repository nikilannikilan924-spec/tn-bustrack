require('dotenv').config();

const path = require('path');
const fs = require('fs');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const next = require('next');

const DELETED_BUSES_FILE = path.join(__dirname, '..', 'deleted-buses.json');

const dev = process.env.NODE_ENV !== 'production';
const nextApp = next({ dev, dir: path.join(__dirname, '..') });
const handle = nextApp.getRequestHandler();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.use(cors());
app.use(express.json());

// ── IN-MEMORY STORES ────────────────────────────────────────
let busPositions = {};
let busConfigs = {};
let gpsHistory = {};

// ── HELPERS ─────────────────────────────────────────────────
function deg2rad(deg) { return deg * (Math.PI / 180); }

function getDistanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = deg2rad(lat2 - lat1);
  const dLng = deg2rad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(deg2rad(lat1)) *
    Math.cos(deg2rad(lat2)) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const STOPS = {
  'namakkal-salem': [
    { name: 'Namakkal Bus Stand', lat: 11.2189, lng: 78.1670 },
    { name: 'Mohanur', lat: 11.2531, lng: 78.1231 },
    { name: 'Tiruchengode', lat: 11.3865, lng: 77.8942 },
    { name: 'Rasipuram', lat: 11.4596, lng: 78.1735 },
    { name: 'Salem Bus Stand', lat: 11.6643, lng: 78.1460 },
  ],
  'coimbatore-tirupur': [
    { name: 'Coimbatore Central', lat: 11.0168, lng: 76.9558 },
    { name: 'Kuniyamuthur', lat: 10.9838, lng: 76.9346 },
    { name: 'Mettupalayam', lat: 11.2988, lng: 76.9400 },
    { name: 'Tirupur Bus Stand', lat: 11.1085, lng: 77.3411 },
  ]
};

function getNearestStop(lat, lng, routeKey) {
  const stops = STOPS[routeKey] || STOPS['namakkal-salem'];
  let nearest = stops[0];
  let minDist = Infinity;
  stops.forEach(stop => {
    const d = getDistanceKm(lat, lng, stop.lat, stop.lng);
    if (d < minDist) { minDist = d; nearest = stop; }
  });
  return { stop: nearest, distKm: minDist };
}

function getNextStops(currentStopName, routeKey, busLat, busLng) {
  const stops = STOPS[routeKey] || STOPS['namakkal-salem'];
  const curIdx = stops.findIndex(s => s.name === currentStopName);
  if (curIdx === -1) return [];
  return stops.slice(curIdx + 1).map(stop => {
    const distKm = getDistanceKm(busLat, busLng, stop.lat, stop.lng);
    const etaMin = Math.round((distKm / 40) * 60);
    return { name: stop.name, distKm: distKm.toFixed(1), etaMin };
  });
}

function findBus(busId) {
  return Object.values(busPositions).find(b => b.busId === busId) || null;
}

// ── ESP32 SENDS GPS DATA ─────────────────────────────────────
app.post('/api/buses/update', (req, res) => {
  const { busId, lat, lng, speed, seats, inside, route, gpsFixed } = req.body;
  if (!busId) return res.status(400).json({ error: 'busId required' });
  if (deletedBuses.has(busId)) return res.status(403).json({ error: 'Bus deleted' });

  const cfg = busConfigs[busId] || {};
  const routeKey = cfg.routeKey || 'namakkal-salem';
  const { stop, distKm } = getNearestStop(lat, lng, routeKey);
  const nextStops = getNextStops(stop.name, routeKey, lat, lng);

  const busData = {
    busId,
    lat,
    lng,
    speed: speed || 0,
    seats: seats ?? 42,
    inside: inside ?? 0,
    route: route || cfg.routeName || 'Unknown Route',
    gpsFixed: gpsFixed || false,
    currentStop: stop.name,
    distFromStop: distKm.toFixed(2),
    nextStops,
    lastUpdate: new Date().toISOString(),
  };

  busPositions[busId] = busData;

  if (!gpsHistory[busId]) gpsHistory[busId] = [];
  gpsHistory[busId].push({ lat, lng, t: Date.now() });
  if (gpsHistory[busId].length > 100) gpsHistory[busId].shift();

  io.to(`bus-${busId}`).emit('busUpdate', busData);
  io.to('all-buses').emit('busUpdate', busData);

  res.json({ ok: true });
});

// ── ESP32 SENDS COUNT UPDATE ────────────────────────────────
app.post('/api/buses/count', (req, res) => {
  const { busId, inside, seats } = req.body;
  if (!busId) return res.status(400).json({ error: 'busId required' });
  if (deletedBuses.has(busId)) return res.status(403).json({ error: 'Bus deleted' });

  if (busPositions[busId]) {
    busPositions[busId].inside = inside;
    busPositions[busId].seats = seats;
  }

  io.to(`bus-${busId}`).emit('countUpdate', { busId, inside, seats });
  io.to('all-buses').emit('countUpdate', { busId, inside, seats });

  res.json({ ok: true });
});

// ── APP: GET ALL LIVE BUSES ──────────────────────────────────
app.get('/api/buses', (req, res) => {
  res.json(Object.values(busPositions));
});

// ── APP: GET SINGLE BUS ──────────────────────────────────────
app.get('/api/buses/:busId', (req, res) => {
  const bus = busPositions[req.params.busId];
  if (bus) return res.json(bus);
  res.status(404).json({ error: 'Bus not found' });
});



// ── APP: SAVE BUS CONFIG ─────────────────────────────────────
app.post('/api/config/save', (req, res) => {
  const { busId, totalSeats, routeName, routeKey, driverName, busNumber } = req.body;
  if (!busId) return res.status(400).json({ error: 'busId required' });

  busConfigs[busId] = {
    busId,
    totalSeats: totalSeats || 42,
    routeName: routeName || 'Unknown',
    routeKey: routeKey || 'namakkal-salem',
    driverName: driverName || 'Unknown',
    busNumber: busNumber || busId,
    updatedAt: new Date().toISOString()
  };

  io.to(`bus-${busId}`).emit('configUpdate', busConfigs[busId]);

  console.log(`Config saved for ${busId}`);
  res.json({ ok: true, config: busConfigs[busId] });
});

// ── APP: GET BUS CONFIG ──────────────────────────────────────
app.get('/api/config/:busId', (req, res) => {
  const cfg = busConfigs[req.params.busId];
  res.json(cfg || { busId: req.params.busId, totalSeats: 42, routeName: 'Default', routeKey: 'namakkal-salem' });
});

// ── STOPS ────────────────────────────────────────────────────
app.get('/api/stops/:routeKey', (req, res) => {
  res.json(STOPS[req.params.routeKey] || []);
});

// ── SETUP: SAVE ROUTE + BUS ─────────────────────────────────
const memoryRoutes = [];
const memoryBuses = [];

app.get('/api/routes', (_req, res) => res.json(memoryRoutes));

app.post('/api/routes', (req, res) => {
  const route = { id: `route-${Date.now()}`, ...req.body };
  memoryRoutes.push(route);
  res.status(201).json(route);
});

app.delete('/api/routes/:id', (req, res) => {
  const idx = memoryRoutes.findIndex(r => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Route not found' });
  memoryRoutes.splice(idx, 1);
  res.json({ deleted: true });
});

app.post('/api/bus/create', (req, res) => {
  const bus = { id: `bus-${Date.now()}`, ...req.body };
  memoryBuses.push(bus);
  const busId = bus.number || bus.id;
  busConfigs[busId] = {
    busId,
    totalSeats: bus.seatCapacity || 42,
    routeName: bus.routeName || 'Default',
    routeKey: 'namakkal-salem',
    driverName: 'Unknown',
    busNumber: bus.number || busId,
    updatedAt: new Date().toISOString()
  };
  res.status(201).json({ bus, config: busConfigs[busId] });
});

let deletedBuses = new Set();

// Load deleted buses from file (survives restart, not deploy)
try {
  if (fs.existsSync(DELETED_BUSES_FILE)) {
    const data = JSON.parse(fs.readFileSync(DELETED_BUSES_FILE, 'utf-8'));
    deletedBuses = new Set(data);
  }
} catch (e) { console.error('Failed to load deleted buses from file:', e.message); }

// Also load from env var (survives deploy — set DELETED_BUSES on Railway dashboard)
if (process.env.DELETED_BUSES) {
  process.env.DELETED_BUSES.split(',').map(s => s.trim()).filter(Boolean).forEach(id => deletedBuses.add(id));
}

if (deletedBuses.size > 0) {
  console.log('Loaded deleted buses:', [...deletedBuses]);
  saveDeletedBuses(); // sync file so it persists in container
}

function saveDeletedBuses() {
  try {
    fs.writeFileSync(DELETED_BUSES_FILE, JSON.stringify([...deletedBuses], null, 2));
  } catch (e) { console.error('Failed to save deleted buses:', e.message); }
}

app.delete('/api/buses/:busId', (req, res) => {
  const busId = req.params.busId;
  deletedBuses.add(busId);
  saveDeletedBuses();
  delete busPositions[busId];
  delete busConfigs[busId];
  delete gpsHistory[busId];
  io.to('all-buses').emit('busRemoved', busId);
  res.json({ ok: true, removed: busId });
});

app.get('/api/config', (_req, res) => {
  res.json(Object.values(busConfigs));
});

// ── BACKWARD-COMPATIBLE ENDPOINTS (old firmware) ────────────
app.post('/api/bus/location', (req, res) => {
  const { busId, latitude, longitude, speed, passengersInside, seatsAvailable } = req.body;
  if (!busId || latitude == null || longitude == null) {
    return res.status(400).json({ error: 'busId, latitude, longitude required' });
  }
  if (deletedBuses.has(busId)) return res.status(403).json({ error: 'Bus deleted' });
  const cfg = busConfigs[busId] || {};
  const busData = {
    busId,
    lat: Number(latitude),
    lng: Number(longitude),
    speed: speed || 0,
    seats: seatsAvailable ?? (cfg.totalSeats || 42) - (passengersInside || 0),
    inside: passengersInside || 0,
    route: cfg.routeName || 'Unknown',
    gpsFixed: true,
    currentStop: 'Unknown',
    lastUpdate: new Date().toISOString(),
  };
  busPositions[busId] = busData;
  io.to('all-buses').emit('busUpdate', busData);
  res.json({ ok: true });
});

app.post('/api/bus/passengers', (req, res) => {
  const { busId, passengersInside } = req.body;
  if (!busId || passengersInside == null) return res.status(400).json({ error: 'busId, passengersInside required' });
  if (busPositions[busId]) {
    busPositions[busId].inside = passengersInside;
    busPositions[busId].seats = (busConfigs[busId]?.totalSeats || 42) - passengersInside;
  }
  io.to('all-buses').emit('countUpdate', { busId, inside: passengersInside });
  res.json({ ok: true });
});

app.get('/api/device/config', (req, res) => {
  const entries = Object.entries(busConfigs);
  if (entries.length === 0) {
    return res.json({ configured: false, message: 'No bus found. Use /setup to create one.' });
  }
  const [busId, cfg] = entries[0];
  const pos = busPositions[busId];
  res.json({
    configured: true,
    bus: {
      id: busId,
      number: cfg.busNumber || busId,
      seatCapacity: cfg.totalSeats || 42,
      latitude: pos ? pos.lat : 0,
      longitude: pos ? pos.lng : 0,
      status: pos && pos.speed > 0 ? 'running' : 'stopped'
    },
    route: {
      id: 'route-1',
      origin: cfg.routeName || 'Unknown',
      destination: '',
      stops: []
    }
  });
});

// ── HEALTH CHECK ─────────────────────────────────────────────
// ── STOPS LIST ───────────────────────────────────────────────
const ALL_STOPS = [];
Object.entries(STOPS).forEach(([routeKey, stops]) => {
  stops.forEach((stop, i) => {
    ALL_STOPS.push({
      id: `${routeKey}-${i}`,
      name: stop.name,
      lat: stop.lat,
      lng: stop.lng,
      sequence: i + 1,
      routeId: routeKey,
    });
  });
});

app.get('/api/stops', (_req, res) => {
  res.json(ALL_STOPS);
});

// ── ALERTS ────────────────────────────────────────────────────
let memoryAlerts = [];

app.get('/api/alerts', (_req, res) => {
  res.json(memoryAlerts);
});

app.post('/api/alerts', (req, res) => {
  const alert = { id: `alert-${Date.now()}`, createdAt: new Date().toISOString(), ...req.body };
  memoryAlerts.push(alert);
  res.status(201).json(alert);
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'TN BusTrack API', busCount: Object.keys(busPositions).length });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    busCount: Object.keys(busPositions).length,
    uptime: Math.round(process.uptime()) + 's',
    timestamp: new Date().toISOString()
  });
});



// ── STALE BUS CLEANUP (every 10s, remove buses offline >30s) ─
setInterval(() => {
  const now = Date.now();
  Object.keys(busPositions).forEach((busId) => {
    const bus = busPositions[busId];
    if (!bus || !bus.lastUpdate) return;
    const age = now - new Date(bus.lastUpdate).getTime();
    if (age > 30000) {
      console.log(`Removing stale bus ${busId} (offline ${Math.round(age / 1000)}s)`);
      delete busPositions[busId];
      delete busConfigs[busId];
      delete gpsHistory[busId];
      io.to('all-buses').emit('busRemoved', busId);
    }
  });
}, 10000);

// ── SOCKET.IO ────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('watchAll', () => {
    socket.join('all-buses');
    socket.emit('currentBuses', Object.values(busPositions));
  });

  socket.on('watchBus', (busId) => {
    socket.join(`bus-${busId}`);
    if (busPositions[busId]) {
      socket.emit('busUpdate', busPositions[busId]);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// ── SERVE NEXT.JS ────────────────────────────────────────────
app.all('*', (req, res) => handle(req, res));

// ── START ────────────────────────────────────────────────────
const PORT = Number(process.env.PORT || 3000);

nextApp.prepare().then(() => {
  server.listen(PORT, () => {
    console.log(`TN BusTrack production server running on http://localhost:${PORT}`);
  });
});
