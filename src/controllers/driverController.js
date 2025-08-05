const Driver = require('@models/Drivers');
const User = require('@models/User');
const Route = require('@models/Routes');
const Order = require('@models/Orders');

module.exports = {
  createDriver: async (req, res) => {
    try {
      const {
        name,
        email,
        password,
        phone,
        licenseNumber,
        vehicleType,
        assignedRoute,
        status,
      } = req.body;

      const driver = new Driver({
        licenseNumber,
        vehicleType,
        assignedRoute: assignedRoute || [],
        status: status || 'Pending',
      });

      const user = new User({
        name,
        email,
        password,
        phone,
        role: 'DRIVER',
      });

      driver.driver = user._id;
      await driver.save();
      await user.save();

      // Update routes to assign this driver
      if (assignedRoute && assignedRoute.length > 0) {
        await Route.updateMany(
          { _id: { $in: assignedRoute } },
          { assignedDriver: driver._id },
        );
      }

      res.status(201).json({
        status: true,
        message: 'Driver created successfully',
        data: { driver, user },
      });
    } catch (error) {
      res.status(500).json({ status: false, message: error.message });
    }
  },
  getDrivers: async (req, res) => {
    try {
      const { page = 1, limit = 10 } = req.query;
      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);
      const skip = (pageNum - 1) * limitNum;

      const [drivers, total] = await Promise.all([
        Driver.find()
          .populate('driver', 'name email phone')
          .populate('assignedRoute', 'routeName startLocation endLocation')
          .sort({ createdAt: -1 })
          .select('-__v')
          .skip(skip)
          .limit(limitNum)
          .lean(),
        Driver.countDocuments(),
      ]);

      const data = drivers.map((driver, index) => ({
        ...driver,
        index: skip + index + 1,
      }));

      const totalPages = Math.ceil(total / limitNum);

      res.status(200).json({
        status: true,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages,
        data,
      });
    } catch (error) {
      res.status(500).json({ status: false, message: error.message });
    }
  },
  updateDriver: async (req, res) => {
    try {
      const { driverId } = req.params;
      const updates = req.body;

      // Get the current driver to compare route changes
      const currentDriver = await Driver.findById(driverId);
      if (!currentDriver) {
        return res.status(404).json({
          status: false,
          message: 'Driver not found',
        });
      }

      const driver = await Driver.findByIdAndUpdate(driverId, updates, {
        new: true,
      }).populate('driver', 'name email phone');

      // Handle route assignments if provided
      if (updates.assignedRoute !== undefined) {
        const newRoutes = updates.assignedRoute || [];
        const oldRoutes = currentDriver.assignedRoute || [];

        // Remove driver from old routes that are no longer assigned
        const routesToRemove = oldRoutes.filter(
          (route) => !newRoutes.includes(route.toString()),
        );
        if (routesToRemove.length > 0) {
          await Route.updateMany(
            { _id: { $in: routesToRemove } },
            { $unset: { assignedDriver: 1 } },
          );
        }

        // Assign driver to new routes
        const routesToAdd = newRoutes.filter(
          (route) => !oldRoutes.map((r) => r.toString()).includes(route),
        );
        if (routesToAdd.length > 0) {
          await Route.updateMany(
            { _id: { $in: routesToAdd } },
            { assignedDriver: driverId },
          );
        }
      }

      res.status(200).json({
        status: true,
        message: 'Driver updated successfully',
        data: driver,
      });
    } catch (error) {
      res.status(500).json({ status: false, message: error.message });
    }
  },
  deleteDriver: async (req, res) => {
    try {
      const { driverId } = req.params;

      const driver = await Driver.findById(driverId);

      if (!driver) {
        return res.status(404).json({
          status: false,
          message: 'Driver not found',
        });
      }

      // Remove driver from all assigned routes
      if (driver.assignedRoute && driver.assignedRoute.length > 0) {
        await Route.updateMany(
          { _id: { $in: driver.assignedRoute } },
          { $unset: { assignedDriver: 1 } },
        );
      }

      // Delete the driver
      await Driver.findByIdAndDelete(driverId);

      res.status(200).json({
        status: true,
        message: 'Driver deleted successfully',
      });
    } catch (error) {
      res.status(500).json({ status: false, message: error.message });
    }
  },
  getDriverById: async (req, res) => {
    try {
      const { driverId } = req.params;

      const driver = await Driver.findById(driverId)
        .populate('driver', 'name email phone')
        .populate('assignedRoute', 'routeName startLocation endLocation')
        .select('-__v');

      if (!driver) {
        return res.status(404).json({
          status: false,
          message: 'Driver not found',
        });
      }

      res.status(200).json({
        status: true,
        message: 'Driver fetched successfully',
        data: driver,
      });
    } catch (error) {
      res.status(500).json({ status: false, message: error.message });
    }
  },
  // Orders related apis
  getDriverRoutes: async (req, res) => {
    try {
      const { driverId } = req.params;

      const driver = await Driver.findById(driverId)
        .populate(
          'assignedRoute',
          'routeName startLocation endLocation stops eta activeDays status',
        )
        .select('assignedRoute');

      if (!driver) {
        return res.status(404).json({
          status: false,
          message: 'Driver not found',
        });
      }

      if (!driver.assignedRoute || driver.assignedRoute.length === 0) {
        return res.status(404).json({
          status: false,
          message: 'No routes found for this driver',
        });
      }

      res.status(200).json({
        status: true,
        message: 'Routes fetched successfully',
        data: driver.assignedRoute,
      });
    } catch (error) {
      res.status(500).json({ status: false, message: error.message });
    }
  },

  assignRouteToDriver: async (req, res) => {
    try {
      const { driverId } = req.params;
      const { routeId } = req.body;

      const driver = await Driver.findById(driverId);
      const route = await Route.findById(routeId);

      if (!driver) {
        return res.status(404).json({
          status: false,
          message: 'Driver not found',
        });
      }

      if (!route) {
        return res.status(404).json({
          status: false,
          message: 'Route not found',
        });
      }

      if (driver.assignedRoute.includes(routeId)) {
        return res.status(400).json({
          status: false,
          message: 'Route already assigned to this driver',
        });
      }

      driver.assignedRoute.push(routeId);
      await driver.save();

      route.assignedDriver = driverId;
      await route.save();

      res.status(200).json({
        status: true,
        message: 'Route assigned to driver successfully',
      });
    } catch (error) {
      res.status(500).json({ status: false, message: error.message });
    }
  },

  unassignRouteFromDriver: async (req, res) => {
    try {
      const { driverId } = req.params;
      const { routeId } = req.body;

      const driver = await Driver.findById(driverId);
      const route = await Route.findById(routeId);

      if (!driver) {
        return res.status(404).json({
          status: false,
          message: 'Driver not found',
        });
      }

      if (!route) {
        return res.status(404).json({
          status: false,
          message: 'Route not found',
        });
      }

      driver.assignedRoute = driver.assignedRoute.filter(
        (id) => id.toString() !== routeId,
      );
      await driver.save();

      route.assignedDriver = null;
      await route.save();

      res.status(200).json({
        status: true,
        message: 'Route unassigned from driver successfully',
      });
    } catch (error) {
      res.status(500).json({ status: false, message: error.message });
    }
  },

  getDriverOrders: async (req, res) => {
    try {
      const { driverId } = req.params;

      const routes = await Route.find({ assignedDriver: driverId }).select(
        '_id',
      );
      const routeIds = routes.map((r) => r._id);

      const orders = await Order.find({ route: { $in: routeIds } })
        .populate('items', 'name price')
        .populate('route', 'routeName')
        .select('-__v')
        .sort({ createdAt: -1 });

      if (!orders.length) {
        return res.status(404).json({
          status: false,
          message: 'No orders found for this driver',
        });
      }

      res.status(200).json({
        status: true,
        message: 'Orders fetched successfully',
        data: orders,
      });
    } catch (error) {
      res.status(500).json({ status: false, message: error.message });
    }
  },

  markOrderAsDelivered: async (req, res) => {
    try {
      const { orderId } = req.params;

      const order = await Order.findById(orderId);
      if (!order) {
        return res.status(404).json({
          status: false,
          message: 'Order not found',
        });
      }

      order.status = 'Delivered';
      await order.save();

      res.status(200).json({
        status: true,
        message: 'Order marked as delivered successfully',
      });
    } catch (error) {
      res.status(500).json({ status: false, message: error.message });
    }
  },

  markOrderAsPicked: async (req, res) => {
    try {
      const { orderId } = req.params;

      const order = await Order.findById(orderId);
      if (!order) {
        return res.status(404).json({
          status: false,
          message: 'Order not found',
        });
      }

      order.status = 'Picked Up';
      await order.save();

      res.status(200).json({
        status: true,
        message: 'Order marked as picked up successfully',
      });
    } catch (error) {
      res.status(500).json({ status: false, message: error.message });
    }
  },
}
