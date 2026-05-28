const store = require('../services/store');

async function getAllStops(_req, res, next) {
  try {
    res.json(await store.listStops());
  } catch (error) {
    next(error);
  }
}

async function getStopById(req, res, next) {
  try {
    const stop = await store.getStop(req.params.id);
    if (!stop) return res.status(404).json({ message: 'Stop not found' });
    res.json(stop);
  } catch (error) {
    next(error);
  }
}

async function getNearbyStops(req, res, next) {
  try {
    const { lat, lng, radiusKm } = req.query;
    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ message: 'lat and lng are required' });
    }
    res.json(await store.nearbyStopsQuery(lat, lng, radiusKm));
  } catch (error) {
    next(error);
  }
}

module.exports = { getAllStops, getStopById, getNearbyStops };
