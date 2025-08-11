# Manual AWS Location Service Setup Guide

Since AWS CLI is not installed, you can create the required resources manually through the AWS Console.

## Step 1: Access AWS Location Service Console

1. Go to [AWS Console](https://console.aws.amazon.com/)
2. Sign in with your AWS credentials
3. Search for "Location Service" or "Amazon Location Service"
4. Make sure you're in the **ap-south-1** region (Mumbai)

## Step 2: Create Place Index

1. In the AWS Location Service console, click **"Place indexes"** in the left sidebar
2. Click **"Create place index"**
3. Fill in the details:
   - **Name**: `MyPlaceIndex` (to match your current env variable)
   - **Data provider**: Select **"Esri"** (recommended)
   - **Description**: "Place index for B-Way route management"
   - **Pricing plan**: Select **"Request based"**
4. Click **"Create place index"**

## Step 3: Create Route Calculator

1. In the AWS Location Service console, click **"Route calculators"** in the left sidebar  
2. Click **"Create route calculator"**
3. Fill in the details:
   - **Name**: `MyRouteCalculator` (to match your current env variable)
   - **Data provider**: Select **"Esri"** (recommended)
   - **Description**: "Route calculator for B-Way route management"
   - **Pricing plan**: Select **"Request based"**
4. Click **"Create route calculator"**

## Step 4: Verify IAM Permissions

Make sure your AWS user/role has these permissions:

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
                "arn:aws:geo:ap-south-1:*:place-index/MyPlaceIndex",
                "arn:aws:geo:ap-south-1:*:route-calculator/MyRouteCalculator"
            ]
        }
    ]
}
```

## Step 5: Test Configuration

After creating the resources, run:
```bash
node check-aws-config.js
```

## Alternative: Use Different Names

If you prefer to use the standardized names from our setup script, you can:

1. Create resources with these names instead:
   - Place Index: `BWayPlaceIndex`
   - Route Calculator: `BWayRouteCalculator`

2. Then update your .env file:
   ```env
   AWS_PLACE_INDEX=BWayPlaceIndex
   AWS_CALCULATOR_NAME=BWayRouteCalculator
   ```

## Cost Information

- **Free Tier**: 1,000 requests per month for first 12 months
- **After free tier**: ~$0.50 per 1,000 requests
- **Estimated cost for testing**: Less than $1/month

## Troubleshooting

If you still get errors:

1. **Wrong Region**: Make sure resources are created in `ap-south-1`
2. **Permissions**: Check IAM user permissions
3. **Naming**: Ensure resource names match environment variables exactly
4. **Wait Time**: New resources may take a few minutes to be available

## Test Again

After setup, test your route creation:
```bash
node test-route-api.js
```
