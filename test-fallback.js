const { getCoordinatesWithFallback, calculateRouteWithFallback } = require('./src/helpers/awsLocationFallback');

// Test the fallback functions directly
const testFallbackFunctions = async () => {
  console.log('🧪 Testing AWS Location Service Fallback Functions\n');

  try {
    // Test geocoding
    console.log('📍 Testing address geocoding...');
    const delhiCoords = await getCoordinatesWithFallback('Delhi, India');
    console.log(`✅ Delhi coordinates: [${delhiCoords[0].toFixed(4)}, ${delhiCoords[1].toFixed(4)}]`);

    const mumbaiCoords = await getCoordinatesWithFallback('Mumbai, India');
    console.log(`✅ Mumbai coordinates: [${mumbaiCoords[0].toFixed(4)}, ${mumbaiCoords[1].toFixed(4)}]`);

    // Test route calculation
    console.log('\n🗺️  Testing route calculation...');
    const routeData = await calculateRouteWithFallback(delhiCoords, mumbaiCoords);
    console.log(`✅ Route calculated successfully:`);
    console.log(`   📏 Distance: ${(routeData.distance / 1000).toFixed(2)} km`);
    console.log(`   ⏱️  Duration: ${Math.round(routeData.duration / 60)} minutes`);
    console.log(`   📍 Geometry points: ${routeData.geometry.length}`);

    // Test with stops
    console.log('\n🛑 Testing route with stops...');
    const jaipurCoords = await getCoordinatesWithFallback('Jaipur, India');
    const routeWithStops = await calculateRouteWithFallback(delhiCoords, mumbaiCoords, [jaipurCoords]);
    console.log(`✅ Route with stops calculated:`);
    console.log(`   📏 Distance: ${(routeWithStops.distance / 1000).toFixed(2)} km`);
    console.log(`   ⏱️  Duration: ${Math.round(routeWithStops.duration / 60)} minutes`);
    console.log(`   🛑 Stops: 1`);

    console.log('\n🎉 All fallback functions working correctly!');
    console.log('\n💡 Your route system will work even without AWS Location Service.');
    console.log('   When AWS is configured, it will use real geocoding and routing.');
    console.log('   Until then, it uses mock data for development.');

    return true;

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return false;
  }
};

// Run the test
if (require.main === module) {
  testFallbackFunctions().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { testFallbackFunctions };
