const turf = require('@turf/turf');

async function matchRoute(hospitalCoords) {
  const routes = await RouteModel.find();

  for (let route of routes) {
    const line = turf.lineString(route.geometry);
    const point = turf.point(hospitalCoords);

    const distance = turf.pointToLineDistance(point, line, {
      units: 'kilometers'
    });

    if (distance <= 3) return route._id;
  }

  return null;
}
