const mongoose = require('mongoose');

const busSchema = new mongoose.Schema(
  {
    number: { type: String, required: true },
    routeId: { type: String, required: true },
    operator: { type: String, required: true },
    busType: { type: String, required: true },
    status: { type: String, required: true },
    seatCapacity: { type: Number, required: true },
    seatsAvailable: { type: Number, required: true },
    etaMinutes: { type: Number, required: true },
    currentStop: { type: String, required: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    pathIndex: { type: Number, required: true },
    tickCount: { type: Number, default: 0 }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Bus', busSchema);
