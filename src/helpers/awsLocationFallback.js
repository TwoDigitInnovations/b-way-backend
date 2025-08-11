const locationClient = require('../../aws/locationClient');
const {
  SearchPlaceIndexForTextCommand,
  CalculateRouteCommand
} = require('@aws-sdk/client-location');
const axios = require('axios');

// Mock geocoding data for testing (fallback when AWS is not available)
const mockGeocodingData = {
  'delhi': [77.2090, 28.6139],
  'mumbai': [72.8777, 19.0760],
  'bangalore': [77.5946, 12.9716],
  'chennai': [80.2707, 13.0827],
  'kolkata': [88.3639, 22.5726],
  'hyderabad': [78.4867, 17.3850],
  'ahmedabad': [72.5714, 23.0225],
  'pune': [73.8567, 18.5204],
  'surat': [72.8311, 21.1702],
  'jaipur': [75.7873, 26.9124]
};

// Helper function to get mock coordinates (for development/testing)
const getMockCoordinates = (address) => {
  const addressLower = address.toLowerCase();
  for (const [city, coords] of Object.entries(mockGeocodingData)) {
    if (addressLower.includes(city)) {
      // Add some random offset for more realistic results
      const [lng, lat] = coords;
      const offsetLng = lng + (Math.random() - 0.5) * 0.1;
      const offsetLat = lat + (Math.random() - 0.5) * 0.1;
      return [offsetLng, offsetLat];
    }
  }
  // Default to Delhi with random offset if no match found
  const [lng, lat] = mockGeocodingData.delhi;
  return [lng + (Math.random() - 0.5) * 0.2, lat + (Math.random() - 0.5) * 0.2];
};

// Enhanced geocoding function with fallback to OpenStreetMap Nominatim
const getCoordinatesWithFallback = async (address) => {
  try {
    // First, try AWS Location Service
    const command = new SearchPlaceIndexForTextCommand({
      IndexName: process.env.AWS_PLACE_INDEX || "BWayPlaceIndex",
      Text: address,
      MaxResults: 1
    });

    const response = await locationClient.send(command);
    
    if (!response.Results || response.Results.length === 0) {
      throw new Error(`No coordinates found for address: ${address}`);
    }
    
    return response.Results[0].Place.Geometry.Point; // [lng, lat]
  } catch (error) {
    console.warn(`AWS geocoding failed for "${address}": ${error.message}`);
    
    // Fallback to OpenStreetMap Nominatim geocoding
    try {
      console.log(`Trying OpenStreetMap geocoding for: ${address}`);
      const encodedAddress = encodeURIComponent(address);
      const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1`;
      
      const response = await axios.get(nominatimUrl, {
        headers: {
          'User-Agent': 'B-Way-Route-Service/1.0'
        },
        timeout: 10000
      });
      
      if (response.data && response.data.length > 0) {
        const result = response.data[0];
        const coordinates = [parseFloat(result.lon), parseFloat(result.lat)];
        console.log(`✅ OpenStreetMap geocoding successful for "${address}": [${coordinates[0]}, ${coordinates[1]}]`);
        return coordinates; // [lng, lat]
      } else {
        throw new Error('No results from OpenStreetMap');
      }
    } catch (osmError) {
      console.warn(`OpenStreetMap geocoding failed for "${address}": ${osmError.message}`);
      
      // Final fallback to mock data
      console.log('Using mock geocoding data as final fallback...');
      return getMockCoordinates(address);
    }
  }
};

// Enhanced route calculation with OSRM fallback for real road-based routing
const calculateRouteWithFallback = async (startCoords, endCoords, stopCoords = []) => {
  try {
    // First, try AWS Location Service
    const command = new CalculateRouteCommand({
      CalculatorName: process.env.AWS_CALCULATOR_NAME || "BWayRouteCalculator",
      DeparturePosition: startCoords,
      DestinationPosition: endCoords,
      WaypointPositions: stopCoords.length > 0 ? stopCoords : undefined,
      IncludeLegGeometry: true,
      TravelMode: 'Car'
    });

    const response = await locationClient.send(command);
    
    // Combine all leg geometries into a single route
    let fullRouteGeometry = [];
    if (response.Legs && response.Legs.length > 0) {
      response.Legs.forEach(leg => {
        if (leg.Geometry && leg.Geometry.LineString) {
          fullRouteGeometry.push(...leg.Geometry.LineString);
        }
      });
    }

    return {
      geometry: fullRouteGeometry,
      distance: response.Summary?.Distance || 0,
      duration: response.Summary?.DurationSeconds || 0,
      legs: response.Legs || []
    };
  } catch (error) {
    console.warn(`AWS route calculation failed: ${error.message}`);
    
    // Fallback to OSRM (OpenStreetMap Routing Machine) for real road-based routing
    try {
      console.log('Trying OSRM routing for real road-based paths...');
      return await calculateOSRMRoute(startCoords, endCoords, stopCoords);
    } catch (osrmError) {
      console.warn(`OSRM routing failed: ${osrmError.message}`);
      
      // Final fallback to enhanced mock calculation
      console.log('Using enhanced mock route calculation as final fallback...');
      return calculateEnhancedMockRoute(startCoords, endCoords, stopCoords);
    }
  }
};

// Real road-based routing using OSRM
const calculateOSRMRoute = async (startCoords, endCoords, stopCoords = []) => {
  try {
    // Build coordinates string for OSRM
    const allCoords = [startCoords, ...stopCoords, endCoords];
    const coordsString = allCoords.map(coord => `${coord[0]},${coord[1]}`).join(';');
    
    // OSRM API URL for driving route with geometry
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${coordsString}?overview=full&geometries=geojson&steps=true`;
    
    console.log(`🚗 OSRM routing: ${allCoords.length} points`);
    
    const response = await axios.get(osrmUrl, {
      timeout: 15000,
      headers: {
        'User-Agent': 'B-Way-Route-Service/1.0'
      }
    });
    
    if (response.data && response.data.routes && response.data.routes.length > 0) {
      const route = response.data.routes[0];
      
      // Extract geometry from GeoJSON format
      const geometry = route.geometry.coordinates; // OSRM returns [lng, lat] format
      
      console.log(`✅ OSRM routing successful: ${(route.distance / 1000).toFixed(2)} km, ${Math.round(route.duration / 60)} minutes`);
      
      return {
        geometry: geometry,
        distance: route.distance, // meters
        duration: route.duration, // seconds
        legs: route.legs || []
      };
    } else {
      throw new Error('No route found by OSRM');
    }
  } catch (error) {
    console.error('OSRM route calculation error:', error.message);
    throw error;
  }
};

// Enhanced mock route calculation with more realistic curves
const calculateEnhancedMockRoute = (startCoords, endCoords, stopCoords = []) => {
  const allPoints = [startCoords, ...stopCoords, endCoords];
  let geometry = [];
  
  for (let i = 0; i < allPoints.length - 1; i++) {
    const start = allPoints[i];
    const end = allPoints[i + 1];
    
    // Create more realistic route with curves and variations
    const steps = 20; // More steps for smoother curves
    for (let j = 0; j <= steps; j++) {
      const ratio = j / steps;
      
      // Basic interpolation
      let lng = start[0] + (end[0] - start[0]) * ratio;
      let lat = start[1] + (end[1] - start[1]) * ratio;
      
      // Add realistic road-like curves
      const distance = Math.sqrt(Math.pow(end[0] - start[0], 2) + Math.pow(end[1] - start[1], 2));
      const curveIntensity = Math.min(distance * 10, 0.05); // Adjust curve based on distance
      
      // Multiple sine waves for more natural road curves
      const curve1 = Math.sin(ratio * Math.PI * 3) * curveIntensity * 0.3;
      const curve2 = Math.sin(ratio * Math.PI * 7) * curveIntensity * 0.1;
      const curve3 = Math.cos(ratio * Math.PI * 5) * curveIntensity * 0.15;
      
      // Apply curves perpendicular to the main direction
      const angle = Math.atan2(end[1] - start[1], end[0] - start[0]);
      const perpAngle = angle + Math.PI / 2;
      
      const totalCurve = curve1 + curve2 + curve3;
      lng += Math.cos(perpAngle) * totalCurve;
      lat += Math.sin(perpAngle) * totalCurve;
      
      // Add some random variations for more realistic paths
      if (j > 0 && j < steps) {
        lng += (Math.random() - 0.5) * curveIntensity * 0.1;
        lat += (Math.random() - 0.5) * curveIntensity * 0.1;
      }
      
      geometry.push([lng, lat]);
    }
  }
  
  // Calculate distance using haversine formula
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };
  
  // Calculate total distance considering the curved path
  let totalDistance = 0;
  for (let i = 0; i < geometry.length - 1; i++) {
    const [lng1, lat1] = geometry[i];
    const [lng2, lat2] = geometry[i + 1];
    totalDistance += calculateDistance(lat1, lng1, lat2, lng2);
  }
  
  // Estimate duration (assuming average speed of 40 km/h for city routes)
  const avgSpeedKmh = 40;
  const duration = (totalDistance / 1000) * (3600 / avgSpeedKmh);
  
  console.log(`📍 Enhanced mock route: ${(totalDistance / 1000).toFixed(2)} km, ${Math.round(duration / 60)} minutes`);
  
  return {
    geometry,
    distance: totalDistance,
    duration: duration,
    legs: allPoints.slice(0, -1).map((point, index) => {
      const nextPoint = allPoints[index + 1];
      const legDistance = calculateDistance(point[1], point[0], nextPoint[1], nextPoint[0]);
      return {
        Distance: legDistance,
        DurationSeconds: duration / (allPoints.length - 1),
        Geometry: {
          LineString: geometry.slice(
            Math.floor(index * geometry.length / (allPoints.length - 1)), 
            Math.floor((index + 1) * geometry.length / (allPoints.length - 1)) + 1
          )
        }
      };
    })
  };
};

// Simple mock route calculation (kept for backwards compatibility)
const calculateMockRoute = (startCoords, endCoords, stopCoords = []) => {
  return calculateEnhancedMockRoute(startCoords, endCoords, stopCoords);
};

// Check AWS configuration
const checkAWSConfiguration = async () => {
  const config = {
    placeIndex: process.env.AWS_PLACE_INDEX,
    routeCalculator: process.env.AWS_CALCULATOR_NAME,
    accessKey: process.env.AWS_ACCESS_KEY,
    secretKey: process.env.AWS_SECRET_KEY,
    region: process.env.AWS_REGION || 'ap-south-1'
  };
  
  const missing = [];
  if (!config.placeIndex) missing.push('AWS_PLACE_INDEX');
  if (!config.routeCalculator) missing.push('AWS_CALCULATOR_NAME');
  if (!config.accessKey) missing.push('AWS_ACCESS_KEY');
  if (!config.secretKey) missing.push('AWS_SECRET_KEY');
  
  if (missing.length > 0) {
    console.warn(`Missing AWS configuration: ${missing.join(', ')}`);
    console.warn('Route service will use mock data for development.');
    return false;
  }
  
  // Test AWS connection
  try {
    await locationClient.send(new SearchPlaceIndexForTextCommand({
      IndexName: config.placeIndex,
      Text: 'Test Location',
      MaxResults: 1
    }));
    console.log('AWS Location Service configured successfully!');
    return true;
  } catch (error) {
    console.warn('AWS Location Service test failed:', error.message);
    console.warn('Route service will use mock data for development.');
    return false;
  }
};

module.exports = {
  getCoordinatesWithFallback,
  calculateRouteWithFallback,
  checkAWSConfiguration,
  getMockCoordinates,
  calculateMockRoute,
  calculateEnhancedMockRoute,
  calculateOSRMRoute
};
