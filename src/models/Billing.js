const mongoose = require('mongoose');

const billingSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: false,
    },
    hospital: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    courier: {
      type: String,
      required: true,
    },
    invoiceDate: {
      type: Date,
      required: true,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: [
        'Paid',
        'Unpaid',
        'Overdue',
        'Pending',
        'Partially Paid',
        'Cancelled',
      ],
      default: 'Unpaid',
    },
  },
  {
    timestamps: true,
  },
);

const Billing = mongoose.model('Billing', billingSchema);

module.exports = Billing;
