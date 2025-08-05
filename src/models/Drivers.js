const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema(
  {
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    licenseNumber: {
      type: String,
      required: true,
      // unique: true,
    },
    vehicleType: {
      type: String,
      enum: ['Van', 'Truck', 'Bike', 'Car', 'Other'],
      required: true,
    },
    assignedRoute: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Route',
    }],
    status: {
      type: String,
      enum: ['Pending', 'Active', 'Inactive', 'Suspended', 'On-Delivery', 'Off-Duty'],
      default: 'Pending',
    },
  },
  {
    timestamps: true,
  },
);

const Driver = mongoose.model('Driver', driverSchema);

module.exports = Driver;
