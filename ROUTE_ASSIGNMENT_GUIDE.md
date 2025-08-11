# Automatic Route Assignment System

## Overview

The B-Way logistics platform now includes an intelligent automatic route assignment system that automatically assigns orders to the most suitable routes based on location proximity. When a new order is created, the system analyzes all active routes and assigns the order to the route that best matches the pickup and delivery locations.

## How It Works

### 1. Route Matching Algorithm

When an order is created, the system:

1. **Geocodes Addresses**: Converts pickup and delivery addresses to coordinates using AWS Location Service with OpenStreetMap fallback
2. **Analyzes Active Routes**: Searches all routes with status "Active"
3. **Calculates Distances**: Uses the Haversine formula to calculate distances between order locations and route points (start, end, stops)
4. **Scores Matches**: Assigns a match score (0-100) based on total distance
5. **Auto-Assigns**: Automatically assigns orders with match score ≥ 30

### 2. Distance Calculation

The system calculates the shortest distance from both pickup and delivery locations to any point on each route:
- Route start location
- Route end location  
- All route stops

### 3. Match Scoring

**Score Formula**: `100 - (pickup_distance + delivery_distance)`

**Thresholds**:
- Maximum considered distance: 50km per location
- Minimum assignment score: 30/100
- Orders exceeding distance limits are not assigned

## Configuration

### Distance Thresholds

You can adjust the matching parameters in `/src/helpers/routeMatching.js`:

```javascript
// Maximum distance to consider a route match (default: 50km)
const maxDistance = 50; 

// Minimum match score for assignment (default: 30)
const minScore = 30;
```

### Route Requirements

For automatic assignment to work, routes must have:
- Status: "Active"
- Start location with coordinates
- End location with coordinates  
- Optional: Stops with coordinates

## API Endpoints

### 1. Create Order (Enhanced)
```
POST /order/create
```

**Enhanced Response**:
```json
{
  "status": true,
  "message": "Orders created successfully",
  "orders": [
    {
      "orderId": "ORD-12345",
      "route": "64f7a1b2c3d4e5f6a7b8c9d0",
      "routeAssignment": {
        "assigned": true,
        "routeName": "NYC to Boston Route",
        "matchScore": 85.2,
        "efficiency": 91.5,
        "pickupDistance": 2.3,
        "deliveryDistance": 12.5,
        "message": "Automatically assigned to route \"NYC to Boston Route\" (Match Score: 85.2)"
      }
    }
  ],
  "summary": {
    "totalOrders": 1,
    "assignedOrders": 1,
    "unassignedOrders": 0
  }
}
```

### 2. Route Suggestions
```
GET /order/route-suggestions?address=San Francisco, CA&maxDistance=30
```

**Response**:
```json
{
  "status": true,
  "address": "San Francisco, CA",
  "maxDistance": 30,
  "suggestionsCount": 2,
  "suggestions": [
    {
      "routeId": "64f7a1b2c3d4e5f6a7b8c9d0",
      "routeName": "SF Bay Area Route",
      "distance": 5.2,
      "matchType": "start",
      "matchLocation": "Start: 1 Market St, San Francisco, CA",
      "startLocation": {...},
      "endLocation": {...},
      "stopsCount": 3
    }
  ]
}
```

## Implementation Details

### Files Modified/Added

1. **`/src/helpers/routeMatching.js`** (NEW)
   - Core matching algorithms
   - Distance calculations
   - Route analysis functions

2. **`/src/controllers/orderController.js`** (ENHANCED)
   - Enhanced `createOrder` method with auto-assignment
   - New `getRouteSuggestions` endpoint

3. **`/src/routes/orderRoute.js`** (ENHANCED)
   - Added route suggestions endpoint

### Key Functions

#### `findBestMatchingRoute(pickupAddress, deliveryAddress, maxDistance)`
- Finds the best matching route for given addresses
- Returns route, match score, and detailed analysis

#### `getRouteSuggestions(address, maxDistance)`
- Gets all routes within specified distance of an address
- Useful for manual route selection

#### `calculateDistance(coord1, coord2)`
- Haversine formula implementation for accurate distance calculation
- Returns distance in kilometers

## Logging and Debugging

The system provides detailed console logging:

```
🔍 Finding best route for pickup: "San Francisco, CA" → delivery: "Los Angeles, CA"
📍 Pickup coordinates: [-122.4193286, 37.7792588]
📍 Delivery coordinates: [-118.242766, 34.0536909]
🛣️  Found 3 active routes to analyze
✅ Route "SF-LA Express": score=78.5, pickup=5.2km (Start: 1 Market St), delivery=15.3km (End: Downtown LA)
❌ Route "NYC-Boston": rejected: pickup=4832.1km, delivery=4820.3km (max: 50km)
🎯 Best match: "SF-LA Express" with score 78.5
✅ Order ORD-12345 assigned to route "SF-LA Express" with score 78.5
```

## Usage Examples

### Scenario 1: Perfect Match
- **Pickup**: San Francisco, CA
- **Delivery**: Los Angeles, CA  
- **Available Route**: SF to LA route
- **Result**: High match score (80+), automatic assignment

### Scenario 2: Partial Match
- **Pickup**: Near route start (5km away)
- **Delivery**: Near route stop (15km away)
- **Result**: Medium match score (60+), automatic assignment

### Scenario 3: No Match
- **Pickup**: New York, NY
- **Delivery**: Seattle, WA
- **Available Routes**: Only East Coast routes
- **Result**: No assignment, manual intervention required

## Benefits

1. **Efficiency**: Reduces manual route assignment workload
2. **Accuracy**: Consistent, algorithm-based decisions
3. **Scalability**: Handles multiple orders and routes automatically
4. **Transparency**: Detailed scoring and reasoning for each decision
5. **Flexibility**: Configurable thresholds and parameters

## Monitoring

To monitor the assignment system:

1. Check order creation responses for assignment details
2. Review server logs for matching analysis
3. Use route suggestions endpoint for manual verification
4. Monitor unassigned orders for pattern analysis

## Future Enhancements

1. **Machine Learning**: Learn from successful assignments to improve scoring
2. **Time-Based Matching**: Consider delivery time windows and route schedules
3. **Capacity Management**: Factor in route capacity and current load
4. **Multi-Objective Optimization**: Balance distance, time, and cost factors
5. **Real-Time Updates**: Dynamic reassignment based on traffic and conditions
