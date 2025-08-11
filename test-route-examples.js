/**
 * Test Route Creation with AWS Location Services
 * 
 * This file contains example API calls to test the enhanced route creation functionality.
 * Make sure to have the following environment variables set:
 * - AWS_ACCESS_KEY
 * - AWS_SECRET_KEY
 * - AWS_PLACE_INDEX
 * - AWS_CALCULATOR_NAME
 */

// Example 1: Create route with addresses only
const createRouteWithAddresses = {
  method: 'POST',
  url: '/api/routes/create-route',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_JWT_TOKEN'
  },
  body: {
    routeName: "Delhi to Mumbai Express",
    startLocation: {
      address: "Connaught Place, New Delhi, India",
      city: "New Delhi",
      state: "Delhi",
      zipcode: "110001"
    },
    endLocation: {
      address: "Gateway of India, Mumbai, India", 
      city: "Mumbai",
      state: "Maharashtra",
      zipcode: "400001"
    },
    stops: [
      {
        name: "Jaipur Stop",
        address: "Hawa Mahal, Jaipur, Rajasthan, India"
      },
      {
        name: "Ahmedabad Stop",
        address: "Sabarmati Ashram, Ahmedabad, Gujarat, India"
      }
    ],
    activeDays: ["Mon", "Wed", "Fri"],
    assignedDriver: null
  }
};

// Example 2: Create route with coordinates
const createRouteWithCoordinates = {
  method: 'POST',
  url: '/api/routes/create-route',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_JWT_TOKEN'
  },
  body: {
    routeName: "Bangalore Tech Route",
    startLocation: {
      address: "Electronic City, Bangalore",
      coordinates: [77.6648, 12.8456], // [longitude, latitude]
      city: "Bangalore",
      state: "Karnataka",
      zipcode: "560100"
    },
    endLocation: {
      address: "Whitefield, Bangalore",
      coordinates: [77.7500, 12.9698],
      city: "Bangalore", 
      state: "Karnataka",
      zipcode: "560066"
    },
    stops: [
      {
        name: "Koramangala Hub",
        coordinates: [77.6269, 12.9279]
      },
      {
        name: "HSR Layout",
        coordinates: [77.6431, 12.9081]
      }
    ],
    activeDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
    eta: "45 minutes"
  }
};

// Example 3: Update existing route
const updateRoute = {
  method: 'PUT',
  url: '/api/routes/ROUTE_ID',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_JWT_TOKEN'
  },
  body: {
    routeName: "Updated Route Name",
    stops: [
      {
        name: "New Stop 1",
        address: "New Location 1"
      },
      {
        name: "New Stop 2", 
        coordinates: [77.1234, 12.5678]
      }
    ],
    activeDays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    status: "Active"
  }
};

// Example 4: Get route for map display
const getRouteForMap = {
  method: 'GET',
  url: '/api/routes/map/ROUTE_ID',
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN'
  }
};

// Example 5: Recalculate route geometry
const recalculateRoute = {
  method: 'PUT',
  url: '/api/routes/recalculate/ROUTE_ID',
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN'
  }
};

// Example 6: Using the standard create route endpoint
const createRouteStandard = {
  method: 'POST',
  url: '/api/routes/create',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_JWT_TOKEN'
  },
  body: {
    routeName: "Standard Route",
    startLocation: {
      address: "Start Address",
      coordinates: [77.1234, 12.5678],
      city: "City",
      state: "State",
      zipcode: "123456"
    },
    endLocation: {
      address: "End Address", 
      coordinates: [77.9876, 12.3456],
      city: "City",
      state: "State",
      zipcode: "654321"
    },
    stops: [],
    activeDays: ["Mon", "Wed", "Fri"],
    eta: "30 minutes"
  }
};

module.exports = {
  createRouteWithAddresses,
  createRouteWithCoordinates,
  updateRoute,
  getRouteForMap,
  recalculateRoute,
  createRouteStandard
};

/**
 * Usage Instructions:
 * 
 * 1. Set up your AWS credentials and make sure the Location Service resources are created
 * 2. Replace YOUR_JWT_TOKEN with a valid authentication token
 * 3. Replace ROUTE_ID with an actual route ID when testing update/get endpoints
 * 4. Test the endpoints using Postman, curl, or your frontend application
 * 
 * Expected Response Format:
 * {
 *   "status": true,
 *   "message": "Route created successfully",
 *   "route": { ... route object ... },
 *   "routeDetails": {
 *     "distance": "1,234.56 km",
 *     "duration": "14h 30m", 
 *     "distanceMeters": 1234560,
 *     "durationSeconds": 52200
 *   }
 * }
 */
