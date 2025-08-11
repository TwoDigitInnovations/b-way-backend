const axios = require('axios');

// Test Route Creation API
const testRouteCreation = async () => {
  const baseURL = 'http://localhost:5000'; // Adjust if your server runs on different port
  
  console.log('🧪 Testing Route Creation API...\n');

  // Test data
  const testRoute = {
    routeName: "Test Route - Delhi to Mumbai",
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
      }
    ],
    activeDays: ["Mon", "Wed", "Fri"]
  };

  try {
    console.log('📤 Sending request to create route...');
    
    const response = await axios.post(`${baseURL}/api/routes/create-route`, testRoute, {
      headers: {
        'Content-Type': 'application/json',
        // Add your JWT token here if authentication is required
        // 'Authorization': 'Bearer your_jwt_token_here'
      },
      timeout: 30000 // 30 second timeout
    });

    if (response.data.status) {
      console.log('✅ Route created successfully!');
      console.log('📍 Route Details:');
      console.log(`   📛 Name: ${response.data.route.routeName}`);
      console.log(`   🏁 Start: ${response.data.route.startLocation.address}`);
      console.log(`   🏁 End: ${response.data.route.endLocation.address}`);
      console.log(`   🛑 Stops: ${response.data.route.stops.length}`);
      
      if (response.data.routeDetails) {
        console.log(`   📏 Distance: ${response.data.routeDetails.distance}`);
        console.log(`   ⏱️  Duration: ${response.data.routeDetails.duration}`);
      }
      
      console.log(`   🆔 Route ID: ${response.data.route._id}`);
      
      return response.data.route._id;
    } else {
      console.log('❌ Route creation failed:', response.data.message);
      return null;
    }

  } catch (error) {
    console.log('❌ Error testing route creation:');
    
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Message: ${error.response.data?.message || error.response.data?.error}`);
      
      if (error.response.data?.message?.includes('Place index not found')) {
        console.log('\n💡 This error indicates AWS Location Service is not set up.');
        console.log('   The API should now use mock data for development.');
        console.log('   To fix this permanently:');
        console.log('   1. Run: ./setup-aws-location.sh');
        console.log('   2. Update your .env file with AWS credentials');
        console.log('   3. Restart your server');
      }
    } else if (error.code === 'ECONNREFUSED') {
      console.log('   Make sure your server is running on the correct port');
    } else {
      console.log(`   Error: ${error.message}`);
    }
    
    return null;
  }
};

// Test getting route by ID
const testGetRoute = async (routeId) => {
  if (!routeId) return;
  
  const baseURL = 'http://localhost:5000';
  
  try {
    console.log('\n📤 Testing get route by ID...');
    
    const response = await axios.get(`${baseURL}/api/routes/${routeId}`, {
      headers: {
        // Add your JWT token here if authentication is required
        // 'Authorization': 'Bearer your_jwt_token_here'
      }
    });

    if (response.data.status) {
      console.log('✅ Route retrieved successfully!');
      console.log(`   Geometry points: ${response.data.route.geometry?.length || 0}`);
    }

  } catch (error) {
    console.log('❌ Error getting route:', error.response?.data?.message || error.message);
  }
};

// Run tests
const runTests = async () => {
  console.log('🚀 Starting Route API Tests\n');
  
  const routeId = await testRouteCreation();
  await testGetRoute(routeId);
  
  console.log('\n✨ Tests completed!');
};

// Export for use in other files
module.exports = { testRouteCreation, testGetRoute };

// Run if called directly
if (require.main === module) {
  runTests().catch(console.error);
}
