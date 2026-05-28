const store = require('../services/store');
const { seatSummary } = require('../services/seatService');

async function getAllBuses(_req, res, next) {
  try {
    res.json(await store.listBuses());
  } catch (error) {
    next(error);
  }
}

async function getLiveBuses(_req, res, next) {
  try {
    const buses = await store.listBuses();
    res.json(buses.map((bus) => ({
      id: bus.id,
      busNumber: bus.busNumber,
      routeId: bus.routeId,
      lat: bus.lat,
      lng: bus.lng,
      speed: bus.speed,
      currentStop: bus.currentStop,
      etaMinutes: bus.etaMinutes,
      isActive: bus.isActive,
      route: bus.route || null
    })));
  } catch (error) {
    next(error);
  }
}

async function getBusById(req, res, next) {
  try {
    const bus = await store.getBus(req.params.id);
    if (!bus) return res.status(404).json({ message: 'Bus not found' });
    res.json(bus);
  } catch (error) {
    next(error);
  }
}

async function getBusSeats(req, res, next) {
  try {
    const bus = await store.getBus(req.params.id);
    if (!bus) return res.status(404).json({ message: 'Bus not found' });
    res.json(seatSummary(bus));
  } catch (error) {
    next(error);
  }
}

async function updateBusLocation(req, res, next) {
  try {
    const { lat, lng, speed, currentStop, etaMinutes } = req.body;
    const bus = await store.updateBusLocation(req.params.id, { lat, lng, speed, currentStop, etaMinutes });
    if (!bus) return res.status(404).json({ message: 'Bus not found' });
    res.json(bus);
  } catch (error) {
    next(error);
  }
}

async function updateBusSeats(req, res, next) {
  try {
    const { seatsTotal, seatsOccupied } = req.body;
    const bus = await store.updateBusSeats(req.params.id, { seatsTotal, seatsOccupied });
    if (!bus) return res.status(404).json({ message: 'Bus not found' });
    res.json(seatSummary(bus));
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAllBuses,
  getLiveBuses,
  getBusById,
  getBusSeats,
  updateBusLocation,
  updateBusSeats
};
