const { GetQueueAttributesCommand } = require('@aws-sdk/client-sqs');
const { sqsClient, QUEUE_URLS } = require('./src/config/sqs');

async function checkQueueAttributes() {
  try {
    console.log('🔍 Checking SQS Queue Configuration...');
    console.log('📍 Queue URL:', QUEUE_URLS.INVOICE_GENERATION);
    
    const command = new GetQueueAttributesCommand({
      QueueUrl: QUEUE_URLS.INVOICE_GENERATION,
      AttributeNames: ['All']
    });

    const response = await sqsClient.send(command);
    
    console.log('\n📊 Queue Attributes:');
    console.log('========================');
    
    const attributes = response.Attributes;
    console.log(`Visibility Timeout: ${attributes.VisibilityTimeout}s`);
    console.log(`Message Retention Period: ${attributes.MessageRetentionPeriod}s`);
    console.log(`Delay Seconds: ${attributes.DelaySeconds}s`);
    console.log(`Receive Message Wait Time: ${attributes.ReceiveMessageWaitTimeSeconds}s`);
    console.log(`Approximate Number of Messages: ${attributes.ApproximateNumberOfMessages}`);
    console.log(`Approximate Number of Messages Not Visible: ${attributes.ApproximateNumberOfMessagesNotVisible}`);
    console.log(`Approximate Number of Messages Delayed: ${attributes.ApproximateNumberOfMessagesDelayed}`);
    
    if (attributes.DelaySeconds > 0) {
      console.log(`\n⚠️  DELAY DETECTED: Queue has ${attributes.DelaySeconds}s delivery delay!`);
    }
    
    if (attributes.ApproximateNumberOfMessages > 0) {
      console.log(`\n📬 There are ${attributes.ApproximateNumberOfMessages} messages waiting in the queue`);
    }
    
    if (attributes.ApproximateNumberOfMessagesNotVisible > 0) {
      console.log(`\n👁️  There are ${attributes.ApproximateNumberOfMessagesNotVisible} messages currently not visible (being processed or in timeout)`);
    }

  } catch (error) {
    console.error('❌ Error checking queue attributes:', error);
  }
}

checkQueueAttributes();
