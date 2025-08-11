const Order = require('@models/Orders');
const User = require('@models/User');
const { findBestMatchingRoute, getRouteSuggestions, findOrCreateRouteForDelivery } = require('../helpers/routeMatching');

// Helper function to get status color
const getStatusColor = (status) => {
  const statusColors = {
    Pending: 'bg-yellow-100 text-yellow-800',
    Active: 'bg-green-100 text-green-800',
    Delivered: 'bg-green-100 text-green-800',
    'Picked Up': 'bg-blue-100 text-blue-800',
    Scheduled: 'bg-yellow-100 text-yellow-800',
    Cancelled: 'bg-red-100 text-red-800',
    Hold: 'bg-red-100 text-red-800',
    'Return Created': 'bg-teal-100 text-teal-800',
    'Invoice Generated': 'bg-green-100 text-green-800',
  };
  return statusColors[status] || 'bg-gray-100 text-gray-800';
};

module.exports = {
  createOrder: async (req, res) => {
    try {
      const { items } = req.body;
      const user = req.user._id;

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          status: false,
          message: 'Missing or invalid items',
        });
      }

      const userDetails = await User.findById(user).select('delivery_Address');
      if (!userDetails) {
        return res.status(404).json({
          status: false,
          message: 'User not found',
        });
      }

      const createdOrders = [];

      for (const item of items) {
        const staticPickupAddress = "160 W Forest Ave, Englewood";
        
        // Create delivery address string for route matching
        const deliveryAddress = `${userDetails.delivery_Address.address}, ${userDetails.delivery_Address.city}, ${userDetails.delivery_Address.state} ${userDetails.delivery_Address.zipcode}`;

        const hospitalName = item.hospitalName || userDetails.name || `Hospital-${user.toString().slice(-6)}`;
        const hospitalAddress = item.hospitalAddress || `${item.pickupLocation}, ${item.pickupCity}, ${item.pickupState} ${item.pickupZipcode}`;

        console.log(`🚀 Creating order from hospital: "${hospitalName}" → delivery: "${deliveryAddress}"`);

        // Find route based only on delivery location, create if none exists, add hospital as stop
        const routeMatch = await findOrCreateRouteForDelivery(staticPickupAddress, deliveryAddress, hospitalName, hospitalAddress);
        
        const order = new Order({
          items: item.itemId,
          qty: item.qty,
          pickupLocation: {
            address: "160 W Forest Ave",
            city: "Englewood",
            state: "NJ", // Assuming New Jersey, adjust if different
            zipcode: "07631", // Assuming this zipcode, adjust if different
          },
          deliveryLocation: userDetails.delivery_Address,
          user,
          // Always assign the route (either found or created)
          route: routeMatch.route ? routeMatch.route._id : null,
        });

        await order.save();

        const orderWithRouteInfo = order.toObject();
        if (routeMatch.route) {
          orderWithRouteInfo.routeAssignment = {
            assigned: true,
            routeName: routeMatch.route.routeName,
            created: routeMatch.created || false,
            stopAdded: routeMatch.stopAdded || false,
            hospitalName: hospitalName,
            matchScore: routeMatch.matchScore || 100,
            deliveryDistance: routeMatch.deliveryDistance || 0,
            message: routeMatch.message || (routeMatch.created 
              ? `New route created and assigned: "${routeMatch.route.routeName}"`
              : `Assigned to existing route: "${routeMatch.route.routeName}"`)
          };
          
          if (routeMatch.created) {
            console.log(`✅ Order ${order.orderId} assigned to NEW route "${routeMatch.route.routeName}" with hospital "${hospitalName}" as stop`);
          } else if (routeMatch.stopAdded) {
            console.log(`✅ Order ${order.orderId} assigned to EXISTING route "${routeMatch.route.routeName}" and hospital "${hospitalName}" added as stop`);
          } else {
            console.log(`✅ Order ${order.orderId} assigned to EXISTING route "${routeMatch.route.routeName}" (hospital "${hospitalName}" already in stops)`);
          }
        } else {
          orderWithRouteInfo.routeAssignment = {
            assigned: false,
            reason: 'Failed to find or create route',
            message: 'Unable to assign route. Please check delivery address and try again.'
          };
          console.log(`⚠️  Order ${order.orderId} not assigned: Failed to find or create route`);
        }

        createdOrders.push(orderWithRouteInfo);
      }

      res.status(201).json({
        status: true,
        message: 'Orders created successfully',
        orders: createdOrders,
        summary: {
          totalOrders: createdOrders.length,
          assignedOrders: createdOrders.filter(o => o.routeAssignment.assigned).length,
          unassignedOrders: createdOrders.filter(o => !o.routeAssignment.assigned).length
        }
      });
    } catch (error) {
      console.error('Error creating orders:', error);
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
        eta,
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
  },
  getRouteSuggestions: async (req, res) => {
    try {
      const { address, maxDistance = 30 } = req.query;
      
      if (!address) {
        return res.status(400).json({
          status: false,
          message: 'Address parameter is required'
        });
      }

      console.log(`🔍 Getting route suggestions for address: "${address}" within ${maxDistance}km`);

      const suggestions = await getRouteSuggestions(address, parseInt(maxDistance));

      res.status(200).json({
        status: true,
        address,
        maxDistance: parseInt(maxDistance),
        suggestionsCount: suggestions.length,
        suggestions: suggestions.map(s => ({
          routeId: s.route._id,
          routeName: s.route.routeName,
          distance: parseFloat(s.distance.toFixed(2)),
          matchType: s.matchType,
          matchLocation: s.matchDetails.description,
          startLocation: s.route.startLocation,
          endLocation: s.route.endLocation,
          stopsCount: s.route.stops ? s.route.stops.length : 0
        }))
      });
    } catch (error) {
      console.error('Error getting route suggestions:', error);
      res.status(500).json({ status: false, message: error.message });
    }
  },
};
