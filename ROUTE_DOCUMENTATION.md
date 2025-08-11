# Enhanced Route Management with AWS Location Services

This documentation covers the enhanced route management system that integrates with AWS Location Services to provide accurate route planning, geocoding, and navigation capabilities.

## Features

- **Address Geocoding**: Convert addresses to coordinates using AWS Location Service
- **Route Calculation**: Calculate optimal routes with waypoints/stops
- **Multiple Stop Support**: Add intermediate stops to routes
- **Automatic Geometry Generation**: Generate route geometry for map display
- **Distance & Duration Calculation**: Get accurate travel time and distance
- **Driver Assignment**: Assign drivers to routes with automatic relationship management
- **Route Validation**: Comprehensive validation of route data

## API Endpoints

### 1. Create Route with Enhanced Features
```
POST /api/routes/create-route
```

**Request Body:**
```json
{
  "routeName": "Route Name",
  "startLocation": {
    "address": "Start Address",
    "city": "City",
    "state": "State", 
    "zipcode": "123456",
    "coordinates": [longitude, latitude] // Optional if address provided
  },
  "endLocation": {
    "address": "End Address",
    "city": "City",
    "state": "State",
    "zipcode": "654321",
    "coordinates": [longitude, latitude] // Optional if address provided
  },
  "stops": [
    {
      "name": "Stop Name",
      "address": "Stop Address", // Optional if coordinates provided
      "coordinates": [longitude, latitude] // Optional if address provided
    }
  ],
  "assignedDriver": "driver_id", // Optional
  "activeDays": ["Mon", "Wed", "Fri"], // Optional
  "eta": "30 minutes" // Optional - will be calculated if not provided
}
```

**Response:**
```json
{
  "status": true,
  "message": "Route created successfully",
  "route": {
    "_id": "route_id",
    "routeName": "Route Name",
    "startLocation": {
      "address": "Start Address",
      "coordinates": [longitude, latitude],
      "city": "City",
      "state": "State",
      "zipcode": "123456"
    },
    "endLocation": {
      "address": "End Address", 
      "coordinates": [longitude, latitude],
      "city": "City",
      "state": "State",
      "zipcode": "654321"
    },
    "stops": [...],
    "geometry": [[lon, lat], [lon, lat], ...], // Route geometry for map display
    "assignedDriver": "driver_id",
    "activeDays": ["Mon", "Wed", "Fri"],
    "eta": "30 minutes",
    "status": "Active",
    "createdAt": "...",
    "updatedAt": "..."
  },
  "routeDetails": {
    "distance": "25.5 km",
    "duration": "30 minutes",
    "distanceMeters": 25500,
    "durationSeconds": 1800
  }
}
```

### 2. Get Route for Map Display
```
GET /api/routes/map/:id
```

Returns route data optimized for map display including geometry coordinates.

### 3. Recalculate Route Geometry
```
PUT /api/routes/recalculate/:id
```

Recalculates the route geometry and updates distance/duration based on current locations and stops.

### 4. Standard CRUD Operations

All existing route CRUD operations (`/api/routes/`) have been enhanced to support:
- Automatic coordinate geocoding when addresses are provided
- Route geometry calculation
- Enhanced validation
- Better error handling

## Environment Variables Required

```env
AWS_ACCESS_KEY=your_aws_access_key
AWS_SECRET_KEY=your_aws_secret_key
AWS_PLACE_INDEX=your_place_index_name
AWS_CALCULATOR_NAME=your_route_calculator_name
```

## AWS Location Service Setup

1. **Create Place Index**: For address geocoding
2. **Create Route Calculator**: For route calculation
3. **Set up IAM permissions**: Ensure your AWS credentials have access to:
   - `geo:SearchPlaceIndexForText`
   - `geo:CalculateRoute`

## Data Models

### Route Schema
```javascript
{
  routeName: String,
  startLocation: {
    address: String,
    city: String,
    state: String,
    zipcode: String,
    coordinates: [Number] // [longitude, latitude]
  },
  endLocation: {
    address: String,
    city: String, 
    state: String,
    zipcode: String,
    coordinates: [Number] // [longitude, latitude]
  },
  stops: [{
    name: String,
    address: String,
    coordinates: [Number] // [longitude, latitude]
  }],
  assignedDriver: ObjectId,
  eta: String,
  activeDays: [String],
  status: String,
  geometry: [[Number]], // Array of [longitude, latitude] coordinates
  timestamps: true
}
```

## Helper Functions

### Route Helpers (`src/helpers/routeHelpers.js`)

- `getCoordinatesFromAddress(address)`: Geocode address to coordinates
- `calculateRouteWithWaypoints(start, end, waypoints)`: Calculate route with stops
- `processStopsWithCoordinates(stops)`: Process and validate stops
- `processLocationWithCoordinates(location)`: Process and validate location
- `validateRouteData(routeData)`: Comprehensive route validation
- `formatDistance(meters)`: Format distance for display
- `formatDuration(seconds)`: Format duration for display

## Error Handling

The system includes comprehensive error handling for:
- Invalid addresses that cannot be geocoded
- AWS service errors
- Network connectivity issues
- Invalid coordinate formats
- Missing required fields

## Best Practices

1. **Provide either coordinates OR address** for each location
2. **Include city, state, zipcode** for better geocoding accuracy
3. **Handle geocoding failures gracefully** - some addresses may not be found
4. **Cache route geometry** to avoid recalculating unnecessarily
5. **Use meaningful route names** for better organization
6. **Validate coordinates** are within expected geographic bounds

## Frontend Integration

When displaying routes on maps, use the `geometry` field which contains an array of `[longitude, latitude]` coordinates that can be used with mapping libraries like:
- Google Maps
- Mapbox
- Leaflet
- AWS Location Service Maps

## Testing

Use the examples in `test-route-examples.js` to test the API endpoints. Make sure to:
1. Set up AWS credentials
2. Replace placeholder values (JWT tokens, route IDs)
3. Test with real addresses in your region
4. Verify route geometry displays correctly on maps

## Troubleshooting

### Common Issues:

1. **Geocoding fails**: Check address format and AWS Place Index configuration
2. **Route calculation fails**: Verify AWS Route Calculator settings and permissions
3. **Invalid coordinates**: Ensure coordinates are in [longitude, latitude] format
4. **Missing geometry**: Check AWS service connectivity and error logs

### Debug Mode:
Enable detailed logging by setting environment variable:
```env
DEBUG_ROUTES=true
```
