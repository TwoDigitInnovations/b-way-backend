const Order = require('@models/Orders');
const User = require('@models/User');

module.exports = {
  createOrder: async (req, res) => {
    try {
      const {
        items,
        qty,
        pickupLocation,
        deliveryLocation,
        assignedDriver,
        route,
      } = req.body;
      const order = new Order({
        items,
        qty,
        pickupLocation,
        deliveryLocation,
        assignedDriver,
        route,
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
        .select('-__v')
        .skip(skip)
        .limit(limit)
        .lean();

      orders.forEach((order, index) => {
        order.index = skip + index + 1;
        order.assignedDriver = order.assignedDriver || {
          name: '',
          email: '',
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
};
