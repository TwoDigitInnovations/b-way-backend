const mongoose = require('mongoose');
const { findBestMatchingRoute, getRouteSuggestions } = require('./src/helpers/routeMatching');

// Mock MongoDB connection for testing
require('./src/config/db');

async function testRouteMatching() {
  try {
    console.log('🧪 Testing Route Matching System\n');
    
    console.log('1️⃣ Testing Route Suggestions for San Francisco:');
    const sfSuggestions = await getRouteSuggestions('San Francisco, CA', 100);
    console.log(`Found ${sfSuggestions.length} routes within 100km of San Francisco`);
    
    if (sfSuggestions.length > 0) {
      console.log('Available routes:');
      sfSuggestions.forEach((s, i) => {
        console.log(`  ${i+1}. ${s.route.routeName} - ${s.distance.toFixed(2)}km away (${s.matchType}: ${s.matchDetails.description})`);
      });
    } else {
      console.log('No routes found near San Francisco');
    }
    
    console.log('\n2️⃣ Testing Best Route Match (SF → LA):');
    const bestMatch = await findBestMatchingRoute(
      'San Francisco, CA 94102', 
      'Los Angeles, CA 90210'
    );
    
    if (bestMatch.route) {
      console.log(`✅ Best match found: "${bestMatch.route.routeName}"`);
      console.log(`   Match Score: ${bestMatch.matchScore.toFixed(1)}/100`);
      console.log(`   Pickup Distance: ${bestMatch.matchDetails.pickupMatch.distance.toFixed(2)}km`);
      console.log(`   Delivery Distance: ${bestMatch.matchDetails.deliveryMatch.distance.toFixed(2)}km`);
      console.log(`   Efficiency: ${bestMatch.matchDetails.efficiency.toFixed(1)}%`);
    } else {
      console.log('❌ No suitable routes found for SF → LA');
    }
    
    console.log('\n3️⃣ Testing Route Suggestions for Los Angeles:');
    const laSuggestions = await getRouteSuggestions('Los Angeles, CA', 100);
    console.log(`Found ${laSuggestions.length} routes within 100km of Los Angeles`);
    
    if (laSuggestions.length > 0) {
      laSuggestions.forEach((s, i) => {
        console.log(`  ${i+1}. ${s.route.routeName} - ${s.distance.toFixed(2)}km away (${s.matchType}: ${s.matchDetails.description})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
  
  process.exit(0);
}

// Wait a moment for DB connection, then run test
setTimeout(testRouteMatching, 2000);
