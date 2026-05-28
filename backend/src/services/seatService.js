const { clamp } = require('../utils/helpers');

function randomSeatSnapshot(bus) {
  const occupiedShift = Math.random() > 0.5 ? 1 : -1;
  const seatsOccupied = clamp((bus.seatsOccupied || 0) + occupiedShift, 0, bus.seatsTotal || 40);
  return {
    seatsOccupied,
    seatsAvailable: (bus.seatsTotal || 40) - seatsOccupied
  };
}

function seatSummary(bus) {
  const total = bus.seatsTotal || 0;
  const occupied = bus.seatsOccupied || 0;
  return {
    total,
    occupied,
    available: Math.max(0, total - occupied)
  };
}

module.exports = { randomSeatSnapshot, seatSummary };
