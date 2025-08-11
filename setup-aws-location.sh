#!/bin/bash

# AWS Location Service Setup Script for B-Way Application
# This script creates the necessary AWS Location Service resources

echo "🚀 Setting up AWS Location Service for B-Way Application..."

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed. Please install it first:"
    echo "   https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html"
    exit 1
fi

# Check if AWS CLI is configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS CLI is not configured. Please run 'aws configure' first."
    exit 1
fi

# Set variables
REGION="ap-south-1"
PLACE_INDEX_NAME="BWayPlaceIndex"
ROUTE_CALCULATOR_NAME="BWayRouteCalculator"
DATA_SOURCE="Esri"

echo "📍 Creating Place Index: $PLACE_INDEX_NAME"

# Create Place Index
aws location create-place-index \
    --index-name "$PLACE_INDEX_NAME" \
    --data-source "$DATA_SOURCE" \
    --region "$REGION" \
    --description "Place index for B-Way route management system" \
    --pricing-plan "RequestBasedUsage"

if [ $? -eq 0 ]; then
    echo "✅ Place Index created successfully!"
else
    echo "⚠️  Place Index creation failed or already exists."
fi

echo "🗺️  Creating Route Calculator: $ROUTE_CALCULATOR_NAME"

# Create Route Calculator
aws location create-route-calculator \
    --calculator-name "$ROUTE_CALCULATOR_NAME" \
    --data-source "$DATA_SOURCE" \
    --region "$REGION" \
    --description "Route calculator for B-Way route management system" \
    --pricing-plan "RequestBasedUsage"

if [ $? -eq 0 ]; then
    echo "✅ Route Calculator created successfully!"
else
    echo "⚠️  Route Calculator creation failed or already exists."
fi

echo ""
echo "🎉 AWS Location Service setup completed!"
echo ""
echo "📋 Add these environment variables to your .env file:"
echo "----------------------------------------"
echo "AWS_PLACE_INDEX=$PLACE_INDEX_NAME"
echo "AWS_CALCULATOR_NAME=$ROUTE_CALCULATOR_NAME"
echo "AWS_REGION=$REGION"
echo "AWS_ACCESS_KEY=your_aws_access_key"
echo "AWS_SECRET_KEY=your_aws_secret_key"
echo "----------------------------------------"
echo ""
echo "💡 Next steps:"
echo "1. Add the environment variables above to your .env file"
echo "2. Make sure your AWS credentials have the required permissions"
echo "3. Restart your application"
echo ""
echo "🔍 To verify the resources were created, run:"
echo "   aws location list-place-indexes --region $REGION"
echo "   aws location list-route-calculators --region $REGION"
