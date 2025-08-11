const locationClient = require('../../aws/locationClient');
const {
  SearchPlaceIndexForTextCommand,
  CalculateRouteCommand
} = require('@aws-sdk/client-location');

/**
 * Get coordinates from an address using AWS Location Service
 * @param {string} address - The address to geocode
 * @returns {Array} - [longitude, latitude]
 */
const getCoordinatesFromAddress = async (address) => {
  try {
    const command = new SearchPlaceIndexForTextCommand({
      IndexName: process.env.AWS_PLACE_INDEX,
      Text: address,
      MaxResults: 1
    });

    const response = await locationClient.send(command);
    
    if (!response.Results || response.Results.length === 0) {
      throw new Error(`No coordinates found for address: ${address}`);
    }
    
    return response.Results[0].Place.Geometry.Point; // [lng, lat]
  } catch (error) {
    console.error(`Error geocoding address "${address}":`, error);
    throw error;
  }
};

/**
 * Calculate route with waypoints using AWS Location Service
 * @param {Array} startCoords - [longitude, latitude] of start point
 * @param {Array} endCoords - [longitude, latitude] of end point
 * @param {Array} waypoints - Array of [longitude, latitude] waypoints
 * @returns {Object} - Route data with geometry, distance, duration
 */
const calculateRouteWithWaypoints = async (startCoords, endCoords, waypoints = []) => {
  try {
    const command = new CalculateRouteCommand({
      CalculatorName: process.env.AWS_CALCULATOR_NAME,
      DeparturePosition: startCoords,
      DestinationPosition: endCoords,
      WaypointPositions: waypoints.length > 0 ? waypoints : undefined,
      IncludeLegGeometry: true,
      TravelMode: 'Car',
      DepartNow: true
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
      distance: response.Summary?.Distance || 0, // in meters
      duration: response.Summary?.DurationSeconds || 0, // in seconds
      legs: response.Legs || []
    };
  } catch (error) {
    console.error('Error calculating route:', error);
    throw error;
  }
};

/**
 * Process stops array and get coordinates for each stop
 * @param {Array} stops - Array of stop objects
 * @returns {Array} - Processed stops with coordinates
 */
const processStopsWithCoordinates = async (stops) => {
  if (!stops || stops.length === 0) {
    return [];
  }

  const processedStops = [];
  
  for (const stop of stops) {
    let stopData = { ...stop };
    
    // If coordinates are not provided, try to geocode from address or name
    if (!stop.coordinates && (stop.address || stop.name)) {
      try {
        const addressToGeocode = stop.address || stop.name;
        const coords = await getCoordinatesFromAddress(addressToGeocode);
        stopData.coordinates = coords;
      } catch (error) {
        console.warn(`Failed to geocode stop "${stop.name || stop.address}":`, error.message);
        // Continue processing other stops even if one fails
        continue;
      }
    }
    
    if (stopData.coordinates) {
      processedStops.push(stopData);
    }
  }
  
  return processedStops;
};

/**
 * Validate location object and ensure it has coordinates
 * @param {Object} location - Location object with address and/or coordinates
 * @returns {Object} - Processed location with coordinates
 */
const processLocationWithCoordinates = async (location) => {
  if (!location) {
    throw new Error('Location is required');
  }

  let processedLocation = { ...location };

  // If coordinates are not provided, try to geocode from address
  if (!location.coordinates && location.address) {
    try {
      const coords = await getCoordinatesFromAddress(location.address);
      processedLocation.coordinates = coords;
    } catch (error) {
      throw new Error(`Failed to get coordinates for address: ${location.address}. ${error.message}`);
    }
  } else if (!location.coordinates) {
    throw new Error('Location must have either coordinates or address');
  }

  return processedLocation;
};

/**
 * Format route distance for display
 * @param {number} distanceInMeters - Distance in meters
 * @returns {string} - Formatted distance string
 */
const formatDistance = (distanceInMeters) => {
  if (distanceInMeters < 1000) {
    return `${Math.round(distanceInMeters)} m`;
  }
  return `${(distanceInMeters / 1000).toFixed(2)} km`;
};

/**
 * Format route duration for display
 * @param {number} durationInSeconds - Duration in seconds
 * @returns {string} - Formatted duration string
 */
const formatDuration = (durationInSeconds) => {
  const minutes = Math.round(durationInSeconds / 60);
  if (minutes < 60) {
    return `${minutes} minutes`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
};

/**
 * Validate route data before saving
 * @param {Object} routeData - Route data to validate
 * @returns {Object} - Validation result
 */
const validateRouteData = (routeData) => {
  const errors = [];

  if (!routeData.startLocation?.coordinates) {
    errors.push('Start location coordinates are required');
  }

  if (!routeData.endLocation?.coordinates) {
    errors.push('End location coordinates are required');
  }

  if (!routeData.routeName || routeData.routeName.trim() === '') {
    errors.push('Route name is required');
  }

  // Validate coordinates format
  const validateCoords = (coords, name) => {
    if (!Array.isArray(coords) || coords.length !== 2) {
      errors.push(`${name} coordinates must be an array of [longitude, latitude]`);
      return false;
    }
    
    const [lng, lat] = coords;
    if (typeof lng !== 'number' || typeof lat !== 'number') {
      errors.push(`${name} coordinates must be numbers`);
      return false;
    }
    
    if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
      errors.push(`${name} coordinates are out of valid range`);
      return false;
    }
    
    return true;
  };

  if (routeData.startLocation?.coordinates) {
    validateCoords(routeData.startLocation.coordinates, 'Start location');
  }

  if (routeData.endLocation?.coordinates) {
    validateCoords(routeData.endLocation.coordinates, 'End location');
  }

  if (routeData.stops && Array.isArray(routeData.stops)) {
    routeData.stops.forEach((stop, index) => {
      if (stop.coordinates) {
        validateCoords(stop.coordinates, `Stop ${index + 1}`);
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

module.exports = {
  getCoordinatesFromAddress,
  calculateRouteWithWaypoints,
  processStopsWithCoordinates,
  processLocationWithCoordinates,
  formatDistance,
  formatDuration,
  validateRouteData
};
