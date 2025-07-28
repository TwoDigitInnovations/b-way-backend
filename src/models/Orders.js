const generateOrderId = require('../helpers/generateOrderId');
const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      // required: true,
      unique: true,
    },
    items: {
      type: String,
      required: true,
    },
    qty: {
      type: Number,
      required: true,
      min: 1,
    },
    pickupLocation: {
      type: String,
      required: true,
    },
    deliveryLocation: {
      type: String,
      required: true,
    },
    assignedDriver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    route: {
      type: String,
      required: true,
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
        "Picked Up"
      ],
      default: 'Pending',
    },
    eta: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
);

orderSchema.pre('save', async function (next) {
  try {
    if (this.isNew) {
      const lastOrder = await Order.findOne().sort({ createdAt: -1 });

      if (lastOrder && lastOrder.orderId) {
        const lastNumber = parseInt(lastOrder.orderId.replace(/\D/g, ''), 10);
        this.orderId = `ORD-${String(lastNumber + 1).padStart(3, '0')}`;
      } else {
        this.orderId = generateOrderId(this._id);
      }
    } else if (this.isModified('orderId')) {
      this.orderId = generateOrderId(this._id);
    }

    next();
  } catch (err) {
    next(err);
  }
});

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
