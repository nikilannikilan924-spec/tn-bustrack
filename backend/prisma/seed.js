const bcrypt = require('bcryptjs');
const seed = require('../src/data/seedData');

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.alert.deleteMany();
  await prisma.bus.deleteMany();
  await prisma.stop.deleteMany();
  await prisma.route.deleteMany();
  await prisma.user.deleteMany();

  const userMap = new Map();
  for (const user of seed.users) {
    const created = await prisma.user.create({
      data: {
        name: user.name,
        phone: user.phone,
        email: user.email,
        password: await bcrypt.hash('password123', 10)
      }
    });
    userMap.set(user.id, created.id);
  }

  const routeMap = new Map();
  const stopIdMap = new Map();
  for (const route of seed.routes) {
    const created = await prisma.route.create({
      data: {
        routeNumber: route.routeNumber,
        name: route.name,
        origin: route.origin,
        destination: route.destination,
        operator: route.operator,
        totalStops: route.totalStops
      }
    });
    routeMap.set(route.id, created.id);

    for (const stop of route.stops) {
      const createdStop = await prisma.stop.create({
        data: {
          name: stop.name,
          lat: stop.lat,
          lng: stop.lng,
          stopOrder: stop.stopOrder,
          scheduledTime: stop.scheduledTime,
          routeId: created.id
        }
      });
      stopIdMap.set(stop.id, createdStop.id);
    }
  }

  for (const bus of seed.buses) {
    await prisma.bus.create({
      data: {
        busNumber: bus.busNumber,
        routeId: routeMap.get(bus.routeId),
        lat: bus.lat,
        lng: bus.lng,
        speed: bus.speed,
        seatsTotal: bus.seatsTotal,
        seatsOccupied: bus.seatsOccupied,
        isActive: bus.isActive,
        currentStop: bus.currentStop,
        etaMinutes: bus.etaMinutes
      }
    });
  }

  for (const alert of seed.alerts) {
    await prisma.alert.create({
      data: {
        userId: userMap.get(alert.userId),
        stopId: stopIdMap.get(alert.stopId),
        notifyMinutesBefore: alert.notifyMinutesBefore,
        isActive: alert.isActive
      }
    });
  }
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
