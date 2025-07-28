const mongoose = require('mongoose');

const hospitalSchema = new mongoose.Schema(
  {
    hospitalName: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    contactPerson: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    assignedRoute: {
      type: String,
      required: true,
    },
    deliveryWindow: {
      startTime: {
        type: String,
        required: true,
      },
      endTime: {
        type: String,
        required: true,
      },
    },
    type: {
      type: String,
      enum: ['Hospital', 'Clinic', 'Pharmacy', 'Other'],
    },
  },
  {
    timestamps: true,
  },
);

const Hospital = mongoose.model('Hospital', hospitalSchema);

module.exports = Hospital;
