const Order = require('@models/Orders');
const User = require('@models/User');

// Helper function to get status color
const getStatusColor = (status) => {
  const statusColors = {
    'Pending': 'bg-yellow-100 text-yellow-800',
    'Active': 'bg-green-100 text-green-800',
    'Delivered': 'bg-green-100 text-green-800',
    'Picked Up': 'bg-blue-100 text-blue-800',
    'Scheduled': 'bg-yellow-100 text-yellow-800',
    'Cancelled': 'bg-red-100 text-red-800',
    'Hold': 'bg-red-100 text-red-800',
    'Return Created': 'bg-teal-100 text-teal-800',
    'Invoice Generated': 'bg-green-100 text-green-800',
  };
  return statusColors[status] || 'bg-gray-100 text-gray-800';
};

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

      if (!items || !qty) {
        return res.status(400).json({
          status: false,
          message: 'Missing required fields',
        });
      }

      let userDetails;

      if (user) {
        userDetails = await User.findById(user).select('delivery_Address');
        if (!userDetails) {
          return res.status(404).json({
            status: false,
            message: 'User not found',
          });
        }
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
        deliveryLocation: userDetails.delivery_Address || {
          address: deliveryLocation,
          city: deliveryCity,
          state: deliveryState,
          zipcode: deliveryZipcode,
        },
        // deliveryLocation: {
        //   address: deliveryLocation,
        //   city: deliveryCity,
        //   state: deliveryState,
        //   zipcode: deliveryZipcode,
        // },
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
        .populate('user', 'name email role')
        .populate('items', 'name')
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
        .populate('user', 'name email role')
        .populate('items', 'name')
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
    const { page = 1, limit = 10 } = req.query;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    try {
      const userId = req.user._id;
      const orders = await Order.find({ user: userId })
        .populate('route', 'routeName')
        .populate('user', 'name email role')
        .populate('items', 'name')
        .select('-__v')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean();

      orders.forEach((order, index) => {
        order.index = skip + index + 1;
      });

      const totalOrders = await Order.countDocuments({ user: userId });
      const totalPages = Math.ceil(totalOrders / limitNum);

      if (!orders || orders.length === 0) {
        return res
          .status(404)
          .json({ status: false, message: 'No orders found for this user' });
      }

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
  getRecentOrders: async (req, res) => {
    try {
      const { limit = 6 } = req.query;
      const limitNum = parseInt(limit, 10);
      const { role, _id } = req.user;

     
      let query = {};
      if (role === 'USER') {
        // Dispatchers and regular users see only their orders
        query = { user: _id };
      }
      // Admin users see all orders (no filter needed)

      const orders = await Order.find(query)
        .populate('route', 'routeName')
        .populate('user', 'name email role')
        .populate('items', 'name')
        .select('-__v')
        .sort({ createdAt: -1 })
        .limit(limitNum)
        .lean();

  
      const transformedOrders = orders.map((order, index) => ({
        no: index + 1,
        facilityName: order.user?.name || 'N/A',
        orderId: order.orderId,
        items: order.items?.name || 'N/A',
        qty: order.qty,
        status: order.status,
        statusColor: getStatusColor(order.status),
        assignedDriver: order.assignedDriver ? 'Assigned' : 'Unassigned',
        route: order.route?.routeName || 'N/A',
        eta: order.eta || 'N/A',
      }));

      res.status(200).json({
        status: true,
        data: transformedOrders,
        total: orders.length,
      });
    } catch (error) {
      console.error('Error fetching recent orders:', error);
      res.status(500).json({ status: false, message: error.message });
    }
  }
};
