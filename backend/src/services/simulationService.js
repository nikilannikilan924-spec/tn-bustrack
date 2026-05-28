const store = require('./store');
const { advanceBus } = require('./locationService');
const { randomSeatSnapshot } = require('./seatService');
const { createAlertPayload, shouldNotify } = require('./notificationService');

const runtimeState = new Map();

async function tickBuses(emit) {
  const buses = await store.listBuses();
  const updated = [];

  for (const bus of buses) {
    const route = bus.route;
    if (!route?.stops?.length) continue;

    const state = runtimeState.get(bus.id) || { pathIndex: 0, tickCount: 0 };
    const movement = advanceBus(bus, route, state);
    if (!movement) continue;

    const seatState = randomSeatSnapshot(bus);
    const savedBus = await store.updateBusLocation(bus.id, {
      lat: movement.lat,
      lng: movement.lng,
      speed: movement.speed,
      currentStop: movement.currentStop,
      etaMinutes: movement.etaMinutes
    });
    const busAfterSeatUpdate = await store.updateBusSeats(bus.id, {
      seatsTotal: bus.seatsTotal,
      seatsOccupied: seatState.seatsOccupied
    });

    runtimeState.set(bus.id, { pathIndex: movement.pathIndex, tickCount: state.tickCount + 1 });
    updated.push(busAfterSeatUpdate || savedBus);

    if (emit) {
      emit('busLocationUpdate', {
        busId: bus.id,
        lat: movement.lat,
        lng: movement.lng,
        speed: movement.speed,
        routeId: bus.routeId,
        currentStop: movement.currentStop,
        etaMinutes: movement.etaMinutes
      });
      emit('seatUpdate', {
        busId: bus.id,
        seatsAvailable: seatState.seatsAvailable
      });
      if (shouldNotify(movement.etaMinutes, 10)) {
        emit('busAlert', createAlertPayload(bus, movement.etaMinutes));
      }
    }
  }

  return updated;
}

module.exports = { tickBuses };
