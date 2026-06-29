require('dotenv').config();

const path = require('path');
const fs = require('fs');
const https = require('https');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const next = require('next');


const CONFIG_FILE = path.join(__dirname, '..', 'data', 'configs.json');

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
let deletedBuses = new Set();

// ── CONFIG PERSISTENCE ─────────────────────────────────────
function ensureDataDir() {
  const dir = path.dirname(CONFIG_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function loadConfigs() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
      if (data.busConfigs) busConfigs = data.busConfigs;
      if (data.deletedBuses && Array.isArray(data.deletedBuses)) {
        data.deletedBuses.forEach(id => deletedBuses.add(id));
      }
      const count = Object.keys(busConfigs).length;
      if (count > 0) console.log(`Loaded ${count} bus config(s) from file`);
    }
  } catch (e) { console.error('Failed to load configs:', e.message); }
}

function saveConfigs() {
  try {
    ensureDataDir();
    const data = { busConfigs, deletedBuses: [...deletedBuses] };
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(data, null, 2));
  } catch (e) { console.error('Failed to save configs:', e.message); }
}

// ── HELPERS ─────────────────────────────────────────────────
function deg2rad(deg) { return deg * (Math.PI / 180); }

const GEO_CACHE = {};

function reverseGeocode(lat, lng, busId) {
  const key = `${lat.toFixed(3)},${lng.toFixed(3)}`;
  if (GEO_CACHE[key]) {
    const cached = GEO_CACHE[key];
    if (busPositions[busId]) {
      if (cached.area) busPositions[busId].area = cached.area;
      if (cached.road) busPositions[busId].road = cached.road;
      if (cached.city) busPositions[busId].city = cached.city;
    }
    return;
  }
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
  const req = https.get(url, { headers: { 'User-Agent': 'TN-BusTrack/1.0' } }, (res) => {
    let data = '';
    res.on('data', c => { try { data += c; } catch(_){} });
    res.on('end', () => {
      try {
        const j = JSON.parse(data);
        const a = j.address || {};
        const geo = {
          area: a.suburb || a.neighbourhood || a.village || a.town || a.municipality || a.county || '',
          road: a.road || a.pedestrian || a.street || '',
          city: a.city || a.town || a.county || a.state_district || a.state || '',
        };
        GEO_CACHE[key] = geo;
        if (busPositions[busId]) {
          if (geo.area) busPositions[busId].area = geo.area;
          if (geo.road) busPositions[busId].road = geo.road;
          if (geo.city) busPositions[busId].city = geo.city;
          io.to('all-buses').emit('busUpdate', busPositions[busId]);
        }
      } catch (_) {}
    });
    res.on('error', () => {});
  });
  req.on('error', () => {});
  req.setTimeout(5000, () => { req.destroy(); });
}

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

const STOPS = {};

function getNearestStop(lat, lng, routeKey, customStops) {
  const stops = customStops || STOPS[routeKey];
  if (!stops || stops.length === 0) {
    return { stop: { name: '', lat, lng }, distKm: 0 };
  }
  let nearest = stops[0];
  let minDist = Infinity;
  stops.forEach(stop => {
    const d = getDistanceKm(lat, lng, stop.lat, stop.lng);
    if (d < minDist) { minDist = d; nearest = stop; }
  });
  return { stop: nearest, distKm: minDist };
}

function getNextStops(currentStopName, routeKey, busLat, busLng, customStops) {
  const stops = customStops || STOPS[routeKey];
  if (!stops || stops.length === 0) return [];
  if (!currentStopName || currentStopName === 'Unknown') return [];
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
  let { busId, lat, lng, speed, seats, inside, route, gpsFixed } = req.body;
  if (busId) busId = busId.trim();
  if (!busId) return res.status(400).json({ error: 'busId required' });
  if (deletedBuses.has(busId)) return res.status(403).json({ error: 'Bus deleted' });

  const prev = busPositions[busId];
  const validCoord = lat && lng && Math.abs(lat) > 0.01 && Math.abs(lng) > 0.01;

  if (!validCoord && prev) {
    lat = prev.lat;
    lng = prev.lng;
    speed = 0;
  }

  const cfg = busConfigs[busId] || {};
  const routeKey = cfg.routeKey || 'namakkal-salem';
  const customStops = cfg.stops;

  if (!validCoord && !prev) {
    if (customStops && customStops.length > 0) {
      lat = customStops[0].lat;
      lng = customStops[0].lng;
      gpsFixed = false;
    } else {
      return res.json({ ok: true, message: 'No GPS fix yet' });
    }
  }

  const { stop, distKm } = getNearestStop(lat, lng, routeKey, customStops);
  const nextStops = getNextStops(stop.name, routeKey, lat, lng, customStops);

  const routeId = cfg.routeKey || busId;
  const totalSeats = cfg.totalSeats || 42;
  const pInside = inside ?? (prev ? prev.inside : 0);
  const busData = {
    busId,
    routeId,
    totalSeats,
    lat,
    lng,
    speed: speed || 0,
    seats: totalSeats - pInside,
    inside: pInside,
    route: cfg.routeName || route || busId,
    busNumber: cfg.busNumber || busId,
    gpsFixed: gpsFixed || false,
    currentStop: stop.name || '',
    area: prev?.area || stop.name || '',
    road: prev?.road || cfg.routeName || '',
    city: prev?.city || '',
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

  if (gpsFixed && validCoord(lat, lng)) {
    reverseGeocode(Number(lat), Number(lng), busId);
  }
});

// ── ESP32 SENDS COUNT UPDATE ────────────────────────────────
app.post('/api/buses/count', (req, res) => {
  let { busId, inside } = req.body;
  if (busId) busId = busId.trim();
  if (!busId) return res.status(400).json({ error: 'busId required' });
  if (deletedBuses.has(busId)) return res.status(403).json({ error: 'Bus deleted' });

  const pInside = inside ?? 0;
  if (busPositions[busId]) {
    const cfg = busConfigs[busId] || {};
    const totalSeats = cfg.totalSeats || 42;
    busPositions[busId].inside = pInside;
    busPositions[busId].seats = totalSeats - pInside;
  }

  io.to(`bus-${busId}`).emit('countUpdate', { busId, inside: pInside });
  io.to('all-buses').emit('countUpdate', { busId, inside: pInside });

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
  let { busId, totalSeats, routeName, routeKey, driverName, busNumber } = req.body;
  if (busId) busId = busId.trim();
  if (!busId) return res.status(400).json({ error: 'busId required' });

  busConfigs[busId] = {
    busId,
    totalSeats: totalSeats || 42,
    routeName: routeName || '',
    routeKey: routeKey || 'namakkal-salem',
    driverName: driverName || '',
    busNumber: busNumber || busId,
    updatedAt: new Date().toISOString()
  };

  io.to(`bus-${busId}`).emit('configUpdate', busConfigs[busId]);
  saveConfigs();

  console.log(`Config saved for ${busId}`);
  res.json({ ok: true, config: busConfigs[busId] });
});

// ── APP: GET BUS CONFIG ──────────────────────────────────────
app.get('/api/config/:busId', (req, res) => {
  const cfg = busConfigs[req.params.busId];
  res.json(cfg || { busId: req.params.busId, totalSeats: 42, routeName: '', routeKey: 'namakkal-salem' });
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
  if (bus.busId) bus.busId = bus.busId.trim();
  memoryBuses.push(bus);
  const busId = bus.busId || bus.number || bus.id;
  const routeKey = busId;
  deletedBuses.delete(busId);
  busConfigs[busId] = {
    busId,
    totalSeats: bus.seatCapacity || 42,
    routeName: bus.routeName || '',
    routeKey,
    driverName: '',
    busNumber: bus.number || busId,
    stops: bus.stops || [],
    updatedAt: new Date().toISOString()
  };
  saveConfigs();
  res.status(201).json({ bus, config: busConfigs[busId] });
});

// Load deleted buses from env var (survives deploy)
if (process.env.DELETED_BUSES) {
  process.env.DELETED_BUSES.split(',').map(s => s.trim()).filter(Boolean).forEach(id => deletedBuses.add(id));
}

if (deletedBuses.size > 0) {
  console.log('Loaded deleted buses:', [...deletedBuses]);
  saveConfigs();
}

app.delete('/api/buses/:busId', (req, res) => {
  const busId = req.params.busId;
  deletedBuses.add(busId);
  delete busPositions[busId];
  delete busConfigs[busId];
  delete gpsHistory[busId];
  saveConfigs();
  io.to('all-buses').emit('busRemoved', busId);
  res.json({ ok: true, removed: busId });
});

app.get('/api/config', (_req, res) => {
  res.json(Object.values(busConfigs));
});

// ── BACKWARD-COMPATIBLE ENDPOINTS (old firmware) ────────────
app.post('/api/bus/location', (req, res) => {
  let { busId, latitude, longitude, speed, passengersInside, seatsAvailable } = req.body;
  if (busId) busId = busId.trim();
  if (!busId || latitude == null || longitude == null) {
    return res.status(400).json({ error: 'busId, latitude, longitude required' });
  }
  if (deletedBuses.has(busId)) return res.status(403).json({ error: 'Bus deleted' });
  const cfg = busConfigs[busId] || {};
  const routeKey = cfg.routeKey || 'namakkal-salem';
  const customStops = cfg.stops;
  const { stop, distKm } = getNearestStop(Number(latitude), Number(longitude), routeKey, customStops);
  const nextStops = getNextStops(stop.name, routeKey, Number(latitude), Number(longitude), customStops);
  const totalSeats = cfg.totalSeats || 42;
  const busData = {
    busId,
    routeId: cfg.routeKey || busId,
    totalSeats,
    lat: Number(latitude),
    lng: Number(longitude),
    speed: speed || 0,
    seats: seatsAvailable ?? totalSeats - (passengersInside || 0),
    inside: passengersInside || 0,
    route: cfg.routeName || busId,
    busNumber: cfg.busNumber || busId,
    gpsFixed: true,
    currentStop: stop.name || '',
    distFromStop: distKm.toFixed(2),
    nextStops,
    lastUpdate: new Date().toISOString(),
  };
  busPositions[busId] = busData;
  io.to('all-buses').emit('busUpdate', busData);
  res.json({ ok: true });
});

app.post('/api/bus/passengers', (req, res) => {
  let { busId, passengersInside } = req.body;
  if (busId) busId = busId.trim();
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
      origin: cfg.routeName || '',
      destination: '',
      stops: []
    }
  });
});

// ── HEALTH CHECK ─────────────────────────────────────────────
// ── STOPS LIST ───────────────────────────────────────────────
function getAllStops() {
  const result = [];
  const seen = new Set();
  Object.entries(busConfigs).forEach(([busId, cfg]) => {
    const routeKey = cfg.routeKey || busId;
    (cfg.stops || []).forEach((stop, i) => {
      const key = `${stop.name}-${stop.lat}-${stop.lng}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push({
          id: `${routeKey}-${i}`,
          name: stop.name,
          lat: stop.lat,
          lng: stop.lng,
          sequence: i + 1,
          routeId: routeKey,
        });
      }
    });
  });
  return result;
}

app.get('/api/stops', (_req, res) => {
  res.json(getAllStops());
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
// 30s allows 3+ missed ESP32 updates (interval=8s) + WiFi reconnect time
setInterval(() => {
  const now = Date.now();
  Object.keys(busPositions).forEach((busId) => {
    const bus = busPositions[busId];
    if (!bus || !bus.lastUpdate) return;
    const age = now - new Date(bus.lastUpdate).getTime();
    if (age > 30000) {
      console.log(`Removing stale bus ${busId} (offline ${Math.round(age / 1000)}s)`);
      delete busPositions[busId];
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
  loadConfigs();
  server.listen(PORT, () => {
    console.log(`TN BusTrack production server running on http://localhost:${PORT}`);
  });
});
