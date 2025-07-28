const mongoose = require('mongoose');

const complianceSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true
  },
  regulationType: {
    type: String,
    required: true
  },
  audit: {
    type: Number,
    required: true,
    min: 0
  },
  violation: {
    type: Number,
    required: true,
    min: 0
  },
  violationType: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['Pending', 'In Progress', 'Completed', 'Failed'],
    default: 'Pending'
  }
}, {
  timestamps: true
});

const ComplianceReport = mongoose.model('ComplianceReport', complianceSchema);

module.exports = ComplianceReport;
