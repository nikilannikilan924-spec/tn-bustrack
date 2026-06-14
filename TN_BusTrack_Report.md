# TN BusTrack — Project Report

## 1. Project Overview

**TN BusTrack** is a real-time bus tracking and transit dashboard built for Tamil Nadu State Transport Corporation (TNSTC). It uses an ESP32 microcontroller with GPS and cellular connectivity mounted on a college bus to stream live location and passenger occupancy data to a web application. The web app displays buses on a map, shows nearby stops with approaching buses, provides occupancy predictions, and supports passenger reports.

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        HARDWARE (On Bus)                           │
│                                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐  ┌────────────────┐ │
│  │ NEO-6M   │  │ HC-SR04  │  │ HC-SR04      │  │ 5V Relay       │ │
│  │ GPS      │  │ Sensor#1 │  │ Sensor#2     │  │ (heartbeat LED)│ │
│  │ (lat/lng)│  │ (ENTER)  │  │ (EXIT)       │  └────────────────┘ │
│  └────┬─────┘  └────┬─────┘  └──────┬───────┘                     │
│       │             │               │                              │
│       └─────────────┼───────────────┘                              │
│                     │                    ┌──────────────────────┐  │
│                     ▼                    │   Power Bank 5V USB  │  │
│              ┌──────────────┐            └──────────┬───────────┘  │
│              │   ESP32      │◄───────────────────────┘              │
│              │  (Main CPU)  │                                      │
│              └──────┬───────┘                                      │
│                     │ UART                                         │
│                     ▼                                               │
│              ┌──────────────┐                                       │
│              │  SIM800L V2.0│  ← Airtel SIM (2G data enabled)      │
│              │  GSM/GPRS    │                                       │
│              └──────┬───────┘                                       │
│                     │ Cellular (HTTP POST every 5s)                 │
└─────────────────────┼───────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      NETWORK / CLOUD                               │
│                                                                     │
│     SIM800L → Airtel 2G → Internet → ngrok tunnel                   │
│                                      │                              │
│                                      ▼                              │
│                          Your Laptop (localhost:3000)               │
│                      ┌──────────────────────────────┐              │
│                      │    Next.js 14 + Express       │              │
│                      │    (App Router + API routes)  │              │
│                      │    Socket.IO (WebSockets)     │              │
│                      │    Leaflet / Google Maps      │              │
│                      └────────────┬─────────────────┘              │
│                                   │                                 │
│                                   ▼                                 │
│                        ┌──────────────────┐                        │
│                        │   In-Memory DB   │                        │
│                        │  (seed JSON data)│                        │
│                        └──────────────────┘                        │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Hardware Components

### 3.1 Bill of Materials

| # | Component | Qty | Cost (₹) | Purpose |
|---|---|---|---|---|
| 1 | ESP32 Dev Board (38-pin) | 1 | 350 | Main microcontroller, WiFi/BT, UART/I2C/SPI |
| 2 | NEO-6M GPS Module (active antenna) | 1 | 458 | Satelllite positioning, outputs lat/lng/speed |
| 3 | SIM800L V2.0 GSM/GPRS Module | 1 | 450 | Cellular data, sends HTTP POST to server |
| 4 | HC-SR04 Ultrasonic Sensor | 2 | 160 | Passenger counting (enter/exit door) |
| 5 | 5V Relay Module | 1 | 70 | Heartbeat indicator (blinks on data send) |
| 6 | Jumper Wires (M-M + F-M) | 40pcs | 80 | Connections between components |
| 7 | IP65 Junction Box (200×155×80mm) | 1 | 200 | Weatherproof enclosure for bus installation |
| 8 | 10000mAh Power Bank | 1 | 500 | USB power for the whole system |
| 9 | USB Micro Cable | 1 | 50 | Power + programming connection |
| 10 | Airtel SIM (2G data enabled) | 1 | 99 | Cellular internet for SIM800L |
| 11 | DT830D Digital Multimeter | 1 | 150 | Testing voltages, continuity |
| 12 | Perfboard + Soldering Kit | 1 | 100 | Permanent mounting (avoid breadboard vibration) |
| | **Total** | | **~₹2,667** | |

### 3.2 Pin Wiring Diagram

| ESP32 Pin | Connected To | Wire Color |
|-----------|-------------|------------|
| 3.3V | NEO-6M VCC | Red |
| GND | NEO-6M GND | Black |
| GPIO16 (RX2) | NEO-6M TX | Green |
| GPIO17 (TX2) | NEO-6M RX | White |
| 5V | SIM800L VCC, Sensors VCC, Relay VCC | Red |
| GND | SIM800L GND, Sensors GND, Relay GND | Black |
| GPIO4 | SIM800L TX | Green |
| GPIO2 | SIM800L RX | White |
| GPIO12 | HC-SR04 #1 TRIG (ENTER) | Yellow |
| GPIO14 | HC-SR04 #1 ECHO (ENTER) | Orange |
| GPIO27 | HC-SR04 #2 TRIG (EXIT) | Yellow |
| GPIO15 | HC-SR04 #2 ECHO (EXIT) | Orange |
| GPIO13 | Relay IN | Blue |

### 3.3 Power Distribution

```
10000mAh Power Bank (5V USB)
    │
    └── USB Cable ── ESP32 USB Port
                        │
                        ├── ESP32 5V Pin ──┬── SIM800L V2.0 VCC
                        │                  ├── HC-SR04 #1 VCC
                        │                  ├── HC-SR04 #2 VCC
                        │                  └── Relay VCC
                        │
                        └── ESP32 3.3V Pin ── NEO-6M GPS VCC
```

### 3.4 Physical Assembly

- **Box location:** Inside bus dashboard or under driver seat
- **GPS antenna:** Mounted on roof with ceramic patch facing sky
- **GSM antenna:** Near window for best signal
- **HC-SR04 sensors:** Mounted above bus door, pointing down, ~5cm apart
- **Power bank:** Stored in glovebox, USB cable routed through grommet
- All connections soldered on perfboard + hot glued for vibration resistance

---

## 4. Software Stack

### 4.1 Technologies Used

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router) | 14.2.5 |
| Language | TypeScript | 5.5.4 |
| Frontend Library | React | 18.3.1 |
| Styling | Tailwind CSS | 3.4.4 |
| Map | Leaflet + OpenStreetMap | 1.9.4 |
| Real-time | Socket.IO | 4.8.1 |
| Backend API | Express.js | 4.22.2 |
| Auth | JWT + bcryptjs | - |
| Database | In-memory (seed JSON) / MongoDB / PostgreSQL | - |
| ORM | Prisma (optional) | 5.19.0 |
| PWA | Service Worker + Manifest | - |
| Deployment | pm2 / ngrok / Railway | - |

### 4.2 Project Structure

```
transit-dashboard/
├── app/                  # Next.js pages (App Router)
│   ├── page.tsx          # Home page
│   ├── layout.tsx        # Root layout (sidebar, nav, panic button)
│   ├── dashboard/        # Fleet board
│   ├── map/              # Live map (Leaflet)
│   ├── nearby/           # Nearby buses (GPS-based)
│   ├── stops/            # Stop timetable
│   ├── alerts/           # Service alerts
│   ├── favorites/        # Saved routes
│   ├── admin/            # Admin dashboard
│   ├── settings/         # User settings
│   ├── bus/[id]/         # Bus detail page
│   ├── route/[id]/       # Route detail page
│   └── offline/          # PWA offline fallback
├── components/
│   ├── layout/           # Sidebar, MobileNav
│   ├── map/              # LiveMap, MapBoard
│   ├── buses/            # BusesBoard, BusCard, BusDetailsDrawer
│   ├── stops/            # BusStopCard
│   ├── alerts/           # AlertCard
│   ├── admin/            # Admin maps, tables, reports
│   ├── report/           # PanicButton, RouteCompareCard
│   └── ui/               # Button, Card, Input, LanguageSwitcher
├── lib/                  # Utility libraries
│   ├── mock-data.ts      # Seed data loader
│   ├── api.ts            # API client (24 endpoints)
│   ├── socket.ts         # Socket.IO client
│   ├── distance.ts       # Haversine distance
│   ├── prediction.ts     # Occupancy prediction engine
│   ├── notifications.ts  # Arrival notification service
│   ├── nearby.ts         # Nearby stop finder
│   ├── routeCompare.ts   # Route comparison logic
│   ├── routeDeviation.ts # Deviation detection
│   ├── eta.ts            # ETA estimation
│   └── translations.ts   # EN/TA i18n (154 keys)
├── server/
│   ├── index.js          # Standalone Express server (port 4000)
│   └── production.js     # Combined Next+Express server (port 3000)
├── data/
│   └── tn-bustrack.seed.json  # 12 routes, 40 buses, 100 stops, 8 alerts
├── hardware/
│   └── tn-bustrack-esp32.ino  # ESP32 firmware
└── public/
    ├── sw.js             # Service worker (v3)
    ├── manifest.json     # PWA manifest
    └── offline.html      # Offline fallback
```

### 4.3 Key Features

#### Web Application
1. **Live Map** — Bus markers with color-coded status (green=running, amber=delayed, grey=stopped)
2. **Nearby Buses** — Uses phone GPS to find nearby stops and approaching buses with occupancy
3. **Fleet Dashboard** — Search/filter buses by number or stop, view ETA and seat availability
4. **Stop Timetable** — Search stops to see all arriving buses with ETAs
5. **Occupancy Prediction** — Time-of-day analysis predicts crowdedness trend (↑ filling / ↓ emptying / → stable)
6. **Passenger Reports** — Panic button for delay/overcrowding/breakdown reports
7. **Route Comparison** — Find buses between two stops with smart suggestions
8. **Admin Panel** — Live activity feed, bus table, alert publishing, report review
9. **PWA** — Install on phone, works offline with cached data
10. **Tamil Language** — Full Tamil translations (154 keys)

#### ESP32 Firmware
1. **GPS Reading** — NEO-6M at 9600 baud, parses NMEA sentences via TinyGPS++
2. **Passenger Counting** — Two HC-SR04 sensors detect enter/exit direction
3. **GPRS Upload** — SIM800L sends HTTP POST every 5 seconds
4. **Heartbeat** — Relay clicks on each data send for visual confirmation

### 4.4 API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | /api/buses | List all buses with live locations |
| GET | /api/buses/:id | Single bus details |
| GET | /api/buses/:id/location | Live GPS of a bus |
| POST | /api/bus/location | Hardware ingest (ESP32 → server) |
| GET | /api/routes | List all routes |
| GET | /api/stops | List all stops |
| GET | /api/alerts | List alerts |
| POST | /api/report | Submit passenger report |
| GET | /api/report | Fetch all reports |
| POST | /api/auth/register | User registration |
| POST | /api/auth/login | User login |

### 4.5 Real-time Data Flow

```
ESP32 (every 5s)
    ↓ HTTP POST /api/bus/location
Express Server
    ↓ Updates in-memory bus state
    ↓ io.emit('bus-location-update')
All Connected Browsers
    ↓ Socket.IO listener
    ↓ setBuses(liveBuses) → React re-renders map + cards
```

---

## 5. How to Run

### Development
```bash
cd C:\Users\NIKILAN\transit-dashboard

# Terminal 1: Frontend + API
npm run dev          # → http://localhost:3000

# Terminal 2: Express backend (if needed separately)
npm run server       # → http://localhost:4000

# Public URL (for phone + hardware)
npx ngrok http 3000  # → https://xxx.ngrok-free.app
```

### Production Build
```bash
npm run build
npm start            # Combined server on port 3000
```

---

## 6. Hardware Communication

### ESP32 → Server Flow

```
ESP32 loop():
  1. Read GPS (lat, lng, speed) via TinyGPS++
  2. Read IR/sensor enter/exit → update passengerCount
  3. If 5 seconds elapsed:
     a. Build HTTP POST body:
        busId=bus-001&latitude=13.0827&longitude=80.2707
        &speed=25.5&passengersInside=12
     b. SIM800L AT commands:
        AT+SAPBR=1,1              (open GPRS)
        AT+HTTPINIT               (init HTTP)
        AT+HTTPPARA=URL,...       (set URL)
        AT+HTTPDATA=len,5000      (set body length)
        AT+HTTPACTION=1           (POST)
        AT+HTTPTERM               (close)
     c. Server receives, updates bus state
     d. Socket.IO pushes to all web clients
     e. Relay blinks (GPIO13 HIGH 100ms)
```

### Server Side (Ingest Endpoint)

```
POST /api/bus/location
{
  "busId": "bus-001",
  "latitude": 13.0827,
  "longitude": 80.2707,
  "speed": 25.5,
  "passengersInside": 12
}

→ Updates bus position in memory
→ Broadcasts via Socket.IO
→ Returns { ok: true, receivedAt: "..." }
```

---

## 7. Routes in Demo Data

| Route | Origin | Destination | Stops |
|---|---|---|---|
| R1 | Tambaram | T Nagar | 7 |
| R2 | Broadway | Adyar | 7 |
| R3 | T Nagar | Velachery | 7 |
| R4 | Chennai Central | Marina Beach | 7 |
| R5 | Koyambedu | Anna Nagar | 7 |
| R6 | Parrys | Thiruvanmiyur | 7 |
| R7 | Avadi | T Nagar | 8 |
| R8 | CMBT | Saidapet | 5 |
| R9 | Porur | Guindy | 7 |
| R10 | Poonamallee | Tambaram | 7 |
| R11 | Thiruvallur | Broadway | 8 |
| R12 | Kanchipuram | Chennai Central | 8 |

(12 routes, 40 buses, ~100 stops, 8 alerts)

---

## 8. Cost Summary

### Hardware: ~₹2,667
### Software: Free (open-source)
### Monthly: ~₹99 (Airtel data recharge)
### Total: ~₹2,766

---

## 9. Future Enhancements

1. **Google Maps** — Replace Leaflet with Google Maps JavaScript API
2. **Railway Deployment** — Deploy to Railway.app for 24/7 uptime (no laptop needed)
3. **Database Persistence** — Switch from in-memory to PostgreSQL/Prisma
4. **Historical Routes** — Store GPS tracks for replay and analytics
5. **Driver Display** — Small OLED screen showing next stop, passenger count
6. **Vibration/Noise Sensors** — Detect potholes or engine issues
7. **Auto Battery Charging** — Wire SIM800L relay to bus ignition for auto charge
8. **Multiple Buses** — Deploy ESP32 on multiple buses, track fleet in one dashboard
