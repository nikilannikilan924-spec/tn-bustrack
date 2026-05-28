# TN BusTrack

A Next.js + Node.js smart bus tracking app for Tamil Nadu with live Socket.IO updates, Express APIs, JWT auth, and Prisma/PostgreSQL backend scaffolding.

## Features

- Live bus tracking on OpenStreetMap
- Search, filters, saved routes, and service alerts
- Real-time updates using Socket.IO
- JWT auth endpoints for register/login
- Prisma models for buses, users, alerts, routes, and stops
- Responsive mobile and desktop design

## Local setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Set environment variables:
   - `DATABASE_URL`
    - `NEXT_PUBLIC_API_BASE_URL` (optional, defaults to the Next app)
    - `NEXT_PUBLIC_SOCKET_URL` (optional, for the Express Socket.IO server)
    - `MONGODB_URI` (optional, for the Express API)
    - `JWT_SECRET` (optional)
   - You can copy `.env.example` to `.env.local` and fill in values.
3. Generate Prisma client:
   ```bash
   npm run db:generate
   ```
4. Start the frontend:
   ```bash
   npm run dev
   ```
5. Start the Express backend in another terminal:
    ```bash
    npm run backend:dev
    ```

## Bus data source

Current demo data is in `backend/src/data/seedData.js`.
For real data, connect one of these sources:

- Operator GPS feed from MTC / SETC / TNSTC
- GTFS / GTFS-Realtime feed
- A PostgreSQL database via Prisma with route, stop, and live location records
- Your own API that returns buses, routes, stops, and alerts

If you already have a feed, point the frontend at it using `NEXT_PUBLIC_API_BASE_URL` and `NEXT_PUBLIC_SOCKET_URL`.
