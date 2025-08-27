const Order = require('@models/Orders');
const User = require('@models/User');
const Item = require('@models/items');
const Billing = require('@models/Billing');
const {
  findBestMatchingRoute,
  getRouteSuggestions,
  findOrCreateRouteForDelivery,
} = require('../helpers/routeMatching');
const { default: courierGen } = require('@helpers/courier');
const sqsService = require('@services/sqsService');

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

      const userDetails = await User.findById(user).select(
        'name delivery_Address',
      );
      if (!userDetails) {
        return res.status(404).json({
          status: false,
          message: 'User not found',
        });
      }

      const createdOrders = [];
      const routeAssignmentMessages = [];
      const invoiceGenerationMessages = [];

      for (const item of items) {
        const staticPickupAddress = '160 W Forest Ave, Englewood';
        const deliveryAddress = `${userDetails.delivery_Address.address}, ${userDetails.delivery_Address.city}, ${userDetails.delivery_Address.state} ${userDetails.delivery_Address.zipcode}`;
        const hospitalName =
          userDetails.name ||
          userDetails.name ||
          `Hospital-${user.toString().slice(-6)}`;

        console.log(
          `🚀 Creating order from hospital: "${hospitalName}" → delivery: "${deliveryAddress}" | Urgency: ${item.deliveryUrgency || 'Stat'} | Temp: ${item.temperatureRequirements || 'Controlled'}`,
        );

        // Create order
        const order = new Order({
          items: item.itemId,
          qty: item.qty,
          deliveryUrgency: item.deliveryUrgency || 'Stat',
          scheduledDateTime: item.scheduledDateTime || null,
          temperatureRequirements: item.temperatureRequirements || 'Controlled',
          hipaaFdaCompliance: item.hipaaFdaCompliance || 'No',
          description: item.description || 'No description provided',
          pickupLocation: {
            address: '160 W Forest Ave',
            city: 'Englewood',
            state: 'NJ',
          },
          deliveryLocation: userDetails.delivery_Address,
          user,
          route: null,
          status: 'Pending',
        });

        await order.save();

        // Populate the order with item details for socket emission
        const populatedOrder = await Order.findById(order._id)
          .populate('items', 'name')
          .lean();

        // Emit real-time order creation event
        try {
          console.log(
            '🔍 Checking socketService availability:',
            !!req.socketService,
          );
          if (req.socketService) {
            console.log('📡 Emitting new order to admins and user...');

            // Emit to admin users
            req.socketService.emitNewOrderToAdmins({
              _id: order._id,
              orderId: order.orderId,
              items: populatedOrder.items?.name || 'N/A',
              qty: item.qty,
              deliveryUrgency: order.deliveryUrgency,
              scheduledDateTime: order.scheduledDateTime,
              temperatureRequirements: order.temperatureRequirements,
              hipaaFdaCompliance: order.hipaaFdaCompliance,
              description: order.description,
              status: order.status,
              pickupLocation: order.pickupLocation,
              deliveryLocation: order.deliveryLocation,
              user: user,
              hospitalName: hospitalName,
              facilityName: hospitalName, // Include facilityName for UI compatibility
              assignedDriver: null,
              route: null,
              eta: null,
              createdAt: order.createdAt,
            });

            // Emit to the specific user who created the order
            req.socketService.emitOrderToUser(
              user,
              {
                _id: order._id,
                orderId: order.orderId,
                items: populatedOrder.items?.name || 'N/A',
                qty: item.qty,
                deliveryUrgency: order.deliveryUrgency,
                scheduledDateTime: order.scheduledDateTime,
                temperatureRequirements: order.temperatureRequirements,
                hipaaFdaCompliance: order.hipaaFdaCompliance,
                description: order.description,
                status: order.status,
                pickupLocation: order.pickupLocation,
                deliveryLocation: order.deliveryLocation,
                hospitalName: hospitalName,
                facilityName: hospitalName, // Include facilityName for UI compatibility
                assignedDriver: null,
                route: null,
                eta: null,
                createdAt: order.createdAt,
              },
              'new_order',
            );

            console.log('✅ Socket emissions completed');
          } else {
            console.error('❌ socketService not available in request context');
          }
        } catch (socketError) {
          console.error(
            '⚠️ Error emitting real-time order event:',
            socketError,
          );
          // Don't fail the request if socket emission fails
        }

        // Prepare order data for response
        const orderWithRouteInfo = order.toObject();
        orderWithRouteInfo.routeAssignment = {
          assigned: false,
          processing: true,
          message:
            'Route assignment is being processed asynchronously. You will be notified once completed.',
        };

        createdOrders.push(orderWithRouteInfo);

        // Prepare SQS message for route assignment
        routeAssignmentMessages.push({
          body: {
            type: 'ROUTE_ASSIGNMENT',
            timestamp: new Date().toISOString(),
            orderId: order.orderId,
            orderDbId: order._id,
            userId: user,
            pickupLocation: order.pickupLocation,
            deliveryLocation: order.deliveryLocation,
            items: order.items,
            qty: order.qty,
            deliveryUrgency: order.deliveryUrgency,
            scheduledDateTime: order.scheduledDateTime,
            temperatureRequirements: order.temperatureRequirements,
            hipaaFdaCompliance: order.hipaaFdaCompliance,
            description: order.description,
            hospitalName: hospitalName,
            priority: 'normal',
            retryCount: 0,
          },
          attributes: {
            OrderId: {
              DataType: 'String',
              StringValue: order.orderId,
            },
            UserId: {
              DataType: 'String',
              StringValue: user.toString(),
            },
            MessageType: {
              DataType: 'String',
              StringValue: 'ROUTE_ASSIGNMENT',
            },
            DeliveryUrgency: {
              DataType: 'String',
              StringValue: order.deliveryUrgency,
            },
          },
        });

        // Prepare billing data for SQS
        const billingData = {
          order: order._id,
          hospital: user,
          // courier: "#COU-434346863R",
          invoiceDate: new Date(),
          dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days later
          amount: Number(item.price * item.qty),
          status: 'Unpaid',
        };

        // Prepare SQS message for invoice generation
        invoiceGenerationMessages.push({
          body: {
            type: 'INVOICE_GENERATION',
            timestamp: new Date().toISOString(),
            orderId: order._id,
            hospitalId: user,
            courier: billingData.courier,
            amount: billingData.amount,
            invoiceDate: billingData.invoiceDate,
            dueDate: billingData.dueDate,
            status: billingData.status,
            priority: 'normal',
            retryCount: 0,
          },
          attributes: {
            OrderId: {
              DataType: 'String',
              StringValue: order._id.toString(),
            },
            HospitalId: {
              DataType: 'String',
              StringValue: user.toString(),
            },
            Amount: {
              DataType: 'Number',
              StringValue: billingData.amount.toString(),
            },
            MessageType: {
              DataType: 'String',
              StringValue: 'INVOICE_GENERATION',
            },
          },
        });

        console.log(
          `✅ Order ${order.orderId} created, queued for route assignment and invoice generation`,
        );
      }

      // Send messages to SQS queues asynchronously
      try {
        console.log(
          `📤 Attempting to send ${routeAssignmentMessages.length} route assignment messages and ${invoiceGenerationMessages.length} invoice messages`,
        );

        // Send route assignment messages
        const routeAssignmentPromises = routeAssignmentMessages.map(
          (msg, index) => {
            console.log(
              `📝 Route message ${index + 1} data:`,
              JSON.stringify(msg.body, null, 2),
            );
            return sqsService.sendRouteAssignmentMessage(msg.body);
          },
        );

        // Send invoice generation messages
        const invoiceGenerationPromises = invoiceGenerationMessages.map(
          (msg, index) => {
            console.log(
              `📝 Invoice message ${index + 1} data:`,
              JSON.stringify(msg.body, null, 2),
            );
            return sqsService.sendInvoiceGenerationMessage(msg.body);
          },
        );

        // Execute all SQS operations in parallel
        const [routeResults, invoiceResults] = await Promise.allSettled([
          Promise.allSettled(routeAssignmentPromises),
          Promise.allSettled(invoiceGenerationPromises),
        ]);

        // Log results with proper error handling
        const routeSuccessful =
          routeResults.status === 'fulfilled'
            ? routeResults.value.filter((r) => r.status === 'fulfilled').length
            : 0;
        const routeFailed =
          routeResults.status === 'fulfilled'
            ? routeResults.value.filter((r) => r.status === 'rejected').length
            : routeAssignmentMessages.length;

        const invoiceSuccessful =
          invoiceResults.status === 'fulfilled'
            ? invoiceResults.value.filter((r) => r.status === 'fulfilled')
                .length
            : 0;
        const invoiceFailed =
          invoiceResults.status === 'fulfilled'
            ? invoiceResults.value.filter((r) => r.status === 'rejected').length
            : invoiceGenerationMessages.length;

        console.log(
          `📊 SQS Messages sent - Route Assignment: ${routeSuccessful} successful, ${routeFailed} failed`,
        );
        console.log(
          `📊 SQS Messages sent - Invoice Generation: ${invoiceSuccessful} successful, ${invoiceFailed} failed`,
        );

        // Log detailed errors for debugging
        if (routeFailed > 0 && routeResults.status === 'fulfilled') {
          const failures = routeResults.value.filter(
            (r) => r.status === 'rejected',
          );
          failures.forEach((failure, index) => {
            console.error(
              `❌ Route assignment message ${index + 1} failed:`,
              failure.reason,
            );
          });
        }

        if (invoiceFailed > 0 && invoiceResults.status === 'fulfilled') {
          const failures = invoiceResults.value.filter(
            (r) => r.status === 'rejected',
          );
          failures.forEach((failure, index) => {
            console.error(
              `❌ Invoice generation message ${index + 1} failed:`,
              failure.reason,
            );
          });
        }
      } catch (sqsError) {
        console.error(
          '⚠️ Error sending messages to SQS (orders still created):',
          sqsError,
        );
        // Orders are still created, but async processing might be affected
      }

      res.status(201).json({
        status: true,
        message: 'Orders created successfully and queued for processing',
        orders: createdOrders,
        summary: {
          totalOrders: createdOrders.length,
          processingAsync: true,
          message:
            'Route assignment and invoice generation are being processed in the background',
        },
        processing: {
          routeAssignment: 'queued',
          invoiceGeneration: 'queued',
          estimatedProcessingTime: '1-2 minutes',
        },
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

    const { _id: userId, role } = req.user;
    const isAdmin = role === 'ADMIN';
    const isClient = role === 'CLIENT';
    const isDispatcher = role === 'DISPATCHER';
    const query = isAdmin || isClient || isDispatcher ? {} : { user: userId };

    // const match = {
    //   $or: [
    //     { user: userId },
    //     { 'route.stops.hospitalId': userId }
    //   ]
    // };

    try {
      const orders = await Order.find(query)
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
        deliveryUrgency,
        scheduledDateTime,
        temperatureRequirements,
        hipaaFdaCompliance,
        description,
        pickupLocation,
        deliveryLocation,
        route,
        status,
        eta,
      } = req.body;

      // Get the current order to track status changes
      const currentOrder = await Order.findById(req.params.id);
      if (!currentOrder) {
        return res
          .status(404)
          .json({ status: false, message: 'Order not found' });
      }

      const previousStatus = currentOrder.status;

      const order = await Order.findByIdAndUpdate(
        req.params.id,
        { 
          items, 
          qty, 
          deliveryUrgency,
          scheduledDateTime,
          temperatureRequirements,
          hipaaFdaCompliance,
          description,
          pickupLocation, 
          deliveryLocation, 
          route, 
          status, 
          eta 
        },
        { new: true },
      )
        .populate('user', 'name email role')
        .populate('items', 'name')
        .populate('route', 'routeName');

      if (!order) {
        return res
          .status(404)
          .json({ status: false, message: 'Order not found' });
      }

      // Emit real-time order update event
      try {
        if (req.socketService && status && status !== previousStatus) {
          req.socketService.emitOrderStatusUpdate(order, previousStatus);
        }

        if (req.socketService && route && route !== currentOrder.route) {
          // If route was assigned, emit route assignment event
          const populatedRoute =
            await require('@models/Routes').findById(route);
          if (populatedRoute) {
            req.socketService.emitRouteAssignment(order, populatedRoute);
          }
        }
      } catch (socketError) {
        console.error(
          '⚠️ Error emitting real-time order update event:',
          socketError,
        );
        // Don't fail the request if socket emission fails
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
  returnOrder: async (req, res) => {
    try {
      const order = await Order.findById(req.params.id);
      if (!order) {
        return res
          .status(404)
          .json({ status: false, message: 'Order not found' });
      }

      order.status = 'Returned';
      await order.save();

      res.status(200).json({
        status: true,
        message: 'Order returned successfully',
        data: order,
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
          message: 'Address parameter is required',
        });
      }

      console.log(
        `🔍 Getting route suggestions for address: "${address}" within ${maxDistance}km`,
      );

      const suggestions = await getRouteSuggestions(
        address,
        parseInt(maxDistance),
      );

      res.status(200).json({
        status: true,
        address,
        maxDistance: parseInt(maxDistance),
        suggestionsCount: suggestions.length,
        suggestions: suggestions.map((s) => ({
          routeId: s.route._id,
          routeName: s.route.routeName,
          distance: parseFloat(s.distance.toFixed(2)),
          matchType: s.matchType,
          matchLocation: s.matchDetails.description,
          startLocation: s.route.startLocation,
          endLocation: s.route.endLocation,
          stopsCount: s.route.stops ? s.route.stops.length : 0,
        })),
      });
    } catch (error) {
      console.error('Error getting route suggestions:', error);
      res.status(500).json({ status: false, message: error.message });
    }
  },
  
  addTotesToOrder: async (req, res) => {
    try {
      const { id } = req.params;
      const { totes } = req.body;

      if (!totes || !Array.isArray(totes) || totes.length === 0) {
        return res.status(400).json({
          status: false,
          message: 'Totes array is required and must not be empty',
        });
      }

      for (const tote of totes) {
        if (!tote.toteNumber || !tote.itemCount) {
          return res.status(400).json({
            status: false,
            message: 'Each tote must have toteNumber and itemCount',
          });
        }
        
        if (isNaN(tote.itemCount) || parseInt(tote.itemCount) < 1) {
          return res.status(400).json({
            status: false,
            message: 'Item count must be a positive number',
          });
        }
      }

      const toteNumbers = totes.map(tote => tote.toteNumber);
      const duplicates = toteNumbers.filter((item, index) => toteNumbers.indexOf(item) !== index);
      if (duplicates.length > 0) {
        return res.status(400).json({
          status: false,
          message: `Duplicate tote numbers found: ${duplicates.join(', ')}`,
        });
      }

      const order = await Order.findByIdAndUpdate(
        id,
        { 
          totes: totes.map(tote => ({
            toteNumber: tote.toteNumber.trim(),
            itemCount: parseInt(tote.itemCount)
          }))
        },
        { new: true }
      )
        .populate('user', 'name email role')
        .populate('items', 'name')
        .populate('route', 'routeName');

      if (!order) {
        return res.status(404).json({
          status: false,
          message: 'Order not found',
        });
      }

      try {
        if (req.socketService) {
          const eventData = {
            orderId: order.orderId,
            orderDbId: order._id,
            totes: order.totes,
            totalTotes: order.totes.length,
            totalItems: order.totes.reduce((sum, tote) => sum + tote.itemCount, 0),
            timestamp: new Date().toISOString(),
          };

          await req.socketService.emitToAdmins('order-totes-added', eventData);
          
          console.log(`🔔 Real-time event emitted: Totes added to order ${order.orderId}`);
        }
      } catch (socketError) {
        console.error('⚠️ Error emitting real-time totes update event:', socketError);
      }

      res.status(200).json({
        status: true,
        message: 'Totes added to order successfully',
        data: order,
        summary: {
          totalTotes: order.totes.length,
          totalItems: order.totes.reduce((sum, tote) => sum + tote.itemCount, 0),
          totes: order.totes
        }
      });

    } catch (error) {
      console.error('Error adding totes to order:', error);
      res.status(500).json({ 
        status: false, 
        message: error.message 
      });
    }
  },
  
  getTotesForOrder: async (req, res) => {
    try {
      const { id } = req.params;

      const order = await Order.findById(id)
        .select('orderId totes')
        .lean();

      if (!order) {
        return res.status(404).json({
          status: false,
          message: 'Order not found',
        });
      }

      const summary = {
        orderId: order.orderId,
        totalTotes: order.totes ? order.totes.length : 0,
        totalItems: order.totes ? order.totes.reduce((sum, tote) => sum + tote.itemCount, 0) : 0,
        totes: order.totes || []
      };

      res.status(200).json({
        status: true,
        data: summary
      });

    } catch (error) {
      console.error('Error getting totes for order:', error);
      res.status(500).json({ 
        status: false, 
        message: error.message 
      });
    }
  },
};
