const mongoose = require('mongoose');

const routeSchema = new mongoose.Schema(
  {
    routeName: {
      type: String,
      required: false,
    },
    startLocation: {
      address: {
        type: String,
        required: false,
      },
      city: {
        type: String,
        required: false,
      },
      state: {
        type: String,
        required: false,
      },
      zipcode: {
        type: String,
        required: false,
      },
      coordinates: { type: [Number], required: true },
    },
    endLocation: {
      address: {
        type: String,
        required: false,
      },
      city: {
        type: String,
        required: false,
      },
      state: {
        type: String,
        required: false,
      },
      zipcode: {
        type: String,
        required: false,
      },
      coordinates: { type: [Number], required: true },
    },
    stops: [
      {
        name: String,
        coordinates: { type: [Number] },
      },
    ],
    assignedDriver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Driver',
      required: false,
    },
    eta: {
      type: String,
    },
    activeDays: {
      type: [String],
      enum: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      default: [],
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive', 'Completed', 'Archived'],
      default: 'Active',
    },
    geometry: {
      type: [[Number]],
      required: false,
    },
  },
  {
    timestamps: true,
  },
);

const Route = mongoose.model('Route', routeSchema);

module.exports = Route;
