const mongoose = require('mongoose');

const payoutSchema = new mongoose.Schema(
  {
    payoutId: {
      type: String,
      required: true,
    },
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    completeDeliveries: {
      type: Number,
      required: true,
      min: 0,
    },
    payoutRate: {
      type: Number,
      required: true,
      min: 0,
    },
    totalPayout: {
      type: Number,
      required: true,
      min: 0,
    },
    deduction: {
      type: Number,
      required: true,
      min: 0,
    },
    bonus: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentMethod: {
      type: String,
      required: true,
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

payoutSchema.pre('save', async function (next) {
  try {
    if (this.isNew && !this.reportId) {
      const Counter = mongoose.model('Counter');
      const counter = await Counter.findByIdAndUpdate(
        { _id: 'payoutId' },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      this.reportId = `PYT-${String(counter.seq).padStart(6, '0')}`;
    }
    
    // Calculate compliance rate
    if (this.audit > 0) {
      this.complianceRate = ((this.audit - this.violation) / this.audit) * 100;
    }
    
    next();
  } catch (err) {
    next(err);
  }
});

const Payout = mongoose.model('Payout', payoutSchema);

module.exports = Payout;
