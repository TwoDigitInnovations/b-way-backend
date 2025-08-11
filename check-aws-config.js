const { config } = require('dotenv');
const { LocationClient } = require('@aws-sdk/client-location');

// Load environment variables
config();

const checkConfiguration = async () => {
  console.log('🔍 Checking B-Way Route Service Configuration...\n');

  // Check environment variables
  const requiredEnvVars = [
    'AWS_ACCESS_KEY',
    'AWS_SECRET_KEY', 
    'AWS_PLACE_INDEX',
    'AWS_CALCULATOR_NAME'
  ];

  const missingVars = [];
  const presentVars = [];

  requiredEnvVars.forEach(varName => {
    if (process.env[varName]) {
      presentVars.push(varName);
    } else {
      missingVars.push(varName);
    }
  });

  console.log('📋 Environment Variables:');
  presentVars.forEach(varName => {
    const value = process.env[varName];
    const maskedValue = varName.includes('KEY') || varName.includes('SECRET') 
      ? `${value.substring(0, 4)}****${value.substring(value.length - 4)}` 
      : value;
    console.log(`  ✅ ${varName}: ${maskedValue}`);
  });

  if (missingVars.length > 0) {
    console.log('\n❌ Missing Environment Variables:');
    missingVars.forEach(varName => {
      console.log(`  ❌ ${varName}`);
    });
    console.log('\n💡 Please set these variables in your .env file');
    return false;
  }

  // Test AWS connection
  console.log('\n🔗 Testing AWS Connection...');
  
  try {
    const locationClient = new LocationClient({
      region: process.env.AWS_REGION || 'ap-south-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY,
        secretAccessKey: process.env.AWS_SECRET_KEY
      }
    });

    // Test place index
    const { SearchPlaceIndexForTextCommand } = require('@aws-sdk/client-location');
    await locationClient.send(new SearchPlaceIndexForTextCommand({
      IndexName: process.env.AWS_PLACE_INDEX,
      Text: 'Test',
      MaxResults: 1
    }));
    console.log(`  ✅ Place Index (${process.env.AWS_PLACE_INDEX}) is accessible`);

    // Test route calculator
    const { CalculateRouteCommand } = require('@aws-sdk/client-location');
    await locationClient.send(new CalculateRouteCommand({
      CalculatorName: process.env.AWS_CALCULATOR_NAME,
      DeparturePosition: [77.2090, 28.6139], // Delhi
      DestinationPosition: [72.8777, 19.0760]  // Mumbai
    }));
    console.log(`  ✅ Route Calculator (${process.env.AWS_CALCULATOR_NAME}) is accessible`);

    console.log('\n🎉 All AWS Location Service resources are configured correctly!');
    return true;

  } catch (error) {
    console.log(`\n❌ AWS Connection Failed: ${error.message}`);
    
    if (error.name === 'ResourceNotFoundException') {
      console.log('\n💡 This usually means:');
      console.log('  1. The Place Index or Route Calculator doesn\'t exist');
      console.log('  2. They exist in a different AWS region');
      console.log('  3. Your AWS credentials don\'t have permission to access them');
      console.log('\n🔧 Solutions:');
      console.log('  1. Run ./setup-aws-location.sh to create the resources');
      console.log('  2. Check your AWS region settings');
      console.log('  3. Verify your AWS IAM permissions');
    } else if (error.name === 'UnauthorizedOperation' || error.name === 'AccessDenied') {
      console.log('\n💡 This is a permissions issue. Your AWS credentials need:');
      console.log('  - geo:SearchPlaceIndexForText');
      console.log('  - geo:CalculateRoute');
    } else if (error.name === 'CredentialsError') {
      console.log('\n💡 AWS credentials are invalid. Please check:');
      console.log('  - AWS_ACCESS_KEY is correct');
      console.log('  - AWS_SECRET_KEY is correct');
      console.log('  - Credentials are not expired');
    }
    
    return false;
  }
};

// Run the check
if (require.main === module) {
  checkConfiguration().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { checkConfiguration };
