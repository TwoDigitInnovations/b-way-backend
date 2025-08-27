const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

const Counter = mongoose.model('Counter', counterSchema);

const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      unique: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    items: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Item',
      required: true,
    },
    qty: {
      type: Number,
      required: true,
      min: 1,
    },
    pickupLocation: {
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
    },
    deliveryLocation: {
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
    },
    // assignedDriver: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: 'User',
    //   required: true,
    // },
    route: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Route',
      required: false,
    },
    status: {
      type: String,
      enum: [
        'Cancelled',
        'Delivered',
        'Scheduled',
        'Return Created',
        'Invoice Generated',
        'Pending',
        'Picked Up',
        'Returned'
      ],
      default: 'Pending',
    },
    eta: {
      type: String,
    }
  },
  {
    timestamps: true,
  },
);

orderSchema.pre('save', async function (next) {
  try {
    if (this.isNew) {
      const counter = await Counter.findByIdAndUpdate(
        { _id: 'orderId' },
        { $inc: { seq: 1 } },
        { new: true, upsert: true },
      );

      this.orderId = `ORD-${String(counter.seq).padStart(6, '0')}`;
    }
    next();
  } catch (err) {
    next(err);
  }
});

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
