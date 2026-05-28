const store = require('../services/store');

async function getAllRoutes(_req, res, next) {
  try {
    res.json(await store.listRoutes());
  } catch (error) {
    next(error);
  }
}

async function getRouteById(req, res, next) {
  try {
    const route = await store.getRoute(req.params.id);
    if (!route) return res.status(404).json({ message: 'Route not found' });
    res.json(route);
  } catch (error) {
    next(error);
  }
}

async function searchRoutes(req, res, next) {
  try {
    res.json(await store.searchRoutes(req.query));
  } catch (error) {
    next(error);
  }
}

async function getRouteStops(req, res, next) {
  try {
    const route = await store.getRoute(req.params.id);
    if (!route) return res.status(404).json({ message: 'Route not found' });
    res.json(route.stops || []);
  } catch (error) {
    next(error);
  }
}

module.exports = { getAllRoutes, getRouteById, searchRoutes, getRouteStops };
