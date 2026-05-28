const mongoose = require('mongoose');

const stopSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    sequence: { type: Number, required: true }
  },
  { _id: false }
);

const routeSchema = new mongoose.Schema(
  {
    number: { type: String, required: true },
    name: { type: String, required: true },
    operator: { type: String, required: true },
    busType: { type: String, required: true },
    origin: { type: String, required: true },
    destination: { type: String, required: true },
    status: { type: String, required: true },
    stops: { type: [stopSchema], default: [] }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Route', routeSchema);
