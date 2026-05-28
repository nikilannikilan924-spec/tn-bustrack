const mongoose = require('mongoose');

const stopSchema = new mongoose.Schema(
  {
    routeId: { type: String, required: true },
    name: { type: String, required: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    sequence: { type: Number, required: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Stop', stopSchema);
