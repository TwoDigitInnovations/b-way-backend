const locationClient = require("./locationClient");
const { CalculateRouteCommand } = require("@aws-sdk/client-location");

async function calculateRoute(startCoords, endCoords, waypoints = []) {
  try {
    const command = new CalculateRouteCommand({
      CalculatorName: process.env.AWS_CALCULATOR_NAME,
      DeparturePosition: startCoords,
      DestinationPosition: endCoords,
      WaypointPositions: waypoints.length > 0 ? waypoints : undefined,
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
    console.error('Error calculating route:', error);
    throw error;
  }
}

module.exports = calculateRoute;
