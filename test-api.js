const http = require('http');

// Simple function to make HTTP requests
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve(body);
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

async function testRouteAPI() {
  try {
    console.log('🧪 Testing Route APIs through running server\n');
    
    // Test getting all routes
    console.log('1️⃣ Fetching all routes...');
    const routesResponse = await makeRequest({
      hostname: 'localhost',
      port: 8000,
      path: '/route',
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.log('Routes response:', routesResponse);
    
    if (routesResponse.status && routesResponse.data) {
      console.log(`Found ${routesResponse.data.length} routes:`);
      routesResponse.data.forEach((route, i) => {
        console.log(`  ${i+1}. ${route.routeName} (${route.status})`);
        if (route.startLocation) {
          console.log(`     Start: ${route.startLocation.address || 'No address'}`);
        }
        if (route.endLocation) {
          console.log(`     End: ${route.endLocation.address || 'No address'}`);
        }
      });
    } else {
      console.log('No routes found or error occurred');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testRouteAPI();
