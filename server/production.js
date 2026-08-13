require('dotenv').config();

const path = require('path');
const fs = require('fs');
const https = require('https');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mqtt = require('mqtt');
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
global.__busPositions = busPositions;
let busConfigs = {};
let gpsHistory = {};
let deletedBuses = new Set();
let passedStops = {}; // busId -> Set of stop names passed

// ── CONFIG PERSISTENCE ─────────────────────────────────────
function ensureDataDir() {
  const dir = path.dirname(CONFIG_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function loadConfigs() {
  let count = 0;
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
      if (data.busConfigs) busConfigs = data.busConfigs;
      if (data.deletedBuses && Array.isArray(data.deletedBuses)) {
        data.deletedBuses.forEach(id => deletedBuses.add(id));
      }
      if (data.passedStops) {
        for (const [k, v] of Object.entries(data.passedStops)) {
          passedStops[k] = new Set(v);
        }
      }
      if (data.busPositions) {
        Object.assign(busPositions, data.busPositions);
        console.log(`Restored ${Object.keys(data.busPositions).length} bus position(s) from file`);
      }
      count = Object.keys(busConfigs).length;
      Object.keys(busConfigs).forEach(id => {
        deletedBuses.delete(id);
        if (!busPositions[id]) {
          const cfg = busConfigs[id];
          const stops = cfg.stops || [];
          const firstStop = stops.length > 0 ? stops[0] : null;
          const virtualLat = firstStop ? firstStop.lat : 11.3;
          const virtualLng = firstStop ? firstStop.lng : 78.1;
          const virtualStop = firstStop ? firstStop.name : '';
          const nextStops = getNextStops(virtualStop, cfg.routeKey || id, virtualLat, virtualLng, cfg.stops);
          busPositions[id] = {
            busId: id,
            routeId: cfg.routeKey || id,
            totalSeats: cfg.totalSeats || 42,
            lat: virtualLat,
            lng: virtualLng,
            speed: 0,
            seats: cfg.totalSeats || 42,
            inside: 0,
            route: cfg.routeName || id,
            busNumber: cfg.busNumber || id,
            gpsFixed: false,
            currentStop: virtualStop,
            area: virtualStop,
            road: cfg.routeName || '',
            city: '',
            distFromStop: '0.00',
            nextStops,
            lastUpdate: new Date().toISOString(),
          };
        }
      });
      console.log(`Total bus positions: ${Object.keys(busPositions).length}`);
    } else {
      // No config file — create virtual positions from existing configs (on first start)
      Object.keys(busConfigs).forEach(id => {
        if (!busPositions[id]) {
          const cfg = busConfigs[id];
          const stops = cfg.stops || [];
          const firstStop = stops.length > 0 ? stops[0] : null;
          const virtualLat = firstStop ? firstStop.lat : 11.3;
          const virtualLng = firstStop ? firstStop.lng : 78.1;
          const virtualStop = firstStop ? firstStop.name : '';
          const nextStops = getNextStops(virtualStop, cfg.routeKey || id, virtualLat, virtualLng, cfg.stops);
          busPositions[id] = { busId: id, routeId: cfg.routeKey || id, totalSeats: cfg.totalSeats || 42, lat: virtualLat, lng: virtualLng, speed: 0, seats: cfg.totalSeats || 42, inside: 0, route: cfg.routeName || id, busNumber: cfg.busNumber || id, gpsFixed: false, currentStop: virtualStop, area: virtualStop, road: cfg.routeName || '', city: '', distFromStop: '0.00', nextStops, lastUpdate: new Date().toISOString() };
        }
      });
    }
    global.__busPositions = busPositions;
    if (count > 0) console.log(`Loaded ${count} bus config(s) from file`);
  } catch (e) { console.error('Failed to load configs:', e.message); }
}

function saveConfigs() {
  try {
    ensureDataDir();
    const passed = {};
    for (const [k, v] of Object.entries(passedStops)) passed[k] = [...v];
    const data = { busConfigs, deletedBuses: [...deletedBuses], busPositions, passedStops: passed };
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

function getNearestStop(lat, lng, routeKey, customStops, busId) {
  const stops = customStops || STOPS[routeKey];
  if (!stops || stops.length === 0) {
    return { stop: { name: '', lat, lng }, distKm: 0 };
  }
  const passed = passedStops[busId] || new Set();
  let nearest = stops[0];
  let minDist = Infinity;
  stops.forEach(stop => {
    if (passed.has(stop.name)) return;
    const d = getDistanceKm(lat, lng, stop.lat, stop.lng);
    if (d < minDist) { minDist = d; nearest = stop; }
  });
  return { stop: nearest, distKm: minDist };
}

function getNextStops(currentStopName, routeKey, busLat, busLng, customStops, speedKmh) {
  const stops = customStops || STOPS[routeKey];
  if (!stops || stops.length === 0) return [];
  if (!currentStopName || currentStopName === 'Unknown') return [];
  const curIdx = stops.findIndex(s => s.name === currentStopName);
  if (curIdx === -1) return [];
  const avgSpeed = (speedKmh && speedKmh > 5) ? speedKmh : 40;
  return stops.slice(curIdx + 1).map(stop => {
    const distKm = getDistanceKm(busLat, busLng, stop.lat, stop.lng);
    const etaMin = Math.round((distKm / avgSpeed) * 60);
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
  deletedBuses.delete(busId);

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

  const { stop, distKm } = getNearestStop(lat, lng, routeKey, customStops, busId);
  // Auto-advance: if within 300m of a stop and moving away, mark it passed
  const stops = customStops || STOPS[routeKey];
  if (stops && stops.length > 0 && distKm < 0.3 && prev && stop.name) {
    const prevDist = getDistanceKm(prev.lat, prev.lng, stop.lat, stop.lng);
    if (prevDist < distKm) { // moving away from this stop
      if (!passedStops[busId]) passedStops[busId] = new Set();
      passedStops[busId].add(stop.name);
    }
  }
  const nextStops = getNextStops(stop.name, routeKey, lat, lng, customStops, speed);

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
    gpsFixed: validCoord ? (gpsFixed || false) : (prev ? prev.gpsFixed : false),
    currentStop: stop.name || '',
    area: prev?.area || '',
    road: prev?.road || '',
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

  if (validCoord) {
    reverseGeocode(Number(lat), Number(lng), busId);
  }
});

// ── ESP32 SENDS COUNT UPDATE ────────────────────────────────
app.post('/api/buses/count', (req, res) => {
  let { busId, inside } = req.body;
  if (busId) busId = busId.trim();
  if (!busId) return res.status(400).json({ error: 'busId required' });
  // Auto-undelete if someone is reporting data for this bus
  deletedBuses.delete(busId);

  const pInside = inside ?? 0;
  if (!busConfigs[busId]) {
    busConfigs[busId] = { busId, totalSeats: 42, routeName: '', routeKey: busId, driverName: '', busNumber: busId, stops: [], updatedAt: new Date().toISOString() };
  }
  if (!busPositions[busId]) {
    const cfg = busConfigs[busId];
    const stops = cfg.stops || [];
    busPositions[busId] = {
      busId, routeId: cfg.routeKey || busId, totalSeats: cfg.totalSeats || 42,
      lat: 13.0827, lng: 80.2707, speed: 0, seats: cfg.totalSeats || 42,
      inside: pInside, route: cfg.routeName || busId, busNumber: cfg.busNumber || busId,
      gpsFixed: false, currentStop: '', area: '', road: '', city: '',
      distFromStop: '0.00', nextStops: getNextStops('', busId, 13.0827, 80.2707, stops),
      lastUpdate: new Date().toISOString()
    };
  } else {
    const cfg = busConfigs[busId];
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
  // Fill in virtual positions for configured buses without live data
  Object.keys(busConfigs).forEach(busId => {
    if (!busPositions[busId]) {
      const cfg = busConfigs[busId];
      const stops = cfg.stops || [];
      const firstStop = stops.length > 0 ? stops[0] : null;
      const virtualLat = firstStop ? firstStop.lat : 11.3;
      const virtualLng = firstStop ? firstStop.lng : 78.1;
      const virtualStop = firstStop ? firstStop.name : '';
      const nextStops = getNextStops(virtualStop, cfg.routeKey || busId, virtualLat, virtualLng, cfg.stops);
      busPositions[busId] = {
        busId,
        routeId: cfg.routeKey || busId,
        totalSeats: cfg.totalSeats || 42,
        lat: virtualLat,
        lng: virtualLng,
        speed: 0,
        seats: cfg.totalSeats || 42,
        inside: 0,
        route: cfg.routeName || busId,
        busNumber: cfg.busNumber || busId,
        gpsFixed: false,
        currentStop: virtualStop,
        area: virtualStop,
        road: cfg.routeName || '',
        city: '',
        distFromStop: '0.00',
        nextStops,
        lastUpdate: new Date().toISOString(),
      };
    }
  });
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
  // Re-activate bus on map immediately so it doesn't blink
  const stops = busConfigs[busId].stops || [];
  const firstStop = stops.length > 0 ? stops[0] : null;
  const posLat = bus.latitude ?? (firstStop ? firstStop.lat : 11.3);
  const posLng = bus.longitude ?? (firstStop ? firstStop.lng : 78.1);
  if (!busPositions[busId]) {
    const virtualStop = firstStop ? firstStop.name : '';
    const nextStops = getNextStops(virtualStop, routeKey, Number(posLat), Number(posLng), busConfigs[busId].stops);
    busPositions[busId] = {
      busId,
      routeId: routeKey,
      totalSeats: busConfigs[busId].totalSeats,
      lat: Number(posLat),
      lng: Number(posLng),
      speed: 0,
      seats: busConfigs[busId].totalSeats,
      inside: 0,
      route: busConfigs[busId].routeName || busId,
      busNumber: busConfigs[busId].busNumber || busId,
      gpsFixed: false,
      currentStop: virtualStop,
      area: virtualStop,
      road: busConfigs[busId].routeName || '',
      city: '',
      distFromStop: '0.00',
      nextStops,
      lastUpdate: new Date().toISOString(),
    };
    io.to('all-buses').emit('busUpdate', busPositions[busId]);
  }
  saveConfigs();
  res.status(201).json({ bus, config: busConfigs[busId] });
});

// Load deleted buses from env var (survives deploy)
// Only add to deletedBuses if the bus has no active config
if (process.env.DELETED_BUSES) {
  process.env.DELETED_BUSES.split(',').map(s => s.trim()).filter(Boolean).forEach(id => {
    if (!busConfigs[id]) deletedBuses.add(id);
  });
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
  const nextStops = getNextStops(stop.name, routeKey, Number(latitude), Number(longitude), customStops, speed);
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



// ── MQTT SUBSCRIPTION (ESP32 count via broker) ────────────────
const mqttClient = mqtt.connect('mqtt://broker.emqx.io:1883');
mqttClient.on('connect', () => {
  console.log('MQTT connected');
  mqttClient.subscribe('tnbustrack/+/count', { qos: 0 });
});
mqttClient.on('message', (topic, buf) => {
  try {
    const msg = JSON.parse(buf.toString());
    const { busId, inside } = msg;
    if (!busId || inside == null) return;
    const pInside = Number(inside);
    if (!busPositions[busId]) {
      busPositions[busId] = {
        busId, routeId: busId, totalSeats: 42,
        lat: 13.0827, lng: 80.2707, speed: 0, seats: 42 - pInside,
        inside: pInside, route: busId, busNumber: busId,
        gpsFixed: false, currentStop: '', area: '', road: '', city: '',
        distFromStop: '0.00', nextStops: [],
        lastUpdate: new Date().toISOString()
      };
    } else {
      busPositions[busId].inside = pInside;
      busPositions[busId].seats = (busConfigs[busId]?.totalSeats || 42) - pInside;
    }
    io.to(`bus-${busId}`).emit('countUpdate', { busId, inside: pInside });
    io.to('all-buses').emit('countUpdate', { busId, inside: pInside });
  } catch (_) {}
});
mqttClient.on('error', e => console.error('MQTT error:', e.message));

// ── STALE BUS CLEANUP (every 15s, remove buses offline >120s) ─
// 120s allows ESP32 brownout reboot + WiFi reconnect time
// Only remove buses that had a live GPS fix; keep virtual positions (gpsFixed=false)
setInterval(() => {
  const now = Date.now();
  Object.keys(busPositions).forEach((busId) => {
    const bus = busPositions[busId];
    if (!bus || !bus.lastUpdate) return;
    if (!bus.gpsFixed) return;
    const age = now - new Date(bus.lastUpdate).getTime();
    if (age > 120000) {
      console.log(`Removing stale bus ${busId} (offline ${Math.round(age / 1000)}s)`);
      delete busPositions[busId];
      delete gpsHistory[busId];
      io.to('all-buses').emit('busRemoved', busId);
    }
  });
}, 15000);

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

// ── FMB920 TCP RECEIVER ────────────────────────────────────────
const FMB_TCP_PORT = process.env.FMB_TCP_PORT || 5000;
const FMB_IMEI_MAP_STR = process.env.FMB_IMEI_MAP || '';

function parseImeiMap(str) {
  const map = {};
  if (!str) return map;
  for (const part of str.split(',')) {
    const [imei, busId] = part.split(':');
    if (imei && busId) map[imei.trim()] = busId.trim();
  }
  return map;
}
const fmbImeiMap = parseImeiMap(FMB_IMEI_MAP_STR);

function crc16(data) {
  let crc = 0;
  for (const b of data) {
    crc ^= b;
    for (let i = 0; i < 8; i++) {
      crc = (crc & 1) ? (crc >>> 1) ^ 0xA001 : (crc >>> 1);
    }
  }
  return crc & 0xFFFF;
}

function decodeCodec8(buf) {
  let off = 0;
  const codecID = buf.readUInt8(off++);
  if (codecID !== 0x08) return null;
  const numRecords = buf.readUInt8(off++);
  const records = [];
  for (let r = 0; r < numRecords; r++) {
    const timestamp = buf.readUInt32BE(off);
    off += 4;
    const gpsInfo = buf.readUInt8(off++);
    const gpsLen = buf.readUInt8(off++);
    const lat = buf.readInt32BE(off) / 10000000;
    off += 4;
    const lng = buf.readInt32BE(off) / 10000000;
    off += 4;
    const altitude = buf.readUInt16BE(off);
    off += 2;
    const angle = buf.readUInt16BE(off);
    off += 2;
    const sats = buf.readUInt8(off);
    off += 1;
    const speed = buf.readUInt16BE(off);
    off += 2;
    const ioCount = buf.readUInt8(off++);
    const ioData = [];
    for (let i = 0; i < ioCount; i++) {
      const ioId = buf.readUInt8(off++);
      const ioVal = buf.readUInt32BE(off);
      off += 4;
      ioData.push({ id: ioId, value: ioVal });
    }
    records.push({
      timestamp, lat, lng, altitude, angle, sats, speed,
      io: ioData.length ? ioData : undefined,
    });
  }
  return { codecID, numRecords, records };
}

const net = require('net');
const serverFMB = net.createServer((socket) => {
  let buf = Buffer.alloc(0);
  let handshaked = false;

  socket.on('data', (chunk) => {
    buf = Buffer.concat([buf, chunk]);

    if (!handshaked) {
      if (buf.length >= 16) {
        const imeiRaw = buf.slice(0, 16).toString('ascii').trim();
        const busId = fmbImeiMap[imeiRaw];
        if (busId) {
          socket.write(Buffer.from([0x01]));
          handshaked = true;
          console.log(`FMB920 handshake OK: IMEI=${imeiRaw} -> Bus ${busId}`);
          buf = Buffer.alloc(0);
        } else {
          console.log(`FMB920 unknown IMEI: ${imeiRaw}, closing`);
          socket.end();
          return;
        }
      }
    }

    while (buf.length >= 4) {
      const dataLen = buf.readUInt32BE(0);
      const needed = 4 + 4 + dataLen + 2 + 2;
      if (buf.length < needed) break;

      const payload = buf.slice(8, 8 + dataLen);
      const storedCrc = buf.readUInt16BE(8 + dataLen);
      const computedCrc = crc16(payload);

      if (storedCrc === computedCrc) {
        const decoded = decodeCodec8(payload);
        if (decoded && decoded.records.length > 0) {
          const rec = decoded.records[0];
          const lat = rec.lat, lng = rec.lng, speed = rec.speed, sats = rec.sats;
          const now = new Date().toISOString();

          try {
            const http = require('http');
            const options = {
              hostname: 'localhost',
              port: PORT,
              path: '/api/bus/location',
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            };
            const reqHttp = http.request(options, (res) => { res.on('data', () => {}); });
            reqHttp.write(`id=${busId}&lat=${lat}&lng=${lng}&speed=${speed}&passengersInside=0&status=${sats > 0 ? 'running' : 'stopped'}`);
            reqHttp.end();

            io.emit('busUpdate', { id: busId, lat, lng, speed, sats, status: sats > 0 ? 'running' : 'stopped', timestamp: now });
          } catch (e) {
            console.error('FMB location update error:', e.message);
          }
        }
      }

      buf = buf.slice(needed);
    }
  });

  socket.on('end', () => { console.log('FMB920 disconnected'); });
  socket.on('error', (e) => { console.log('FMB920 socket error:', e.message); });
});

serverFMB.listen(FMB_TCP_PORT, () => {
  console.log(`FMB920 TCP receiver listening on port ${FMB_TCP_PORT}`);
});

// ── START ────────────────────────────────────────────────────
const PORT = Number(process.env.PORT || 3000);

nextApp.prepare().then(() => {
  loadConfigs();
  server.listen(PORT, () => {
    console.log(`TN BusTrack production server running on http://localhost:${PORT}`);
  });
});
