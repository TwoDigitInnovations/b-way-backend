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
      } = req.body;

      const user = req.user._id;

      if (!items || !qty || !deliveryLocation) {
        return res.status(400).json({
          status: false,
          message: 'Missing required fields',
        });
      }

      const order = new Order({
        items,
        qty,
        pickupLocation: {
          address: pickupLocation,
          city: pickupCity,
          state: pickupState,
          zipcode: pickupZipcode,
        },
        deliveryLocation: {
          address: deliveryLocation,
          city: deliveryCity,
          state: deliveryState,
          zipcode: deliveryZipcode,
        },
        user,
      });

      await order.save();
      res
        .status(201)
        .json({ status: true, message: 'Order created successfully', order });
    } catch (error) {
      console.error('Error creating order:', error);
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
        .populate('route', 'routeName')
        .select('-__v')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean();

      orders.forEach((order, index) => {
        order.index = skip + index + 1;
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
      const order = await Order.findById(req.params.id)
        .populate('route', 'routeName')
        .select('-__v');
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
        route,
        status,
        eta
      } = req.body;
      const order = await Order.findByIdAndUpdate(
        req.params.id,
        { items, qty, pickupLocation, deliveryLocation, route, status, eta },
        { new: true },
      );

      if (!order) {
        return res
          .status(404)
          .json({ status: false, message: 'Order not found' });
      }

      res.status(200).json({
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
  getOrdersByUser: async (req, res) => {
    try {
      const userId = req.user._id;
      const orders = await Order.find({ user: userId })
        .populate('route', 'routeName')
        .select('-__v')
        .sort({ createdAt: -1 });

      if (!orders || orders.length === 0) {
        return res
          .status(404)
          .json({ status: false, message: 'No orders found for this user' });
      }

      res.status(200).json({ status: true, data: orders });
    } catch (error) {
      res.status(500).json({ status: false, message: error.message });
    }
  }
};
