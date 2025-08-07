const mongoose = require('mongoose');

const routeSchema = new mongoose.Schema(
  {
    routeName: {
      type: String,
      required: true,
    },
    startLocation: {
      address: {
        type: String,
        required: true,
      },
      city: {
        type: String,
        required: true,
      },
      state: {
        type: String,
        required: true,
      },
      zipcode: {
        type: String,
        required: true,
      },
      coordinates: { type: [Number], required: true },
    },
    endLocation: {
      address: {
        type: String,
        required: true,
      },
      city: {
        type: String,
        required: true,
      },
      state: {
        type: String,
        required: true,
      },
      zipcode: {
        type: String,
        required: true,
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
      required: true,
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
    geofences: {
      type: [String], // Geofence IDs for routes
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

const Route = mongoose.model('Route', routeSchema);

module.exports = Route;
