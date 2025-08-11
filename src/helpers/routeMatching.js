const Routes = require('../models/Routes');
const { getCoordinatesWithFallback, calculateRouteWithFallback } = require('./awsLocationFallback');

const calculateDistance = (coord1, coord2) => {
  const R = 6371; // Earth's radius
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

const calculateDistanceToRoute = (pointCoords, route) => {
  const distances = [];
  
  // start location
  if (route.startLocation?.coordinates) {
    distances.push({
      distance: calculateDistance(pointCoords, route.startLocation.coordinates),
      type: 'start',
      location: route.startLocation,
      description: `Start: ${route.startLocation.address}`
    });
  }
  
  // end location
  if (route.endLocation?.coordinates) {
    distances.push({
      distance: calculateDistance(pointCoords, route.endLocation.coordinates),
      type: 'end', 
      location: route.endLocation,
      description: `End: ${route.endLocation.address}`
    });
  }
  
  // stops
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

const findBestMatchingRoute = async (pickupAddress, deliveryAddress, maxDistance = 50) => {
  try {
    const [pickupCoords, deliveryCoords] = await Promise.all([
      getCoordinatesWithFallback(pickupAddress),
      getCoordinatesWithFallback(deliveryAddress)
    ]);
    
    console.log(`📍 Pickup coordinates: [${pickupCoords[0]}, ${pickupCoords[1]}]`);
    console.log(`📍 Delivery coordinates: [${deliveryCoords[0]}, ${deliveryCoords[1]}]`);
    
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
    
    for (const route of routes) {
      const pickupMatch = calculateDistanceToRoute(pickupCoords, route);
      const deliveryMatch = calculateDistanceToRoute(deliveryCoords, route);
      
      // Skip routes where either pickup or delivery is too far
      if (pickupMatch.distance > maxDistance || deliveryMatch.distance > maxDistance) {
        console.log(`❌ Route "${route.routeName}" rejected: pickup=${pickupMatch.distance.toFixed(2)}km, delivery=${deliveryMatch.distance.toFixed(2)}km (max: ${maxDistance}km)`);
        continue;
      }
      
      const totalDistance = pickupMatch.distance + deliveryMatch.distance;
      const matchScore = Math.max(0, 100 - totalDistance); 
      
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

const findOrCreateRouteForDelivery = async (staticPickupAddress, deliveryAddress, hospitalName, hospitalAddress, maxDistance = 20) => {
  try {
    console.log(`🎯 Finding or creating route for delivery: "${deliveryAddress}" from hospital: "${hospitalName}"`);
    
    const [pickupCoords, deliveryCoords, hospitalCoords] = await Promise.all([
      getCoordinatesWithFallback(staticPickupAddress),
      getCoordinatesWithFallback(deliveryAddress),
      getCoordinatesWithFallback(hospitalAddress)
    ]);
    
    console.log(`📍 Static pickup coordinates: [${pickupCoords[0]}, ${pickupCoords[1]}]`);
    console.log(`📍 Delivery coordinates: [${deliveryCoords[0]}, ${deliveryCoords[1]}]`);
    console.log(`🏥 Hospital coordinates: [${hospitalCoords[0]}, ${hospitalCoords[1]}]`);
    
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
          
          bestMatch.route.stops.push({
            name: hospitalName,
            address: hospitalAddress,
            coordinates: hospitalCoords
          });
          
          try {
            console.log(`🛣️  Recalculating route geometry with new hospital stop`);
            
            const allStopCoords = bestMatch.route.stops.map(stop => stop.coordinates).filter(Boolean);
            
            const routeData = await calculateRouteWithFallback(
              bestMatch.route.startLocation.coordinates,
              bestMatch.route.endLocation.coordinates,
              allStopCoords
            );
            
            bestMatch.route.geometry = routeData.geometry;
            
            console.log(`✅ Route geometry recalculated with ${allStopCoords.length} stops`);
            console.log(`📏 Updated route: ${(routeData.distance / 1000).toFixed(2)}km, ${Math.round(routeData.duration / 60)} minutes`);
            
          } catch (routeError) {
            console.warn(`⚠️  Failed to recalculate route geometry: ${routeError.message}`);
          }
          
          await bestMatch.route.save();
          
          bestMatch.stopAdded = true;
          bestMatch.message = `Hospital "${hospitalName}" added as stop to existing route "${bestMatch.route.routeName}" and route path updated`;
          console.log(`✅ Hospital stop added successfully to route "${bestMatch.route.routeName}" with updated geometry`);
        } else {
          console.log(`ℹ️  Hospital "${hospitalName}" already exists in route "${bestMatch.route.routeName}"`);
          bestMatch.stopAdded = false;
          bestMatch.message = `Assigned to existing route "${bestMatch.route.routeName}" (hospital already in stops)`;
        }
        
        return bestMatch;
      }
    }
    
    console.log(`🆕 No existing route found within ${maxDistance}km. Creating new route...`);
    
    const deliveryParts = deliveryAddress.split(',').map(part => part.trim());
    const deliveryCity = deliveryParts.length >= 2 ? deliveryParts[deliveryParts.length - 2] : 'Unknown City';
    const deliveryState = deliveryParts.length >= 1 ? deliveryParts[deliveryParts.length - 1].split(' ')[0] : 'Unknown State';
    
    const routeName = `Route to ${deliveryCity}, ${deliveryState}`;
    
    let routeGeometry = null;
    let routeDistance = 0;
    let routeDuration = 0;
    
    try {
      console.log(`🛣️  Calculating route geometry for new route with hospital stop`);
      
      const routeData = await calculateRouteWithFallback(
        pickupCoords,
        deliveryCoords,
        [hospitalCoords] 
      );
      
      routeGeometry = routeData.geometry;
      routeDistance = routeData.distance;
      routeDuration = routeData.duration;
      
      console.log(`✅ Route geometry calculated: ${(routeDistance / 1000).toFixed(2)}km, ${Math.round(routeDuration / 60)} minutes`);
      
    } catch (routeError) {
      console.warn(`⚠️  Failed to calculate route geometry: ${routeError.message}`);
    }
    
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
      geometry: routeGeometry, // Include calculated geometry
      eta: routeDuration > 0 ? `${Math.round(routeDuration / 60)} minutes` : "Auto-Generated",
      activeDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      status: 'Active'
    };
    
    const newRoute = await Routes.create(newRouteData);
    
    console.log(`✅ Created new route: "${newRoute.routeName}" (ID: ${newRoute._id}) with hospital "${hospitalName}" as stop and calculated geometry`);
    
    return {
      route: newRoute,
      created: true,
      stopAdded: true,
      matchScore: 100, 
      deliveryDistance: 0, 
      message: `New route "${newRoute.routeName}" created with hospital "${hospitalName}" as stop and optimized path`
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
