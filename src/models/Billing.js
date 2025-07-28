const mongoose = require('mongoose');

const billingSchema = new mongoose.Schema({
  hospital: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hospital',
    required: true
  },
  courier: {
    type: String,
    required: true
  },
  invoiceDate: {
    type: Date,
    required: true
  },
  dueDate: {
    type: Date,
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['Paid', 'Unpaid', 'Overdue', 'Pending', "Partially Paid"],
    default: 'Unpaid'
  }
}, {
  timestamps: true
});

const Billing = mongoose.model('Billing', billingSchema);

module.exports = Billing;
