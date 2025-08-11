const mongoose = require('mongoose');
const Route = require('./src/models/Routes');
const User = require('./src/models/User');

// Connect to MongoDB  
require('./src/config/db');

async function createSampleRouteWithCoordinates() {
  try {
    console.log('🛣️  Creating sample route with coordinates for testing...\n');
    
    // Wait for connection
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Find first available driver
    const driver = await User.findOne({ role: 'DRIVER' });
    if (!driver) {
      console.log('❌ No driver found. Please create a driver user first.');
      return;
    }
    
    // Delete existing test route
    await Route.deleteMany({ routeName: 'Test Auto-Assignment Route' });
    
    // Create a sample route with proper coordinates
    const sampleRoute = new Route({
      routeName: 'Test Auto-Assignment Route',
      startLocation: {
        address: '1 Market St, San Francisco, CA',
        city: 'San Francisco', 
        state: 'CA',
        zipcode: '94105',
        coordinates: [-122.3956, 37.7947] // SF coordinates
      },
      endLocation: {
        address: '1600 Amphitheatre Pkwy, Mountain View, CA',
        city: 'Mountain View',
        state: 'CA', 
        zipcode: '94043',
        coordinates: [-122.0840, 37.4220] // Mountain View coordinates
      },
      stops: [
        {
          name: 'Palo Alto Medical Center',
          coordinates: [-122.1430, 37.4419] // Palo Alto coordinates
        }
      ],
      assignedDriver: driver._id,
      eta: '2:30 PM',
      activeDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      status: 'Active'
    });
    
    await sampleRoute.save();
    
    console.log('✅ Sample route created successfully!');
    console.log(`   Route ID: ${sampleRoute._id}`);
    console.log(`   Route Name: ${sampleRoute.routeName}`);
    console.log(`   Start: ${sampleRoute.startLocation.city}, ${sampleRoute.startLocation.state}`);
    console.log(`   End: ${sampleRoute.endLocation.city}, ${sampleRoute.endLocation.state}`);
    console.log(`   Coordinates: [${sampleRoute.startLocation.coordinates}] → [${sampleRoute.endLocation.coordinates}]`);
    console.log(`   Status: ${sampleRoute.status}`);
    console.log('');
    
    console.log('🎯 Now when you create orders with pickup/delivery in the SF Bay Area,');
    console.log('   they will automatically be assigned to this route!');
    console.log('');
    console.log('📝 Test with these locations:');
    console.log('   • Pickup: "123 Main St, San Francisco, CA 94105"');
    console.log('   • Delivery: "456 Castro St, Mountain View, CA 94041"');
    console.log('   → Should auto-assign to this route');
    
  } catch (error) {
    console.error('❌ Error creating sample route:', error.message);
  }
  
  process.exit(0);
}

// Wait for connection then create route
setTimeout(createSampleRouteWithCoordinates, 1000);
