# Hospital Stops Testing Guide

## Quick Test Scenarios

### Test 1: Create Multi-Hospital Route
```javascript
// Create orders from different hospitals to same delivery area

// Order 1: First hospital
POST http://localhost:8001/api/orders
{
  "items": [{
    "hospitalName": "Boston Medical Center",
    "hospitalAddress": "1 Boston Medical Center Pl, Boston, MA",
    "pickupLocation": "1 Boston Medical Center Pl",
    "pickupCity": "Boston",
    "pickupState": "MA",
    "pickupZipcode": "02118",
    "deliveryLocation": "123 Cambridge St",
    "deliveryCity": "Cambridge", 
    "deliveryState": "MA",
    "deliveryZipcode": "02139"
  }]
}

// Order 2: Second hospital to same area
POST http://localhost:8001/api/orders
{
  "items": [{
    "hospitalName": "Massachusetts General Hospital",
    "hospitalAddress": "55 Fruit St, Boston, MA",
    "pickupLocation": "55 Fruit St",
    "pickupCity": "Boston",
    "pickupState": "MA", 
    "pickupZipcode": "02114",
    "deliveryLocation": "456 Harvard Ave",
    "deliveryCity": "Cambridge",
    "deliveryState": "MA", 
    "deliveryZipcode": "02138"
  }]
}
```

**Expected Result:**
- First order creates new route with Boston Medical Center as stop
- Second order adds Massachusetts General Hospital to same route
- Both orders assigned to same route serving Cambridge delivery area

### Test 2: Duplicate Hospital Prevention
```javascript
// Create two orders from same hospital to same delivery area

// Order 1
POST http://localhost:8001/api/orders
{
  "items": [{
    "hospitalName": "Children's Hospital Boston",
    "hospitalAddress": "300 Longwood Ave, Boston, MA",
    "pickupLocation": "300 Longwood Ave",
    "pickupCity": "Boston",
    "pickupState": "MA",
    "pickupZipcode": "02115",
    "deliveryLocation": "789 Beacon St",
    "deliveryCity": "Boston",
    "deliveryState": "MA",
    "deliveryZipcode": "02215"
  }]
}

// Order 2: Same hospital
POST http://localhost:8001/api/orders  
{
  "items": [{
    "hospitalName": "Children's Hospital Boston",
    "hospitalAddress": "300 Longwood Ave, Boston, MA",
    "pickupLocation": "300 Longwood Ave", 
    "pickupCity": "Boston",
    "pickupState": "MA",
    "pickupZipcode": "02115",
    "deliveryLocation": "101 Commonwealth Ave",
    "deliveryCity": "Boston", 
    "deliveryState": "MA",
    "deliveryZipcode": "02116"
  }]
}
```

**Expected Result:**
- First order creates route with Children's Hospital as stop
- Second order uses same route without adding duplicate hospital stop
- `stopAdded: false` in second order response

### Test 3: Case Insensitive Matching
```javascript
// Test different capitalizations of same hospital

// Order 1
POST http://localhost:8001/api/orders
{
  "items": [{
    "hospitalName": "BRIGHAM AND WOMEN'S HOSPITAL",
    "hospitalAddress": "75 Francis St, Boston, MA",
    "deliveryLocation": "200 Stuart St",
    "deliveryCity": "Boston",
    "deliveryState": "MA",
    "deliveryZipcode": "02116"
  }]
}

// Order 2: Different case
POST http://localhost:8001/api/orders
{
  "items": [{
    "hospitalName": "brigham and women's hospital", 
    "hospitalAddress": "75 Francis St, Boston, MA",
    "deliveryLocation": "300 Boylston St",
    "deliveryCity": "Boston",
    "deliveryState": "MA", 
    "deliveryZipcode": "02116"
  }]
}
```

**Expected Result:**
- Second order detects duplicate despite different capitalization
- Hospital not added twice to route

## Verification Steps

### 1. Check Route Structure
```javascript
// Get route details to verify stops
GET http://localhost:8001/api/routes/:routeId

// Look for stops array:
{
  "stops": [
    {
      "name": "Boston Medical Center",
      "address": "1 Boston Medical Center Pl, Boston, MA", 
      "coordinates": [-71.0723, 42.3318]
    },
    {
      "name": "Massachusetts General Hospital",
      "address": "55 Fruit St, Boston, MA",
      "coordinates": [-71.0686, 42.3634]
    }
  ]
}
```

### 2. Verify Order Assignment Response
```javascript
// Check enhanced response format
{
  "status": true,
  "message": "Orders created successfully",
  "orders": [{
    "routeAssignment": {
      "assigned": true,
      "routeName": "Route to Cambridge, MA",
      "created": false,
      "stopAdded": true,
      "hospitalName": "Massachusetts General Hospital",
      "matchScore": 95,
      "deliveryDistance": 3.2,
      "message": "Hospital 'Massachusetts General Hospital' added as stop to existing route 'Route to Cambridge, MA'"
    }
  }]
}
```

### 3. Monitor Server Logs
```bash
# Watch server output for hospital stops logging
tail -f server.log | grep "Hospital"

# Expected log output:
# 🏥 Hospital coordinates: [-71.0686, 42.3634]
# ✅ Route "Route to Cambridge, MA": delivery distance=3.2km
# 🏥 Adding hospital "Massachusetts General Hospital" as stop to existing route
# ✅ Hospital stop added successfully to route "Route to Cambridge, MA"
```

## Database Verification

### Check Routes Collection
```javascript
// Find routes with multiple hospital stops
db.routes.find({ 
  "stops.1": { $exists: true } 
}).pretty()

// Count hospitals per route
db.routes.aggregate([
  { $project: { 
    routeName: 1, 
    hospitalCount: { $size: "$stops" },
    hospitals: "$stops.name"
  }},
  { $sort: { hospitalCount: -1 } }
])
```

### Validate Hospital Data
```javascript
// Check hospital coordinate geocoding
db.routes.find({ 
  "stops.coordinates": { $exists: true } 
}).pretty()

// Find all unique hospitals
db.routes.aggregate([
  { $unwind: "$stops" },
  { $group: { 
    _id: "$stops.name",
    addresses: { $addToSet: "$stops.address" },
    routes: { $addToSet: "$routeName" }
  }}
])
```

## Performance Testing

### Load Test: Multiple Hospitals
```javascript
// Create 10 orders from different hospitals to same delivery area
for (let i = 1; i <= 10; i++) {
  const order = {
    "items": [{
      "hospitalName": `Test Hospital ${i}`,
      "hospitalAddress": `${100 + i} Medical Dr, Boston, MA`,
      "deliveryLocation": "123 Test St",
      "deliveryCity": "Boston",
      "deliveryState": "MA",
      "deliveryZipcode": "02101"
    }]
  };
  
  // POST to /api/orders
}
```

**Expected Result:**
- Single route created with 10 hospital stops
- All orders assigned to same route
- No duplicate hospitals despite sequential creation

### Edge Case Testing

#### Missing Hospital Information
```javascript
POST http://localhost:8001/api/orders
{
  "items": [{
    // No hospitalName or hospitalAddress
    "pickupLocation": "Unknown Medical Facility",
    "pickupCity": "Boston", 
    "pickupState": "MA",
    "deliveryLocation": "123 Main St",
    "deliveryCity": "Boston",
    "deliveryState": "MA"
  }]
}
```

**Expected Result:**
- System generates fallback hospital name
- Order still gets assigned to route
- Stop created with available information

#### Long Hospital Names  
```javascript
POST http://localhost:8001/api/orders
{
  "items": [{
    "hospitalName": "The Very Long Named Massachusetts General Hospital Medical Center for Advanced Care and Research",
    "deliveryLocation": "123 Main St",
    "deliveryCity": "Boston",
    "deliveryState": "MA"
  }]
}
```

**Expected Result:**
- Long names handled gracefully
- No truncation or errors
- Proper duplicate detection

## Success Criteria

✅ **Multi-Hospital Routes**: Routes accumulate multiple hospital stops
✅ **Duplicate Prevention**: Same hospital not added twice to route  
✅ **Case Insensitive**: Different capitalizations treated as same hospital
✅ **Geographic Clustering**: Hospitals added to routes serving same delivery area
✅ **Graceful Fallbacks**: System works even with missing hospital data
✅ **Enhanced Responses**: API provides detailed assignment information
✅ **Database Integrity**: Route stops properly stored with coordinates
✅ **Performance**: Fast route matching even with many existing routes

## Troubleshooting

### Hospital Not Added to Route
- Check delivery area distance threshold (20km default)
- Verify hospital name extraction from order
- Check geocoding success for hospital address
- Review duplicate detection logic

### Duplicate Hospitals Created
- Verify hospital name consistency
- Check case sensitivity handling
- Review address matching logic
- Test with exact same hospital data

### Route Assignment Issues
- Check static pickup location coordinates
- Verify delivery location geocoding
- Review distance calculation logic
- Check route creation fallback

---

Run these tests to validate the hospital stops functionality is working correctly!
