const mongoose = require('mongoose');
const Route = require('./src/models/Routes');
const User = require('./src/models/User');

// Connect to MongoDB
require('./src/config/db');

async function createTestRoutes() {
  try {
    console.log('🚀 Creating test routes for automatic assignment...\n');
    
    // Wait for DB connection
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Find a driver to assign routes to
    const driver = await User.findOne({ role: 'DRIVER' });
    if (!driver) {
      console.log('❌ No driver found. Please create a driver user first.');
      return;
    }
    
    console.log(`📋 Using driver: ${driver.name} (${driver._id})`);

    // Clear existing test routes
    await Route.deleteMany({ routeName: { $regex: /^Test Route/ } });

    // Create test routes with coordinates for better testing
    const testRoutes = [
      {
        routeName: 'Test Route SF-SJ (Bay Area)',
        startLocation: {
          address: '1 Market St, San Francisco, CA',
          city: 'San Francisco',
          state: 'CA',
          zipcode: '94105',
          coordinates: [-122.3938, 37.7947] // San Francisco
        },
        endLocation: {
          address: '1 San Jose Blvd, San Jose, CA',
          city: 'San Jose',
          state: 'CA',
          zipcode: '95113',
          coordinates: [-121.8863, 37.3382] // San Jose
        },
        stops: [
          {
            name: 'Palo Alto Medical Center',
            address: '101 Sand Hill Rd, Palo Alto, CA',
            coordinates: [-122.2016, 37.4419]
          }
        ],
        assignedDriver: driver._id,
        eta: '2:30 PM',
        activeDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        status: 'Active'
      },
      {
        routeName: 'Test Route LA-SD (SoCal)',
        startLocation: {
          address: '100 N Main St, Los Angeles, CA',
          city: 'Los Angeles',
          state: 'CA',
          zipcode: '90012',
          coordinates: [-118.2437, 34.0522] // Los Angeles
        },
        endLocation: {
          address: '500 W Broadway, San Diego, CA',
          city: 'San Diego',
          state: 'CA',
          zipcode: '92101',
          coordinates: [-117.1611, 32.7157] // San Diego
        },
        stops: [
          {
            name: 'Orange County Medical',
            address: '1000 Orange Ave, Anaheim, CA',
            coordinates: [-117.9145, 33.8366]
          }
        ],
        assignedDriver: driver._id,
        eta: '4:00 PM',
        activeDays: ['Mon', 'Wed', 'Fri'],
        status: 'Active'
      },
      {
        routeName: 'Test Route NYC-Philly (East Coast)',
        startLocation: {
          address: '1 Wall St, New York, NY',
          city: 'New York',
          state: 'NY',
          zipcode: '10005',
          coordinates: [-74.0059, 40.7128] // NYC
        },
        endLocation: {
          address: '100 S Broad St, Philadelphia, PA',
          city: 'Philadelphia',
          state: 'PA',
          zipcode: '19110',
          coordinates: [-75.1652, 39.9526] // Philadelphia
        },
        stops: [
          {
            name: 'Newark Medical Center',
            address: '1 Newark St, Newark, NJ',
            coordinates: [-74.1723, 40.7357]
          }
        ],
        assignedDriver: driver._id,
        eta: '3:15 PM',
        activeDays: ['Tue', 'Thu', 'Sat'],
        status: 'Active'
      }
    ];

    const createdRoutes = await Route.create(testRoutes);
    
    console.log(`✅ Created ${createdRoutes.length} test routes:`);
    createdRoutes.forEach((route, i) => {
      const start = route.startLocation;
      const end = route.endLocation;
      console.log(`  ${i+1}. ${route.routeName}`);
      console.log(`     ${start.city}, ${start.state} → ${end.city}, ${end.state}`);
      console.log(`     Coordinates: [${start.coordinates[0]}, ${start.coordinates[1]}] → [${end.coordinates[0]}, ${end.coordinates[1]}]`);
      console.log(`     Status: ${route.status}`);
      console.log('');
    });
    
    console.log('🎯 Routes are ready for automatic assignment testing!');
    console.log('');
    console.log('Test scenarios you can try:');
    console.log('• San Francisco pickup → San Jose delivery (should match SF-SJ route)');
    console.log('• Los Angeles pickup → San Diego delivery (should match LA-SD route)');
    console.log('• New York pickup → Philadelphia delivery (should match NYC-Philly route)');
    console.log('• Seattle pickup → Portland delivery (should find no match)');
    
  } catch (error) {
    console.error('❌ Error creating test routes:', error);
  }
  
  process.exit(0);
}

// Wait a moment for DB connection, then create routes
setTimeout(createTestRoutes, 1000);
