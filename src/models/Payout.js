const mongoose = require('mongoose');

const payoutSchema = new mongoose.Schema({
    payoutId: {
        type: String,
        // required: true,
        unique: true,
    },
    driver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    deliveries: {
        type: Number,
        required: true,
        min: 0
    },
    payoutRate: {
        type: Number,
        required: true,
        min: 0
    },
    totalPayout: {
        type: Number,
        required: true,
        min: 0
    },
    deductions: {
        type: Number,
        default: 0,
        min: 0
    },
    bonus: {
        type: Number,
        default: 0,
        min: 0
    },
    paymentMethod: {
        type: String,
        enum: ['ACH', 'Check', 'Cash'],
        required: true
    },
    status: {
        type: String,
        enum: ['Pending', 'Paid', 'Failed'],
        default: 'Pending'
    }
}, {
    timestamps: true
});

payoutSchema.pre('save', async function (next) {
  try {
    if (this.isNew) {
      const payoutId = `PAYOUT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      this.payoutId = payoutId;
    }

    next();
  } catch (err) {
    next(err);
  }
});

const Payout = mongoose.model('Payout', payoutSchema);
module.exports = Payout;
