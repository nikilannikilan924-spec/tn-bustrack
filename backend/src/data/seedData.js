const demoUserId = 'user-demo-1';

const routes = [
  {
    id: 'route-828',
    routeNumber: '828',
    name: 'Chennai to Kanchipuram',
    origin: 'Chennai',
    destination: 'Kanchipuram',
    operator: 'TNSTC',
    totalStops: 4,
    stops: [
      { id: 'stop-828-1', name: 'Koyambedu', lat: 13.0732, lng: 80.2087, stopOrder: 1, scheduledTime: '06:15' },
      { id: 'stop-828-2', name: 'Tambaram', lat: 12.9249, lng: 80.1001, stopOrder: 2, scheduledTime: '07:05' },
      { id: 'stop-828-3', name: 'Chengalpattu', lat: 12.6926, lng: 79.9772, stopOrder: 3, scheduledTime: '07:45' },
      { id: 'stop-828-4', name: 'Kanchipuram', lat: 12.8342, lng: 79.7036, stopOrder: 4, scheduledTime: '08:30' }
    ]
  },
  {
    id: 'route-532',
    routeNumber: '532',
    name: 'Chennai to Vellore',
    origin: 'Chennai',
    destination: 'Vellore',
    operator: 'TNSTC',
    totalStops: 5,
    stops: [
      { id: 'stop-532-1', name: 'Koyambedu', lat: 13.0732, lng: 80.2087, stopOrder: 1, scheduledTime: '06:40' },
      { id: 'stop-532-2', name: 'Ambattur', lat: 13.1143, lng: 80.1548, stopOrder: 2, scheduledTime: '07:10' },
      { id: 'stop-532-3', name: 'Arakkonam', lat: 13.0842, lng: 79.6707, stopOrder: 3, scheduledTime: '08:05' },
      { id: 'stop-532-4', name: 'Ranipet', lat: 12.9296, lng: 79.3334, stopOrder: 4, scheduledTime: '08:45' },
      { id: 'stop-532-5', name: 'Vellore', lat: 12.9165, lng: 79.1325, stopOrder: 5, scheduledTime: '09:20' }
    ]
  },
  {
    id: 'route-137',
    routeNumber: '137',
    name: 'Coimbatore to Madurai',
    origin: 'Coimbatore',
    destination: 'Madurai',
    operator: 'SETC',
    totalStops: 4,
    stops: [
      { id: 'stop-137-1', name: 'Coimbatore', lat: 11.0168, lng: 76.9558, stopOrder: 1, scheduledTime: '06:10' },
      { id: 'stop-137-2', name: 'Pollachi', lat: 10.6582, lng: 77.0086, stopOrder: 2, scheduledTime: '07:00' },
      { id: 'stop-137-3', name: 'Dindigul', lat: 10.3673, lng: 77.9803, stopOrder: 3, scheduledTime: '08:25' },
      { id: 'stop-137-4', name: 'Madurai', lat: 9.9252, lng: 78.1198, stopOrder: 4, scheduledTime: '09:10' }
    ]
  },
  {
    id: 'route-144',
    routeNumber: '144',
    name: 'Chennai to Trichy',
    origin: 'Chennai',
    destination: 'Trichy',
    operator: 'TNSTC',
    totalStops: 4,
    stops: [
      { id: 'stop-144-1', name: 'Koyambedu', lat: 13.0732, lng: 80.2087, stopOrder: 1, scheduledTime: '05:50' },
      { id: 'stop-144-2', name: 'Villupuram', lat: 11.9398, lng: 79.4861, stopOrder: 2, scheduledTime: '08:05' },
      { id: 'stop-144-3', name: 'Perambalur', lat: 11.2335, lng: 78.8830, stopOrder: 3, scheduledTime: '09:25' },
      { id: 'stop-144-4', name: 'Trichy', lat: 10.7905, lng: 78.7047, stopOrder: 4, scheduledTime: '10:20' }
    ]
  },
  {
    id: 'route-101',
    routeNumber: '101',
    name: 'Madurai to Chennai',
    origin: 'Madurai',
    destination: 'Chennai',
    operator: 'SETC',
    totalStops: 5,
    stops: [
      { id: 'stop-101-1', name: 'Madurai', lat: 9.9252, lng: 78.1198, stopOrder: 1, scheduledTime: '18:00' },
      { id: 'stop-101-2', name: 'Dindigul', lat: 10.3673, lng: 77.9803, stopOrder: 2, scheduledTime: '19:00' },
      { id: 'stop-101-3', name: 'Salem', lat: 11.6643, lng: 78.1460, stopOrder: 3, scheduledTime: '21:20' },
      { id: 'stop-101-4', name: 'Krishnagiri', lat: 12.5250, lng: 78.2138, stopOrder: 4, scheduledTime: '23:20' },
      { id: 'stop-101-5', name: 'Chennai', lat: 13.0827, lng: 80.2707, stopOrder: 5, scheduledTime: '02:15' }
    ]
  }
];

const buses = [
  { id: 'bus-828-1', busNumber: 'TN 01 828 1001', routeId: 'route-828', lat: 12.9801, lng: 80.1752, speed: 38, seatsTotal: 44, seatsOccupied: 18, isActive: true, currentStop: 'Koyambedu', etaMinutes: 12 },
  { id: 'bus-532-1', busNumber: 'TN 21 532 2001', routeId: 'route-532', lat: 13.0913, lng: 80.1422, speed: 42, seatsTotal: 42, seatsOccupied: 19, isActive: true, currentStop: 'Ambattur', etaMinutes: 18 },
  { id: 'bus-137-1', busNumber: 'TN 58 137 3001', routeId: 'route-137', lat: 10.9100, lng: 76.9900, speed: 46, seatsTotal: 40, seatsOccupied: 16, isActive: true, currentStop: 'Coimbatore', etaMinutes: 22 },
  { id: 'bus-144-1', busNumber: 'TN 45 144 4001', routeId: 'route-144', lat: 12.6200, lng: 79.6000, speed: 44, seatsTotal: 50, seatsOccupied: 33, isActive: true, currentStop: 'Villupuram', etaMinutes: 28 },
  { id: 'bus-101-1', busNumber: 'TN 99 101 5001', routeId: 'route-101', lat: 10.0200, lng: 78.0900, speed: 40, seatsTotal: 42, seatsOccupied: 21, isActive: true, currentStop: 'Madurai', etaMinutes: 15 }
];

const alerts = [
  { id: 'alert-1', userId: demoUserId, stopId: 'stop-828-3', notifyMinutesBefore: 10, isActive: true, createdAt: '2026-05-25T06:20:00.000Z' },
  { id: 'alert-2', userId: demoUserId, stopId: 'stop-144-4', notifyMinutesBefore: 10, isActive: true, createdAt: '2026-05-25T06:25:00.000Z' }
];

const users = [
  { id: demoUserId, name: 'Demo User', phone: '9000000000', email: 'demo@tnbustracker.local', password: '$2a$10$7xwE5T3cUqO4s1oTQ4V3COvVtE9n2jQ5u5n5mZ1fM5v1u8NQ4zO3y', createdAt: '2026-05-25T06:00:00.000Z' }
];

module.exports = { routes, buses, alerts, users };
