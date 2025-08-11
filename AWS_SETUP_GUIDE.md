# AWS Location Service Setup Guide

## Issue: "Place index not found: MyPlaceIndex"

This error occurs because the AWS Place Index specified in your environment variables doesn't exist or isn't properly configured.

## Solution Options

### Option 1: Create AWS Location Service Resources (Recommended)

#### Step 1: Create Place Index
```bash
# Using AWS CLI
aws location create-place-index \
    --index-name "BWayPlaceIndex" \
    --data-source "Esri" \
    --region ap-south-1

# Or using AWS Console:
# 1. Go to AWS Location Service Console
# 2. Click "Place indexes"
# 3. Click "Create place index"
# 4. Name: BWayPlaceIndex
# 5. Data provider: Esri (recommended)
# 6. Click "Create place index"
```

#### Step 2: Create Route Calculator
```bash
# Using AWS CLI
aws location create-route-calculator \
    --calculator-name "BWayRouteCalculator" \
    --data-source "Esri" \
    --region ap-south-1

# Or using AWS Console:
# 1. Go to AWS Location Service Console
# 2. Click "Route calculators"
# 3. Click "Create route calculator"
# 4. Name: BWayRouteCalculator
# 5. Data provider: Esri (recommended)
# 6. Click "Create route calculator"
```

#### Step 3: Update Environment Variables
```env
# In your .env file
AWS_ACCESS_KEY=your_aws_access_key
AWS_SECRET_KEY=your_aws_secret_key
AWS_PLACE_INDEX=BWayPlaceIndex
AWS_CALCULATOR_NAME=BWayRouteCalculator
AWS_REGION=ap-south-1
```

### Option 2: Fallback to Mock/Test Data (For Development)

If you don't want to set up AWS Location Services immediately, you can use a fallback system.

### Option 3: Use Different Geocoding Service

Switch to a different geocoding service like Google Maps, OpenStreetMap Nominatim, etc.

## IAM Permissions Required

Your AWS user/role needs these permissions:
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "geo:SearchPlaceIndexForText",
                "geo:CalculateRoute"
            ],
            "Resource": [
                "arn:aws:geo:ap-south-1:YOUR_ACCOUNT_ID:place-index/BWayPlaceIndex",
                "arn:aws:geo:ap-south-1:YOUR_ACCOUNT_ID:route-calculator/BWayRouteCalculator"
            ]
        }
    ]
}
```

## Cost Considerations

- **Place Index**: ~$0.50 per 1,000 geocoding requests
- **Route Calculator**: ~$0.50 per 1,000 route calculations
- **Free Tier**: 1,000 requests per month for first 12 months

## Alternative Data Providers

AWS Location Service supports multiple data providers:
- **Esri** (recommended for most use cases)
- **HERE** (good for logistics)
- **Grab** (for Southeast Asia)

Choose based on your geographic coverage needs.
