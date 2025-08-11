const router = require('express').Router();
const routeController = require('@controllers/routeController');
const Route = require('@models/Routes');
const auth = require('@middlewares/authMiddleware');
const {
  getCoordinatesWithFallback,
  calculateRouteWithFallback,
  checkAWSConfiguration,
} = require('@helpers/awsLocationFallback');
const {
  SearchPlaceIndexForTextCommand,
  CalculateRouteCommand,
} = require('@aws-sdk/client-location');

// Check AWS configuration on startup
checkAWSConfiguration().then((isConfigured) => {
  if (isConfigured) {
    console.log('✅ AWS Location Service is properly configured');
  } else {
    console.log('⚠️  AWS Location Service not configured - using mock data');
    console.log('📖 See AWS_SETUP_GUIDE.md for setup instructions');
  }
});

// Helper function to get coordinates from address with fallback
const getCoordinates = getCoordinatesWithFallback;

// Helper function to calculate route with waypoints and fallback
const calculateRouteWithStops = calculateRouteWithFallback;

router.post('/create', auth(), routeController.createRoute);
router.get('/', auth(), routeController.getRoutes);
router.put('/:id', auth(), routeController.updateRoute);
router.delete('/:id', auth(), routeController.deleteRoute);
router.get('/:id', auth(), routeController.getRouteById);
router.get('/map/:id', auth(), routeController.getRouteMap);

router.put('/recalculate/:id', auth(), async (req, res) => {
  try {
    const { id } = req.params;
    const route = await Route.findById(id);

    if (!route) {
      return res.status(404).json({
        status: false,
        message: 'Route not found',
      });
    }

    const startCoords = route.startLocation.coordinates;
    const endCoords = route.endLocation.coordinates;
    const stopCoords = route.stops.map((stop) => stop.coordinates);

    const routeData = await calculateRouteWithStops(
      startCoords,
      endCoords,
      stopCoords,
    );

    route.geometry = routeData.geometry;
    route.eta = `${Math.round(routeData.duration / 60)} minutes`;
    await route.save();

    res.status(200).json({
      status: true,
      message: 'Route recalculated successfully',
      route,
      routeDetails: {
        distance: `${(routeData.distance / 1000).toFixed(2)} km`,
        duration: `${Math.round(routeData.duration / 60)} minutes`,
        stops: route.stops.length,
      },
    });
  } catch (error) {
    console.error('Error recalculating route:', error);
    res.status(500).json({
      status: false,
      message: error.message,
    });
  }
});

module.exports = router;
