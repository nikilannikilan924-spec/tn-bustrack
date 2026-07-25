# TN BusTrack — Complete Project Report

## 1. Project Overview

**TN BusTrack** is a real-time bus tracking and passenger counting system for Tamil Nadu. It combines custom ESP32 hardware (NEO-6M GPS + HC-SR04 ultrasonic sensors) with a full-stack web application (Next.js + Express + Socket.IO) to provide live bus positions, ETA predictions, and occupancy monitoring.

### 1.1 Architecture Diagram

```
┌─────────────────────────┐       HTTPS POST (every 8s)
│     ESP32 Hardware      │ ──────────────────────────────┐
│  (NEO-6M GPS + HC-SR04) │         /api/buses/update     │
│  busId = "M31"          │         /api/buses/count      │
│  Firmware: C++ (Arduino)│ ◄─────────────────────────────┘
└─────────────────────────┘       GET /api/config/{busId}
                                      (on boot)
                                         │
                                         ▼
┌──────────────────────────────────────────────────────────┐
│             Railway Cloud Server (Node.js)                │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  Express Server (port 3000)                         │ │
│  │  - REST API endpoints (/api/buses/*, /api/config/*) │ │
│  │  - Socket.IO server (WebSocket + polling fallback)  │ │
│  │  - In-memory stores (busPositions, busConfigs)      │ │
│  │  - Reverse geocoding (Nominatim OSM)                │ │
│  │  - Stale bus cleanup (30s timeout)                  │ │
│  │  - Config persistence (data/configs.json)           │ │
│  └─────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  Next.js App (SSR + Client)                         │ │
│  │  - Live Map page (Leaflet + OpenStreetMap)          │ │
│  │  - Setup page (bus/route/stops configuration)       │ │
│  │  - Bus detail page, Nearby page, Alerts, Admin      │ │
│  │  - Socket.IO client for real-time updates           │ │
│  │  - Bilingual UI (English / Tamil)                   │ │
│  │  - PWA support (service worker, offline page)       │ │
│  └─────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

### 1.2 Live URL
**https://tn-bustrack-production.up.railway.app**

### 1.3 GitHub Repository
**https://github.com/nikilannikilan924-spec/tn-bustrack.git**

---

## 2. Hardware System

### 2.1 Components

| Component | Model | Purpose |
|-----------|-------|---------|
| Microcontroller | ESP32 (ESP-WROOM-32) | Main processor, WiFi + Bluetooth |
| GPS Module | NEO-6M | Satellite positioning (lat/lng/speed) |
| Ultrasonic Sensor x2 | HC-SR04 | Passenger enter/exit detection |

### 2.2 Pin Connections

| ESP32 GPIO | Connected To |
|-----------|-------------|
| GPIO 16 (RX2) | NEO-6M TX |
| GPIO 17 (TX2) | NEO-6M RX |
| GPIO 12 | HC-SR04 #1 TRIG |
| GPIO 14 | HC-SR04 #1 ECHO |
| GPIO 27 | HC-SR04 #2 TRIG |
| GPIO 15 | HC-SR04 #2 ECHO |
| GPIO 2 | Onboard LED (status indicator) |

### 2.3 Hardware Configuration

- **GPS Baud Rate**: 115200 (NEO-6M configured to this rate)
- **HC-SR04 Idle Distance**: 2–5 cm (sensors facing each other on door frame)
- **HC-SR04 Detection Threshold**: >40 cm (person passing through triggers count)
- **HC-SR04 Debounce**: 2 consecutive readings before state change
- **HC-SR04 State Timeout**: 2 seconds (resets if both sensors not triggered in time)

### 2.4 Passenger Counting Logic

```
State Machine:
  IDLE (0) → ONE_SENSOR_A (1) / ONE_SENSOR_B (2) → BOTH (3) → count increment/decrement → IDLE

  - Sensor A triggers first, then B → ENTER (passengers++)
  - Sensor B triggers first, then A → EXIT (passengers--)
  - Debounce: requires 2 consecutive readings before state transition
  - Timeout: if both sensors not triggered within 2s, reset to IDLE
```

### 2.5 GPS Data Pipeline

```
NEO-6M → UART2 (115200 baud) → Raw NMEA sentences ($GPGGA, $GPGLL, $GPVTG)
  → String parsing (no library) → Coordinate extraction (DDDMM.MMMM format)
  → Convert to decimal degrees → 5-sample moving average filter
  → Store in globals (gpsLat, gpsLng, gpsSpeed)
  → Send to server via HTTPS POST every 8 seconds
```

---

## 3. Firmware Features (ESP32 — 590 lines)

### 3.1 WiFi Connectivity

- **Config Portal**: On first boot (or after all WiFi attempts fail), creates `TN-BusTrack-Setup` AP at `http://192.168.4.1`. User enters SSID, password, and Bus ID via web form. Credentials saved to ESP32 Preferences (non-volatile storage).
- **Fallback Hotspot**: SSID=`"SSID"`, Password=`"Nikilan31"` — used if saved credentials fail.
- **Auto-Reconnect**: `WiFi.setAutoReconnect(true)` + periodic check every 5 seconds. On reconnection, re-fetches bus config from server.

### 3.2 OTA Updates

ArduinoOTA is enabled for wireless firmware updates. The ESP32 listens for OTA requests during normal operation, allowing firmware upgrades without physical USB connection.

### 3.3 Server Communication

| Endpoint | Method | Interval | Payload |
|----------|--------|----------|---------|
| `/api/buses/update` | POST | Every 8s | `{busId, lat, lng, speed, seats, inside, route, gpsFixed}` |
| `/api/buses/count` | POST | Every 2s | `{busId, inside, seats}` |
| `/api/config/{busId}` | GET | On boot + WiFi reconnect | Returns `{totalSeats, routeName}` |

### 3.4 Timing Diagram

```
Boot → connectWifi() [~20s max] → setupOTA() → fetchConfig() → loop()
  loop:
    ┌─ ArduinoOTA.handle() [~1ms]
    ├─ checkWiFi() [~1ms]
    ├─ readGps() [reads all buffered NMEA]
    ├─ readDistance(TRIG_A, ECHO_A) [~100μs]
    ├─ readDistance(TRIG_B, ECHO_B) [~100μs]
    ├─ passenger state machine [~1μs]
    ├─ GPS fix timeout check [~1μs]
    ├─ sendCount() [every 2s, ~500ms HTTP]
    ├─ sendLocation() [every 8s, ~500ms HTTP]
    └─ delay(5) [5ms]
```

---

## 4. Server Architecture

### 4.1 Production Server (`server/production.js` — 538 lines)

Single Express server that serves both the API and the Next.js frontend.

#### REST API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/buses/update` | ESP32 sends GPS + passenger data |
| POST | `/api/buses/count` | ESP32 sends passenger count only |
| GET | `/api/buses` | Get all live bus positions |
| GET | `/api/buses/:busId` | Get single bus position |
| POST | `/api/bus/create` | Create bus with route/stops config |
| POST | `/api/config/save` | Save/update bus configuration |
| GET | `/api/config/:busId` | Get bus configuration for ESP32 |
| GET | `/api/config` | Get all bus configs |
| DELETE | `/api/buses/:busId` | Delete a bus |
| POST | `/api/bus/location` | Legacy location endpoint (old firmware) |
| POST | `/api/bus/passengers` | Legacy passenger endpoint (old firmware) |
| GET | `/api/stops` | Get all unique stops across routes |
| GET | `/api/stops/:routeKey` | Get stops for a specific route |
| GET | `/api/routes` | List all routes |
| POST | `/api/routes` | Create a route |
| DELETE | `/api/routes/:id` | Delete a route |
| GET | `/api/alerts` | Get all alerts |
| POST | `/api/alerts` | Create an alert |
| GET | `/api/device/config` | ESP32 fetches its assigned config |
| GET | `/api/health` | Health check (bus count, service name) |
| GET | `/health` | Health check (uptime, timestamp) |

#### Socket.IO Events

| Event | Direction | Payload |
|-------|-----------|---------|
| `currentBuses` | Server → Client | `Bus[]` (full list on connect) |
| `busUpdate` | Server → Client | `Bus` (single bus update) |
| `countUpdate` | Server → Client | `{busId, inside}` |
| `configUpdate` | Server → Client | `BusConfig` |
| `busRemoved` | Server → Client | `busId` (string) |
| `watchAll` | Client → Server | (joins `all-buses` room) |
| `watchBus` | Client → Server | `busId` (joins `bus-{busId}` room) |

### 4.2 Data Flow

```
ESP32 POST /api/buses/update
  → Validate busId, coordinates
  → Check deleted buses list
  → If no valid GPS fix AND no previous position:
      → If config has stops → place at first stop location
      → Else → return "No GPS fix yet"
  → Find nearest stop, calculate next stops with ETA
  → Create/update busPositions[busId]
  → Emit busUpdate via Socket.IO to all clients
  → If GPS fixed → reverse geocode (Nominatim OSM)
  → Return {ok: true}
```

### 4.3 Reverse Geocoding

When GPS has a valid fix, the server queries Nominatim OpenStreetMap API:
```
GET https://nominatim.openstreetmap.org/reverse?format=json&lat={lat}&lon={lng}&zoom=18
```

Extracts: `area` (suburb/neighbourhood/village), `road` (street name), `city` (city/town/county). Results are cached in-memory keyed by `{lat.toFixed(3)},{lng.toFixed(3)}`. If Nominatim is unreachable, falls back to the nearest stop name as `area` and config route name as `road`.

### 4.4 Stale Bus Cleanup

Runs every 10 seconds. Removes any bus from `busPositions` whose `lastUpdate` is older than 30 seconds. Emits `busRemoved` event. This accounts for 3+ missed ESP32 updates (8s interval) plus WiFi reconnect time.

### 4.5 Config Persistence

On every config change (create/save/delete), the server writes to `data/configs.json`:
```json
{
  "busConfigs": { "M31": { "busId": "M31", "totalSeats": 50, "routeName": "...", "stops": [...], ... } },
  "deletedBuses": []
}
```
On startup, `loadConfigs()` reads this file. Buses that have a config are automatically removed from the `deletedBuses` set (prevents stale deleted flags).

---

## 5. Frontend Application

### 5.1 Page Structure (Next.js App Router)

| Route | Component | Purpose |
|-------|-----------|---------|
| `/` | `app/page.tsx` | Home — welcome, live bus count, quick navigation |
| `/map` | `components/map/MapBoard.tsx` | Main live map with bus list sidebar |
| `/setup` | `app/setup/page.tsx` | Bus/route/stops configuration form |
| `/bus/[id]` | `app/bus/[id]/page.tsx` | Single bus detail with ETA breakdown |
| `/stops` | `app/stops/page.tsx` | Stop timetables and search |
| `/nearby` | `app/nearby/page.tsx` | Geolocation-based nearby stops/buses |
| `/alerts` | `app/alerts/page.tsx` | Service alerts and notifications |
| `/favorites` | `app/favorites/page.tsx` | Saved routes for quick access |
| `/admin` | `app/admin/page.tsx` | Admin panel (publish alerts, manage fleet) |
| `/login` | `app/login/page.tsx` | JWT authentication |
| `/register` | `app/register/page.tsx` | User registration |
| `/dashboard` | `app/dashboard/page.tsx` | Fleet overview dashboard |
| `/route/[id]` | `app/route/[id]/page.tsx` | Single route details |
| `/settings` | `app/settings/page.tsx` | User preferences |
| `/how` | `app/how/page.tsx` | How-to-use guide |
| `/offline` | `app/offline/page.tsx` | PWA offline fallback page |

### 5.2 Live Map (`LiveMap.tsx` — 186 lines)

Key features:
- **Leaflet map** with OpenStreetMap tiles, centered on Tamil Nadu (11.3°N, 78.1°E)
- **Custom bus markers**: Colored dot (green=running, amber=delayed, grey=stopped) + bus number + current stop label
- **Smooth animation**: Position interpolation over 1.5 seconds using `requestAnimationFrame`
- **Popup on click**: Speed, current stop, next stop ETA, passengers, location (area/road/city), GPS fix status
- **Auto-fit bounds**: Zoom to fit all active buses
- **Change detection**: Only updates markers when data actually changes (prevents blink)

### 5.3 Map Dashboard (`MapBoard.tsx` — 324 lines)

Key features:
- **Header stats**: Vehicle count, running count
- **Stop search**: Typeahead filter with datalist suggestions
- **Bus detail panel**: Speed, current stop, next stops with ETAs, seat availability, backup bus suggestions
- **Map legend**: Color-coded status indicators
- **Bus list**: Scrollable with status dot, FULL badge, speed, ETA
- **Real-time updates**: Socket.IO subscription + 4-second HTTP polling fallback

### 5.4 Setup Page (`setup/page.tsx` — 435 lines)

Key features:
- **Live bus position section**: Shows real-time GPS data from all connected ESP32 devices
- **Bus configuration form**: Bus ID, number, route name, origin, destination, seat capacity
- **Stops manager**: Dynamic add/remove stop entries with name, lat, lng
- **Bulk import**: CSV paste (`Name, lat, lng` per line)
- **Geolocation button**: Auto-fill current coordinates from browser
- **Tamil language support**: Full UI translation

### 5.5 Real-Time Socket Client (`lib/socket.ts` — 50 lines)

```typescript
getSocket() → connects to server via WebSocket/polling
subscribeCurrentBuses(callback) → receives full bus list on connect
subscribeSingleBusUpdate(callback) → receives individual bus updates (merges into existing state)
subscribeBusRemoved(callback) → receives bus removal notifications
```

### 5.6 TypeScript Data Types (`lib/types.ts`)

| Type | Key Fields |
|------|-----------|
| `Stop` | `id, name, lat, lng, sequence, routeId?` |
| `Route` | `id, number, name, operator, busType, origin, destination, status, stops[]` |
| `Bus` | `id, number, routeId, route, status, seatCapacity, seatsAvailable, etaMinutes, currentStop, area, road, city, latitude, longitude, speed, passengersInside, gpsFixed?` |
| `Alert` | `id, title, message, severity, routeId?, createdAt` |
| `Favorite` | `id, routeId, savedAt` |

### 5.7 Internationalization (`lib/translations.ts` — 200 lines)

188 translation keys in **English** and **Tamil** covering:
- Navigation, home page, map, buses, alerts, favorites
- Settings, PWA install, auth (login/register)
- Nearby stops, stop timetables, passenger info
- Error messages, status labels, UI components

Language is persisted in `localStorage` key `tn-bustrack-lang`.

---

## 6. Database Schema (Prisma/PostgreSQL)

### 6.1 Models

| Model | Fields |
|-------|--------|
| **User** | `id` (UUID), `email` (unique), `name`, `createdAt`, `favorites[]`, `alerts[]` |
| **Route** | `id`, `name`, `number`, `origin`, `destination`, `status`, `stops[]`, `buses[]`, `createdAt` |
| **Stop** | `id`, `name`, `lat`, `lng`, `sequence`, `routeId` (FK), `createdAt` |
| **Bus** | `id`, `number`, `routeId` (FK), `occupancy`, `status`, `eta`, `currentStop`, `latitude`, `longitude`, `locations[]`, `updatedAt` |
| **Location** | `id`, `busId` (FK), `lat`, `lng`, `captured` |
| **Alert** | `id`, `title`, `message`, `severity` (enum), `routeId` (FK), `createdAt` |
| **Favorite** | `id`, `userId` (FK), `favoriteType` (enum), `routeId?`, `stopId?`, `createdAt` |

*Note: The production server uses in-memory stores for speed. PostgreSQL via Prisma is available for persistent storage when needed.*

---

## 7. Deployment

### 7.1 Platform: Railway.app

- **Builder**: Nixpacks (automatic Node.js detection)
- **Start Command**: `npm start`
- **Health Check**: `/api/health` (Railway monitors this for uptime)
- **Restart Policy**: On failure only
- **Replicas**: 1
- **Config Persistence**: `data/configs.json` written to filesystem, survives restarts

### 7.2 Environment Variables

```
NEXT_PUBLIC_API_BASE_URL  →  https://tn-bustrack-production.up.railway.app
NEXT_PUBLIC_SOCKET_URL    →  https://tn-bustrack-production.up.railway.app
PORT                      →  3000 (assigned by Railway)
```

### 7.3 Build Process

```
npm run build
  → Next.js build (SSG + SSR pages)
  → Output: .next/ directory
  → Served by Express via @slack/next
```

---

## 8. File Inventory

| File | Lines | Purpose |
|------|-------|---------|
| `hardware/tn-bustrack-esp32.ino` | 590 | ESP32 firmware (GPS, WiFi portal, OTA, HC-SR04) |
| `server/production.js` | 538 | Production Express server (API + Socket.IO + Next.js) |
| `server/index.js` | 566 | Dev server (MongoDB + JWT auth) |
| `app/setup/page.tsx` | 435 | Bus/route/stops setup form |
| `components/map/MapBoard.tsx` | 324 | Live map dashboard (map + bus list + search) |
| `components/map/LiveMap.tsx` | 186 | Leaflet map with animated markers and popups |
| `lib/translations.ts` | 200 | English/Tamil i18n (188 keys) |
| `lib/types.ts` | 143 | TypeScript interfaces and API helpers |
| `lib/socket.ts` | 50 | Socket.IO client subscriptions |
| `prisma/schema.prisma` | 97 | PostgreSQL database schema |
| `app/page.tsx` | 119 | Home page |
| `app/layout.tsx` | 84 | Root layout (sidebar, auth, language provider) |
| `railway.json` | 15 | Railway deploy configuration |
| `package.json` | 45 | Dependencies and scripts |
| `data/configs.json` | ~10 | Persisted bus configurations |
| `public/sw.js` | ~100 | Service worker (PWA offline support) |

---

## 9. Dependencies

### Frontend
```
next@14.2.35, react@18.3.1, react-dom@18.3.1
typescript@5.5.4, tailwindcss@3.4.4
leaflet@1.9.4, socket.io-client@4.8.1
```

### Backend
```
express@4.22.2, socket.io@4.8.1
cors@2.8.8, dotenv@16.6.1
mongoose@8.24.0, prisma@5.19.0
jsonwebtoken@9.0.3, bcryptjs@2.4.3
```

### Dev
```
eslint@8.57.0, postcss@8.4.41, autoprefixer@10.4.19
```

---

## 10. Key Algorithms

### 10.1 GPS Coordinate Parsing (NMEA → Decimal Degrees)

NMEA format: `DDDMM.MMMM` (degrees + minutes)
```
parsedLat = int(lat / 100) + (lat - int(lat / 100) * 100) / 60
parsedLng = int(lng / 100) + (lng - int(lng / 100) * 100) / 60
```

### 10.2 GPS Moving Average Filter (5 samples)

```
latHistory[5], lngHistory[5] — circular buffer
addGpsSample(lat, lng): stores at index, increments index circularly
getFilteredGps(): averages all non-zero samples
```

### 10.3 Distance Calculation (Haversine)

```javascript
function getDistanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;  // Earth radius in km
  const dLat = deg2rad(lat2 - lat1);
  const dLng = deg2rad(lng2 - lng1);
  const a = Math.sin(dLat/2)^2 + Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLng/2)^2;
  return R * 2 * Math.atan2(√a, √(1-a));
}
```

### 10.4 ETA Calculation

```javascript
ETA = (distanceToNextStop / averageSpeed) * 60  // in minutes
Average speed assumed: 40 km/h (urban bus)
```

### 10.5 Nearest Stop

Linear scan through all stops for the route, returns the stop with minimum Haversine distance to current GPS position.

---

## 11. Testing & Verification

- Server health: `GET /api/health` or `GET /health`
- Check live buses: `GET /api/buses`
- Check config: `GET /api/config/{busId}` or `GET /api/config`
- ESP32 serial monitor: GPS debug messages, HTTP OK/FAIL status
- Map: Visit `https://tn-bustrack-production.up.railway.app/map`

---

## 12. Setup Instructions

### 12.1 ESP32 Firmware Flash
1. Open `hardware/tn-bustrack-esp32.ino` in Arduino IDE
2. Install ESP32 board package (Tools → Board → Boards Manager → "ESP32")
3. Select board: "ESP32 Dev Module"
4. Partition Scheme: "Huge APP (3MB NO OTA/1MB SPIFFS)"
5. Connect ESP32 via USB, select correct COM port
6. Click Upload

### 12.2 First Boot (WiFi Setup)
1. ESP32 creates `TN-BusTrack-Setup` WiFi AP
2. Connect to it from phone/laptop
3. Open `http://192.168.4.1` in browser
4. Enter WiFi SSID, password, and Bus ID (e.g., "M31")
5. Click Connect — ESP32 reboots and connects

### 12.3 Web App Setup
1. Visit `https://tn-bustrack-production.up.railway.app/setup`
2. Set Bus ID to "M31" (must match ESP32)
3. Enter route name, origin, destination, seat capacity
4. Add stops with names and coordinates
5. Click Save & Publish

### 12.4 Deploy Persistence
```bash
git add data/configs.json
git commit -m "bus M31 config"
git push origin master
```

---

## 13. Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| ESP32 prints `↑ FAIL` | Server returned non-200 (deleted bus, no config) | Check `/api/config/{busId}`, re-create bus |
| ESP32 prints `GPS: NO DATA` | Wrong baud rate or wiring | Check NEO-6M baud (115200), TX→pin16, RX→pin17 |
| Bus not on map | No config with stops OR server has no busPositions | Create bus at /setup, check ESP32 serial for `↑ OK` |
| Popup shows coordinates not place name | Nominatim API unreachable | Normal fallback — will show nearest stop name |
| Map blinking/pops | Service worker skipWaiting | Already fixed in current code |
| Config lost after deploy | data/configs.json not committed | `git add data/configs.json && git push` |

---

## 14. Summary

TN BusTrack is a complete IoT + web solution for tracking Tamil Nadu public buses in real time. The ESP32-based hardware captures GPS position (NEO-6M) and passenger count (HC-SR04 ultrasonic sensors), transmitting data via HTTPS to a Railway-hosted Node.js server. The server processes location data, calculates nearest stops and ETAs, performs reverse geocoding, and pushes updates to all connected clients via Socket.IO. The Next.js frontend displays animated bus markers on an OpenStreetMap with detailed popups, a searchable sidebar, and bilingual (English/Tamil) support. Configuration persistence ensures bus setups survive server restarts and deployments.
