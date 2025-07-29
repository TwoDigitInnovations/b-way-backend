const Driver = require('@models/Drivers');
const User = require('@models/User');

module.exports = {
  createDriver: async (req, res) => {
    try {
      const { name, email, password, phone, licenseNumber, vehicleType } =
        req.body;
      const driver = new Driver({
        licenseNumber,
        vehicleType,
        status: 'Pending',
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
      const drivers = await Driver.find()
        .populate('driver', 'name email phone')
        .select('-__v')
        .lean();

      res.status(200).json({
        status: true,
        message: 'Drivers fetched successfully',
        data: drivers,
      });
    } catch (error) {
      res.status(500).json({ status: false, message: error.message });
    }
  },
  updateDriver: async (req, res) => {
    try {
      const { driverId } = req.params;
      const updates = req.body;

      const driver = await Driver.findByIdAndUpdate(driverId, updates, {
        new: true,
      }).populate('driver', 'name email phone');

      if (!driver) {
        return res.status(404).json({
          status: false,
          message: 'Driver not found',
        });
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

      const driver = await Driver.findByIdAndDelete(driverId);

      if (!driver) {
        return res.status(404).json({
          status: false,
          message: 'Driver not found',
        });
      }

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
  }
};
