const { clamp } = require('./helpers');

function haversineDistanceKm(lat1, lng1, lat2, lng2) {
  const earthRadiusKm = 6371;
  const toRad = (value) => (value * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;

  return 2 * earthRadiusKm * Math.asin(Math.sqrt(a));
}

function estimateEtaMinutes(distanceKm, speedKmh = 30) {
  const safeSpeed = clamp(speedKmh || 30, 5, 80);
  return Math.max(1, Math.round((distanceKm / safeSpeed) * 60));
}

module.exports = { haversineDistanceKm, estimateEtaMinutes };
