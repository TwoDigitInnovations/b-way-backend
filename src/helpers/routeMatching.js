const Routes = require('../models/Routes');
const { getCoordinatesWithFallback } = require('./awsLocationFallback');

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {Array} coord1 - [longitude, latitude]
 * @param {Array} coord2 - [longitude, latitude]
 * @returns {number} Distance in kilometers
 */
const calculateDistance = (coord1, coord2) => {
  const R = 6371; // Earth's radius in kilometers
  const [lon1, lat1] = coord1;
  const [lon2, lat2] = coord2;
  
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  
  return distance;
};

/**
 * Calculate the minimum distance from a point to a route (start, stops, or end)
 * @param {Array} pointCoords - [longitude, latitude]
 * @param {Object} route - Route object with startLocation, endLocation, and stops
 * @returns {Object} { distance: number, type: string, details: object }
 */
const calculateDistanceToRoute = (pointCoords, route) => {
  const distances = [];
  
  // Distance to start location
  if (route.startLocation?.coordinates) {
    distances.push({
      distance: calculateDistance(pointCoords, route.startLocation.coordinates),
      type: 'start',
      location: route.startLocation,
      description: `Start: ${route.startLocation.address}`
    });
  }
  
  // Distance to end location
  if (route.endLocation?.coordinates) {
    distances.push({
      distance: calculateDistance(pointCoords, route.endLocation.coordinates),
      type: 'end', 
      location: route.endLocation,
      description: `End: ${route.endLocation.address}`
    });
  }
  
  // Distance to stops
  if (route.stops && route.stops.length > 0) {
    route.stops.forEach((stop, index) => {
      if (stop.coordinates) {
        distances.push({
          distance: calculateDistance(pointCoords, stop.coordinates),
          type: 'stop',
          location: stop,
          description: `Stop ${index + 1}: ${stop.name || stop.address}`,
          stopIndex: index
        });
      }
    });
  }
  
  // Return the closest point
  if (distances.length === 0) {
    return { distance: Infinity, type: 'none', details: null };
  }
  
  const closest = distances.reduce((min, current) => 
    current.distance < min.distance ? current : min
  );
  
  return {
    distance: closest.distance,
    type: closest.type,
    details: closest
  };
};

/**
 * Find the best matching route for pickup and delivery locations
 * @param {string} pickupAddress - Pickup address string
 * @param {string} deliveryAddress - Delivery address string
 * @param {number} maxDistance - Maximum distance in km to consider a route match (default: 50km)
 * @returns {Object} { route: Route|null, matchScore: number, matchDetails: object }
 */
const findBestMatchingRoute = async (pickupAddress, deliveryAddress, maxDistance = 50) => {
  try {
    console.log(`🔍 Finding best route for pickup: "${pickupAddress}" → delivery: "${deliveryAddress}"`);
    
    // Get coordinates for pickup and delivery addresses
    const [pickupCoords, deliveryCoords] = await Promise.all([
      getCoordinatesWithFallback(pickupAddress),
      getCoordinatesWithFallback(deliveryAddress)
    ]);
    
    console.log(`📍 Pickup coordinates: [${pickupCoords[0]}, ${pickupCoords[1]}]`);
    console.log(`📍 Delivery coordinates: [${deliveryCoords[0]}, ${deliveryCoords[1]}]`);
    
    // Get all active routes
    const routes = await Routes.find({ status: 'Active' }).lean();
    
    if (routes.length === 0) {
      console.log('⚠️  No active routes found');
      return { route: null, matchScore: 0, matchDetails: null };
    }
    
    console.log(`🛣️  Found ${routes.length} active routes to analyze`);
    
    let bestMatch = {
      route: null,
      matchScore: 0,
      matchDetails: null
    };
    
    // Analyze each route
    for (const route of routes) {
      const pickupMatch = calculateDistanceToRoute(pickupCoords, route);
      const deliveryMatch = calculateDistanceToRoute(deliveryCoords, route);
      
      // Skip routes where either pickup or delivery is too far
      if (pickupMatch.distance > maxDistance || deliveryMatch.distance > maxDistance) {
        console.log(`❌ Route "${route.routeName}" rejected: pickup=${pickupMatch.distance.toFixed(2)}km, delivery=${deliveryMatch.distance.toFixed(2)}km (max: ${maxDistance}km)`);
        continue;
      }
      
      // Calculate match score (lower total distance = higher score)
      const totalDistance = pickupMatch.distance + deliveryMatch.distance;
      const matchScore = Math.max(0, 100 - totalDistance); // Score from 0-100
      
      const routeAnalysis = {
        routeId: route._id,
        routeName: route.routeName,
        pickupMatch,
        deliveryMatch,
        totalDistance,
        matchScore,
        efficiency: (2 * maxDistance - totalDistance) / (2 * maxDistance) * 100 // Efficiency percentage
      };
      
      console.log(`✅ Route "${route.routeName}": score=${matchScore.toFixed(1)}, pickup=${pickupMatch.distance.toFixed(2)}km (${pickupMatch.details.description}), delivery=${deliveryMatch.distance.toFixed(2)}km (${deliveryMatch.details.description})`);
      
      // Update best match if this route scores higher
      if (matchScore > bestMatch.matchScore) {
        bestMatch = {
          route,
          matchScore,
          matchDetails: routeAnalysis
        };
      }
    }
    
    if (bestMatch.route) {
      console.log(`🎯 Best match: "${bestMatch.route.routeName}" with score ${bestMatch.matchScore.toFixed(1)}`);
    } else {
      console.log('❌ No suitable routes found within distance criteria');
    }
    
    return bestMatch;
    
  } catch (error) {
    console.error('Error finding matching route:', error);
    return { route: null, matchScore: 0, matchDetails: null, error: error.message };
  }
};

/**
 * Get route suggestions for an address (pickup or delivery)
 * @param {string} address - Address to find routes for
 * @param {number} maxDistance - Maximum distance in km (default: 30km)
 * @returns {Array} Array of routes sorted by distance
 */
const getRouteSuggestions = async (address, maxDistance = 30) => {
  try {
    const coords = await getCoordinatesWithFallback(address);
    const routes = await Routes.find({ status: 'Active' }).lean();
    
    const suggestions = routes.map(route => {
      const match = calculateDistanceToRoute(coords, route);
      return {
        route: {
          _id: route._id,
          routeName: route.routeName,
          startLocation: route.startLocation,
          endLocation: route.endLocation,
          stops: route.stops
        },
        distance: match.distance,
        matchType: match.type,
        matchDetails: match.details,
        suitable: match.distance <= maxDistance
      };
    })
    .filter(suggestion => suggestion.suitable)
    .sort((a, b) => a.distance - b.distance);
    
    return suggestions;
    
  } catch (error) {
    console.error('Error getting route suggestions:', error);
    return [];
  }
};

/**
 * Find existing route for delivery location or create new one
 * Also adds hospital as stop if it's not already in the route
 * @param {string} staticPickupAddress - Static pickup address
 * @param {string} deliveryAddress - Delivery address string
 * @param {string} hospitalName - Name/identifier of the hospital
 * @param {string} hospitalAddress - Full address of the hospital
 * @param {number} maxDistance - Maximum distance to consider existing route (default: 20km)
 * @returns {Object} { route: Route, created: boolean, matchScore: number, deliveryDistance: number, stopAdded: boolean }
 */
const findOrCreateRouteForDelivery = async (staticPickupAddress, deliveryAddress, hospitalName, hospitalAddress, maxDistance = 20) => {
  try {
    console.log(`🎯 Finding or creating route for delivery: "${deliveryAddress}" from hospital: "${hospitalName}"`);
    
    // Get coordinates for pickup and delivery addresses
    const [pickupCoords, deliveryCoords, hospitalCoords] = await Promise.all([
      getCoordinatesWithFallback(staticPickupAddress),
      getCoordinatesWithFallback(deliveryAddress),
      getCoordinatesWithFallback(hospitalAddress)
    ]);
    
    console.log(`📍 Static pickup coordinates: [${pickupCoords[0]}, ${pickupCoords[1]}]`);
    console.log(`📍 Delivery coordinates: [${deliveryCoords[0]}, ${deliveryCoords[1]}]`);
    console.log(`🏥 Hospital coordinates: [${hospitalCoords[0]}, ${hospitalCoords[1]}]`);
    
    // First, try to find an existing route that serves this delivery area
    const routes = await Routes.find({ status: 'Active' });
    
    if (routes.length > 0) {
      console.log(`🛣️  Checking ${routes.length} existing routes for delivery area match`);
      
      let bestMatch = null;
      let bestDistance = Infinity;
      
      for (const route of routes) {
        const deliveryMatch = calculateDistanceToRoute(deliveryCoords, route);
        
        if (deliveryMatch.distance <= maxDistance) {
          console.log(`✅ Route "${route.routeName}": delivery distance=${deliveryMatch.distance.toFixed(2)}km (${deliveryMatch.details.description})`);
          
          if (deliveryMatch.distance < bestDistance) {
            bestDistance = deliveryMatch.distance;
            bestMatch = {
              route,
              created: false,
              matchScore: Math.max(0, 100 - deliveryMatch.distance),
              deliveryDistance: deliveryMatch.distance
            };
          }
        } else {
          console.log(`❌ Route "${route.routeName}": delivery distance=${deliveryMatch.distance.toFixed(2)}km (too far, max: ${maxDistance}km)`);
        }
      }
      
      if (bestMatch) {
        console.log(`🎯 Found existing route: "${bestMatch.route.routeName}" (${bestDistance.toFixed(2)}km from delivery)`);
        
        // Check if hospital is already in the route stops
        const hospitalAlreadyExists = bestMatch.route.stops.some(stop => 
          stop.name === hospitalName || 
          (stop.address && stop.address.toLowerCase().includes(hospitalName.toLowerCase()))
        );
        
        if (!hospitalAlreadyExists) {
          console.log(`🏥 Adding hospital "${hospitalName}" as stop to existing route`);
          
          // Add hospital as a stop to the existing route
          bestMatch.route.stops.push({
            name: hospitalName,
            address: hospitalAddress,
            coordinates: hospitalCoords
          });
          
          // Save the updated route
          await bestMatch.route.save();
          
          bestMatch.stopAdded = true;
          bestMatch.message = `Hospital "${hospitalName}" added as stop to existing route "${bestMatch.route.routeName}"`;
          console.log(`✅ Hospital stop added successfully to route "${bestMatch.route.routeName}"`);
        } else {
          console.log(`ℹ️  Hospital "${hospitalName}" already exists in route "${bestMatch.route.routeName}"`);
          bestMatch.stopAdded = false;
          bestMatch.message = `Assigned to existing route "${bestMatch.route.routeName}" (hospital already in stops)`;
        }
        
        return bestMatch;
      }
    }
    
    // No suitable existing route found, create a new one
    console.log(`🆕 No existing route found within ${maxDistance}km. Creating new route...`);
    
    // Parse delivery address components
    const deliveryParts = deliveryAddress.split(',').map(part => part.trim());
    const deliveryCity = deliveryParts.length >= 2 ? deliveryParts[deliveryParts.length - 2] : 'Unknown City';
    const deliveryState = deliveryParts.length >= 1 ? deliveryParts[deliveryParts.length - 1].split(' ')[0] : 'Unknown State';
    
    // Create route name based on delivery location
    const routeName = `Route to ${deliveryCity}, ${deliveryState}`;
    
    // Create new route with hospital as first stop
    const newRouteData = {
      routeName,
      startLocation: {
        address: "160 W Forest Ave",
        city: "Englewood",
        state: "NJ",
        zipcode: "07631",
        coordinates: pickupCoords
      },
      endLocation: {
        address: deliveryAddress,
        city: deliveryCity,
        state: deliveryState,
        zipcode: "00000", // Will be updated when we have more address parsing
        coordinates: deliveryCoords
      },
      stops: [
        {
          name: hospitalName,
          address: hospitalAddress,
          coordinates: hospitalCoords
        }
      ],
      eta: "Auto-Generated",
      activeDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      status: 'Active'
    };
    
    const newRoute = await Routes.create(newRouteData);
    
    console.log(`✅ Created new route: "${newRoute.routeName}" (ID: ${newRoute._id}) with hospital "${hospitalName}" as stop`);
    
    return {
      route: newRoute,
      created: true,
      stopAdded: true,
      matchScore: 100, // Perfect match for new route
      deliveryDistance: 0, // Exact match since route created for this delivery
      message: `New route "${newRoute.routeName}" created with hospital "${hospitalName}" as stop`
    };
    
  } catch (error) {
    console.error('Error finding or creating route:', error);
    return { route: null, created: false, stopAdded: false, matchScore: 0, deliveryDistance: Infinity, error: error.message };
  }
};

module.exports = {
  calculateDistance,
  calculateDistanceToRoute,
  findBestMatchingRoute,
  getRouteSuggestions,
  findOrCreateRouteForDelivery
};
