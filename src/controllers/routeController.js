const Routes = require('@models/Routes');

module.exports = {
  createRoute: async (req, res) => {
    try {
      const {
        routeName,
        startLocation,
        endLocation,
        stops,
        assignedDriver,
        eta,
        activeDays,
      } = req.body;

      const route = new Routes({
        routeName,
        startLocation,
        endLocation,
        stops,
        assignedDriver,
        eta,
        activeDays,
        status: 'Active',
      });

      await route.save();
      res
        .status(201)
        .json({ status: true, message: 'Route created successfully', route });
    } catch (error) {
      res.status(500).json({ status: false, message: error.message });
    }
  },
  getRoutes: async (req, res) => {
    try {
      const { page = 1, limit = 10 } = req.query;
      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);
      const skip = (pageNum - 1) * limitNum;

      // Fetch all routes (no pagination)
      if (pageNum === 0 && limitNum === 0) {
        const routes = await Routes.find()
          .populate('assignedDriver', 'name email _id')
          .select('-__v')
          .lean();

        const data = routes.map((route, index) => ({
          ...route,
          index: index + 1,
          assignedDriver: route.assignedDriver || {
            name: '',
            email: '',
            _id: null,
          },
        }));

        return res.status(200).json({
          status: true,
          total: routes.length,
          data,
        });
      }

      const [routes, total] = await Promise.all([
        Routes.find()
          .populate('assignedDriver', 'name email _id')
          .select('-__v')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .lean(),
        Routes.countDocuments(),
      ]);

      const data = routes.map((route, index) => ({
        ...route,
        index: skip + index + 1,
        assignedDriver: route.assignedDriver || {
          name: '',
          email: '',
          _id: null,
        },
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
      console.error('Error fetching routes:', error);
      res.status(500).json({
        status: false,
        message: error.message,
      });
    }
  },
  updateRoute: async (req, res) => {
    try {
      const { id } = req.params;
      const {
        routeName,
        startLocation,
        stops,
        assignedDriver,
        eta,
        activeDays,
        status,
      } = req.body;

      const route = await Routes.findByIdAndUpdate(
        id,
        {
          routeName,
          startLocation,
          stops,
          assignedDriver,
          eta,
          activeDays,
          status,
        },
        { new: true },
      );
      if (!route) {
        return res
          .status(404)
          .json({ status: false, message: 'Route not found' });
      }

      res
        .status(200)
        .json({ status: true, message: 'Route updated successfully', route });
    } catch (error) {
      res.status(500).json({ status: false, message: error.message });
    }
  },
  deleteRoute: async (req, res) => {
    try {
      const { id } = req.params;
      const route = await Routes.findByIdAndDelete(id);
      if (!route) {
        return res
          .status(404)
          .json({ status: false, message: 'Route not found' });
      }
      res
        .status(200)
        .json({ status: true, message: 'Route deleted successfully' });
    } catch (error) {
      res.status(500).json({ status: false, message: error.message });
    }
  },
  getRouteById: async (req, res) => {
    try {
      const { id } = req.params;
      const route = await Routes.findById(id)
        .populate('assignedDriver', 'name email _id')
        .select('-__v')
        .lean();

      if (!route) {
        return res
          .status(404)
          .json({ status: false, message: 'Route not found' });
      }

      res.status(200).json({ status: true, route });
    } catch (error) {
      res.status(500).json({ status: false, message: error.message });
    }
  },
};
