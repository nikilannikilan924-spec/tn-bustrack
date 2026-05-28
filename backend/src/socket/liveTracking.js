const { tickBuses } = require('../services/simulationService');
const store = require('../services/store');

function initLiveTracking(io) {
  io.on('connection', async (socket) => {
    socket.emit('connected', { ok: true });
    socket.on('trackBus', ({ busId }) => socket.join(`bus:${busId}`));
    socket.on('trackRoute', ({ routeId }) => socket.join(`route:${routeId}`));
    socket.on('stopTracking', ({ busId }) => socket.leave(`bus:${busId}`));

    const currentBuses = await store.listBuses();
    socket.emit('busLocationUpdate', currentBuses.map((bus) => ({ busId: bus.id, lat: bus.lat, lng: bus.lng, speed: bus.speed })));

    const interval = setInterval(async () => {
      const updatedBuses = await tickBuses((event, payload) => {
        io.emit(event, payload);
        if (payload?.busId) {
          io.to(`bus:${payload.busId}`).emit(event, payload);
        }
        if (payload?.routeId) {
          io.to(`route:${payload.routeId}`).emit(event, payload);
        }
      });
      io.emit('busesRefreshed', updatedBuses);
    }, 5000);

    socket.on('disconnect', () => clearInterval(interval));
  });
}

module.exports = { initLiveTracking };
