const http = require('http');

// Function to make HTTP requests
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve({ 
            statusCode: res.statusCode, 
            data: JSON.parse(body) 
          });
        } catch (e) {
          resolve({ 
            statusCode: res.statusCode, 
            data: body 
          });
        }
      });
    });
    
    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function demonstrateAutoAssignment() {
  console.log('🎯 Demonstrating Automatic Route Assignment\n');
  
  try {
    // Test the route suggestions endpoint (this doesn't require auth)
    console.log('1️⃣ Testing Route Suggestions for San Francisco:');
    
    const suggestionResponse = await makeRequest({
      hostname: 'localhost',
      port: 8000,
      path: '/order/route-suggestions?address=San Francisco, CA&maxDistance=100',
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.log(`Status: ${suggestionResponse.statusCode}`);
    
    if (suggestionResponse.statusCode === 200) {
      console.log('✅ Route suggestions working!');
      console.log(`Found ${suggestionResponse.data.suggestionsCount || 0} routes near San Francisco`);
      
      if (suggestionResponse.data.suggestions && suggestionResponse.data.suggestions.length > 0) {
        suggestionResponse.data.suggestions.forEach((s, i) => {
          console.log(`  ${i+1}. ${s.routeName} - ${s.distance}km away`);
        });
      }
    } else {
      console.log('❌ Route suggestions failed:', suggestionResponse.data);
    }
    
    console.log('\n📋 How Automatic Route Assignment Works:');
    console.log('');
    console.log('✅ ALREADY IMPLEMENTED in your orderController.js:');
    console.log('   1. When you create an order, the system automatically:');
    console.log('      • Geocodes pickup and delivery addresses');
    console.log('      • Finds all active routes in database');
    console.log('      • Calculates distances using Haversine formula');
    console.log('      • Assigns best matching route (score ≥ 30)');
    console.log('');
    console.log('📍 Distance Calculation:');
    console.log('   • Pickup location → All route points (start/end/stops)');
    console.log('   • Delivery location → All route points (start/end/stops)');
    console.log('   • Total distance score determines best match');
    console.log('');
    console.log('🎯 Assignment Logic:');
    console.log('   • Max distance per location: 50km');
    console.log('   • Minimum assignment score: 30/100');
    console.log('   • Formula: 100 - (pickup_distance + delivery_distance)');
    console.log('');
    console.log('📊 Response includes assignment details:');
    console.log('   {');
    console.log('     "routeAssignment": {');
    console.log('       "assigned": true,');
    console.log('       "routeName": "Route Name",');
    console.log('       "matchScore": 85.2,');
    console.log('       "pickupDistance": 2.3,');
    console.log('       "deliveryDistance": 12.5');
    console.log('     }');
    console.log('   }');
    console.log('');
    console.log('🚀 To Enable Full Functionality:');
    console.log('   1. Create routes with coordinates in start/end locations');
    console.log('   2. Set route status to "Active"');
    console.log('   3. Create orders - they will auto-assign to nearest routes');
    console.log('   4. Check order response for assignment details');
    
  } catch (error) {
    console.error('❌ Demo failed:', error.message);
  }
}

demonstrateAutoAssignment();
