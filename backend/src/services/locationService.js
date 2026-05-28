const { clamp } = require('../utils/helpers');
const { haversineDistanceKm, estimateEtaMinutes } = require('../utils/etaCalculator');

function buildRoutePath(stops, stepsPerSegment = 8) {
  const path = [];

  for (let index = 0; index < stops.length - 1; index += 1) {
    const start = stops[index];
    const end = stops[index + 1];

    for (let step = 0; step < stepsPerSegment; step += 1) {
      const ratio = step / stepsPerSegment;
      path.push({
        lat: Number((start.lat + (end.lat - start.lat) * ratio).toFixed(6)),
        lng: Number((start.lng + (end.lng - start.lng) * ratio).toFixed(6))
      });
    }
  }

  if (stops.length) {
    const last = stops[stops.length - 1];
    path.push({ lat: last.lat, lng: last.lng });
  }

  return path;
}

function advanceBus(bus, route, state = {}) {
  const stops = (route && route.stops) || [];
  if (stops.length < 2) return null;

  const path = buildRoutePath(stops);
  const currentIndex = Number.isInteger(state.pathIndex) ? state.pathIndex : 0;
  const nextIndex = (currentIndex + 1) % path.length;
  const point = path[nextIndex];
  const stopIndex = clamp(Math.floor(nextIndex / 8), 0, stops.length - 1);
  const currentStop = stops[stopIndex];
  const remainingStops = stops.length - stopIndex - 1;
  const etaMinutes = clamp(remainingStops * 6 + Math.round((state.tickCount || 0) % 3), 1, 240);

  return {
    lat: point.lat,
    lng: point.lng,
    speed: bus.speed || 30,
    currentStop: currentStop?.name || bus.currentStop,
    etaMinutes,
    pathIndex: nextIndex,
    distanceToNextStopKm: currentStop
      ? haversineDistanceKm(point.lat, point.lng, currentStop.lat, currentStop.lng)
      : 0,
    estimatedStopEtaMinutes: currentStop
      ? estimateEtaMinutes(haversineDistanceKm(point.lat, point.lng, currentStop.lat, currentStop.lng), bus.speed || 30)
      : 0
  };
}

function nearbyStops(stops, lat, lng, radiusKm = 5) {
  return stops
    .map((stop) => ({
      ...stop,
      distanceKm: Number(haversineDistanceKm(lat, lng, stop.lat, stop.lng).toFixed(2))
    }))
    .filter((stop) => stop.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

module.exports = { buildRoutePath, advanceBus, nearbyStops };
