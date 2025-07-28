const mongoose = require('mongoose');

const routeSchema = new mongoose.Schema({
  routeName: {
    type: String,
    required: true
  },
  startLocation: {
    type: String,
    required: true
  },
  endLocation: {
    type: String,
    required: true
  },
  stops: {
    type: [String]
  },
  assignedDriver: {
    type: String,
    required: true
  },
  eta: {
    type: String,
  },
  activeDays: {
    type: [String],
    enum: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    default: []
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive', 'Completed', 'Archived'],
    default: 'Active'
  }
}, {
  timestamps: true
});

const Route = mongoose.model('Route', routeSchema);

module.exports = Route;
