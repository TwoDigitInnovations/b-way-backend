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
        status: 'Active'
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
      const routes = await Routes.find().select('-__v').lean();
      res.status(200).json({ status: true, data: routes });
    } catch (error) {
      res.status(500).json({ status: false, message: error.message });
    }
  },
  updateRoute: async (req, res) => {
    try {
      const { id } = req.params;
      const { name, stops, schedule } = req.body;

      const route = await Routes.findByIdAndUpdate(
        id,
        { name, stops, schedule },
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
};
