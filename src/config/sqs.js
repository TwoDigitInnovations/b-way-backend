const { SQSClient } = require('@aws-sdk/client-sqs');

// Get AWS credentials - support both standard and existing variable names
const getAwsCredentials = () => {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;
  
  if (!accessKeyId || !secretAccessKey) {
    console.warn('⚠️ AWS credentials not found in environment variables');
    console.warn('Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY or AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY');
    return undefined; // Let AWS SDK try other credential sources
  }
  
  return {
    accessKeyId,
    secretAccessKey,
  };
};

// Initialize SQS client
const sqsClient = new SQSClient({
  region: process.env.AWS_REGION || 'ap-south-1',
  credentials: getAwsCredentials(),
});

// SQS Queue URLs
const QUEUE_URLS = {
  ROUTE_ASSIGNMENT: process.env.SQS_ROUTE_ASSIGNMENT_QUEUE_URL || 'https://sqs.ap-south-1.amazonaws.com/187135694045/bway-route-assignment-dev',
  INVOICE_GENERATION: process.env.SQS_INVOICE_GENERATION_QUEUE_URL || 'https://sqs.ap-south-1.amazonaws.com/187135694045/bway-invoice-generation-dev',
};

module.exports = {
  sqsClient,
  QUEUE_URLS,
};
