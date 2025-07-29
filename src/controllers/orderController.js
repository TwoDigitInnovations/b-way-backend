const Order = require('@models/Orders');
const User = require('@models/User');

module.exports = {
  createOrder: async (req, res) => {
    try {
      const {
        items,
        qty,
        pickupLocation,
        pickupCity,
        pickupState,
        pickupZipcode,
        deliveryLocation,
        deliveryCity,
        deliveryState,
        deliveryZipcode,
        assignedDriver,
        route,
        eta,
      } = req.body;
      const order = new Order({
        items,
        qty,
        pickupLocation,
        pickupCity,
        pickupState,
        pickupZipcode,
        deliveryLocation,
        deliveryCity,
        deliveryState,
        deliveryZipcode,
        assignedDriver,
        route,
        eta,
      });

      await order.save();
      res
        .status(201)
        .json({ status: true, message: 'Order created successfully', order });
    } catch (error) {
      res.status(500).json({ status: false, message: error.message });
    }
  },
  getOrders: async (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    try {
      const orders = await Order.find()
        .populate('assignedDriver', 'name email _id')
        .populate('route', 'routeName')
        .select('-__v')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean();

      orders.forEach((order, index) => {
        order.index = skip + index + 1;
        order.assignedDriver = order.assignedDriver || {
          name: '',
          email: '',
          _id: null,
        };
        order.route = order.route || {
          routeName: '',
          _id: null,
        };
      });

      const totalOrders = await Order.countDocuments();
      const totalPages = Math.ceil(totalOrders / limitNum);

      res.status(200).json({
        status: true,
        currentPage: pageNum,
        totalPages,
        totalOrders,
        limit: limitNum,
        data: orders,
      });
    } catch (error) {
      res.status(500).json({ status: false, message: error.message });
    }
  },
  getOrderById: async (req, res) => {
    try {
      const order = await Order.findById(req.params.id).populate(
        'assignedDriver',
        'name email',
      );
      if (!order) {
        return res
          .status(404)
          .json({ status: false, message: 'Order not found' });
      }
      res.status(200).json({ status: true, data: order });
    } catch (error) {
      res.status(500).json({ status: false, message: error.message });
    }
  },
  updateOrder: async (req, res) => {
    try {
      const {
        items,
        qty,
        pickupLocation,
        deliveryLocation,
        assignedDriver,
        route,
      } = req.body;
      const order = await Order.findByIdAndUpdate(
        req.params.id,
        { items, qty, pickupLocation, deliveryLocation, assignedDriver, route },
        { new: true },
      );

      if (!order) {
        return res
          .status(404)
          .json({ status: false, message: 'Order not found' });
      }

      res
        .status(200)
        .json({
          status: true,
          message: 'Order updated successfully',
          data: order,
        });
    } catch (error) {
      res.status(500).json({ status: false, message: error.message });
    }
  },
  deleteOrder: async (req, res) => {
    try {
      const order = await Order.findByIdAndDelete(req.params.id);
      if (!order) {
        return res
          .status(404)
          .json({ status: false, message: 'Order not found' });
      }
      res
        .status(200)
        .json({ status: true, message: 'Order deleted successfully' });
    } catch (error) {
      res.status(500).json({ status: false, message: error.message });
    }
  },
};
