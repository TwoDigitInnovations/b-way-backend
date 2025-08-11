const Routes = require('@models/Routes');
const Driver = require('@models/Drivers');
const {
  processLocationWithCoordinates,
  processStopsWithCoordinates,
  calculateRouteWithWaypoints,
  validateRouteData,
  formatDistance,
  formatDuration,
} = require('@helpers/routeHelpers');
const {
  getCoordinatesWithFallback,
  calculateRouteWithFallback,
  checkAWSConfiguration,
} = require('@helpers/awsLocationFallback');
const {
  SearchPlaceIndexForTextCommand,
  CalculateRouteCommand,
} = require('@aws-sdk/client-location');

checkAWSConfiguration().then((isConfigured) => {
  if (isConfigured) {
    console.log('✅ AWS Location Service is properly configured');
  } else {
    console.log('⚠️  AWS Location Service not configured - using mock data');
    console.log('📖 See AWS_SETUP_GUIDE.md for setup instructions');
  }
});

const getCoordinates = getCoordinatesWithFallback;
const calculateRouteWithStops = calculateRouteWithFallback;

module.exports = {
  createRoute: async (req, res) => {
    try {
      const {
        routeName,
        startLocation,
        endLocation,
        stops = [],
        assignedDriver,
        activeDays,
        eta,
      } = req.body;

      if (!startLocation?.address || !endLocation?.address) {
        return res.status(400).json({
          status: false,
          error: 'Start and end location addresses are required',
        });
      }

      const startCoords = await getCoordinates(startLocation.address);
      const endCoords = await getCoordinates(endLocation.address);

      let processedStops = [];
      let stopCoords = [];

      if (stops && stops.length > 0) {
        for (const stop of stops) {
          if (stop.address || stop.name) {
            try {
              const addressToGeocode = stop.address || stop.name;
              const coords = await getCoordinates(addressToGeocode);
              processedStops.push({
                name: stop.name || stop.address,
                address: stop.address,
                coordinates: coords,
              });
              stopCoords.push(coords);
            } catch (error) {
              console.warn(
                `Failed to geocode stop "${stop.name || stop.address}":`,
                error.message,
              );
            }
          }
        }
      }

      const routeData = await calculateRouteWithStops(
        startCoords,
        endCoords,
        stopCoords,
      );

      const startLocationData = {
        address: startLocation.address,
        city: startLocation.city,
        state: startLocation.state,
        zipcode: startLocation.zipcode,
        coordinates: startCoords,
      };

      const endLocationData = {
        address: endLocation.address,
        city: endLocation.city,
        state: endLocation.state,
        zipcode: endLocation.zipcode,
        coordinates: endCoords,
      };

      const newRoute = await Routes.create({
        routeName:
          routeName || `${startLocation.address} → ${endLocation.address}`,
        startLocation: startLocationData,
        endLocation: endLocationData,
        stops: processedStops,
        geometry: routeData.geometry,
        assignedDriver: assignedDriver || null,
        activeDays: activeDays || [],
        eta: eta || `${Math.round(routeData.duration / 60)} minutes`,
        status: 'Active',
      });

      // Update driver
      if (assignedDriver) {
        const driver = await Driver.findById(assignedDriver);
        if (driver) {
          if (!driver.assignedRoute.includes(newRoute._id)) {
            driver.assignedRoute.push(newRoute._id);
            await driver.save();
          }
        }
      }

      res.status(201).json({
        status: true,
        message: 'Route created successfully',
        route: newRoute,
        routeDetails: {
          distance: `${(routeData.distance / 1000).toFixed(2)} km`,
          duration: `${Math.round(routeData.duration / 60)} minutes`,
          stops: processedStops.length,
        },
      });
    } catch (error) {
      console.error('Route creation error:', error);
      res.status(500).json({
        status: false,
        error: 'Route creation failed',
        message: error.message,
      });
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
          .populate({
            path: 'assignedDriver',
            select: 'licenseNumber vehicleType status driver',
            populate: {
              path: 'driver',
              model: 'User',
              select: 'name email phone',
            },
          })
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
          .populate({
            path: 'assignedDriver',
            select: 'licenseNumber vehicleType status driver',
            populate: {
              path: 'driver',
              model: 'User',
              select: 'name email phone',
            },
          })
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
        data,
        total,
        totalPages,
        page: pageNum,
        limit: limitNum,
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
        endLocation,
        stops = [],
        assignedDriver,
        eta,
        activeDays,
        status,
      } = req.body;

      const oldRoute = await Routes.findById(id);
      if (!oldRoute) {
        return res
          .status(404)
          .json({ status: false, message: 'Route not found' });
      }

      const oldAssignedDriver = oldRoute.assignedDriver?.toString();

      if (
        (startLocation && !startLocation.address) ||
        (endLocation && !endLocation.address)
      ) {
        return res.status(400).json({
          status: false,
          error: 'Start and end location addresses are required',
        });
      }

      const updatedStartLocation = startLocation
        ? {
            ...startLocation,
            coordinates: await getCoordinates(startLocation.address),
          }
        : oldRoute.startLocation;

      const updatedEndLocation = endLocation
        ? {
            ...endLocation,
            coordinates: await getCoordinates(endLocation.address),
          }
        : oldRoute.endLocation;

      let processedStops = oldRoute.stops;
      let stopCoords = [];

      if (stops && stops.length > 0) {
        processedStops = [];
        for (const stop of stops) {
          if (stop.address || stop.name) {
            try {
              const addressToGeocode = stop.address || stop.name;
              const coords = await getCoordinates(addressToGeocode);
              console.log(`Geocoded stop "${stop.name || stop.address}" to coordinates:`, coords);
              processedStops.push({
                name: stop.name || stop.address,
                address: stop.address,
                coordinates: coords,
              });
              stopCoords.push(coords);
            } catch (err) {
              console.warn(
                `Failed to geocode stop "${stop.name || stop.address}":`,
                err.message,
              );
            }
          }
        }
      } else {
        stopCoords = processedStops.map((s) => s.coordinates).filter(Boolean);
      }

      const locationsChanged =
        JSON.stringify(updatedStartLocation.coordinates) !==
          JSON.stringify(oldRoute.startLocation.coordinates) ||
        JSON.stringify(updatedEndLocation.coordinates) !==
          JSON.stringify(oldRoute.endLocation.coordinates) ||
        JSON.stringify(processedStops) !== JSON.stringify(oldRoute.stops);

      let routeGeometry = oldRoute.geometry;
      let routeDetails = null;
      let updatedEta = eta || oldRoute.eta;

      if (locationsChanged) {
        try {
          const routeData = await calculateRouteWithStops(
            updatedStartLocation.coordinates,
            updatedEndLocation.coordinates,
            stopCoords,
          );

          routeGeometry = routeData.geometry;
          routeDetails = {
            distance: `${(routeData.distance / 1000).toFixed(2)} km`,
            duration: `${Math.round(routeData.duration / 60)} minutes`,
            stops: processedStops.length,
          };

          if (!eta) {
            updatedEta = `${Math.round(routeData.duration / 60)} minutes`;
          }
        } catch (err) {
          console.warn('Route geometry recalculation failed:', err.message);
        }
      }

      const updatedRoute = await Routes.findByIdAndUpdate(
        id,
        {
          routeName: routeName || oldRoute.routeName,
          startLocation: updatedStartLocation,
          endLocation: updatedEndLocation,
          stops: processedStops,
          assignedDriver: assignedDriver || null,
          eta: updatedEta,
          activeDays: activeDays || oldRoute.activeDays,
          status: status || oldRoute.status,
          geometry: routeGeometry,
        },
        { new: true },
      );

      if (oldAssignedDriver && oldAssignedDriver !== assignedDriver) {
        const oldDriver = await Driver.findById(oldAssignedDriver);
        if (oldDriver) {
          oldDriver.assignedRoute = oldDriver.assignedRoute.filter(
            (routeId) => routeId.toString() !== updatedRoute._id.toString(),
          );
          await oldDriver.save();
        }
      }

      if (assignedDriver) {
        const newDriver = await Driver.findById(assignedDriver);
        if (!newDriver) {
          return res
            .status(404)
            .json({ status: false, message: 'Assigned driver not found' });
        }

        if (!newDriver.assignedRoute.includes(updatedRoute._id)) {
          newDriver.assignedRoute.push(updatedRoute._id);
          await newDriver.save();
        }
      }

      res.status(200).json({
        status: true,
        message: 'Route updated successfully',
        route: updatedRoute,
        ...(routeDetails && { routeDetails }),
      });
    } catch (error) {
      console.error('Error updating route:', error);
      res.status(500).json({
        status: false,
        message: 'Route update failed',
        error: error.message,
      });
    }
  },
  deleteRoute: async (req, res) => {
    try {
      const { id } = req.params;
      const route = await Routes.findById(id);

      if (!route) {
        return res
          .status(404)
          .json({ status: false, message: 'Route not found' });
      }

      if (route.assignedDriver) {
        const driver = await Driver.findById(route.assignedDriver);
        if (driver) {
          driver.assignedRoute = driver.assignedRoute.filter(
            (routeId) => routeId.toString() !== route._id.toString(),
          );
          await driver.save();
        }
      }

      await Routes.findByIdAndDelete(id);

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
        .populate({
          path: 'assignedDriver',
          select: 'licenseNumber vehicleType status driver',
          populate: {
            path: 'driver',
            model: 'User',
            select: 'name email phone',
          },
        })
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
  getRouteMap: async (req, res) => {
    try {
      const { id } = req.params;
      const route = await Routes.findById(id)
        .populate({
          path: 'assignedDriver',
          select: 'licenseNumber vehicleType driver',
          populate: {
            path: 'driver',
            model: 'User',
            select: 'name email phone',
          },
        })
        .lean();

      if (!route) {
        return res.status(404).json({
          status: false,
          message: 'Route not found',
        });
      }

      const mapData = {
        routeId: route._id,
        routeName: route.routeName,
        startLocation: route.startLocation,
        endLocation: route.endLocation,
        stops: route.stops,
        geometry: route.geometry,
        assignedDriver: route.assignedDriver,
        status: route.status,
        activeDays: route.activeDays,
        eta: route.eta,
      };

      res.status(200).json({
        status: true,
        route: mapData,
      });
    } catch (error) {
      console.error('Error fetching route for map:', error);
      res.status(500).json({
        status: false,
        message: error.message,
      });
    }
  },
};
