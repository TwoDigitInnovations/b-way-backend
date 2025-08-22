const {
  ReceiveMessageCommand,
  DeleteMessageCommand,
} = require('@aws-sdk/client-sqs');
const { sqsClient, QUEUE_URLS } = require('@config/sqs');
const Billing = require('@models/Billing');
const Order = require('@models/Orders');
const User = require('@models/User');

class InvoiceGenerationWorker {
  constructor() {
    this.queueUrl = QUEUE_URLS.INVOICE_GENERATION;
    this.isRunning = false;
    this.maxRetries = 3;
    this.pollInterval = 500; // Further reduced to 500ms for even faster processing
    console.log(`🔧 Invoice Generation Worker initialized with queue: ${this.queueUrl}`);
  }

  start() {
    if (this.isRunning) {
      console.log('🔄 Invoice Generation Worker is already running');
      return;
    }

    this.isRunning = true;
    console.log(`🚀 Starting Invoice Generation Worker with ${this.pollInterval}ms poll interval...`);
    console.log(`📍 Polling queue: ${this.queueUrl}`);
    this.poll();
  }

  stop() {
    this.isRunning = false;
    console.log('🛑 Invoice Generation Worker stopped');
  }

  async poll() {
    let pollCount = 0;
    const heartbeatInterval = 60;
    
    while (this.isRunning) {
      try {
        await this.receiveAndProcessMessages();
        
        pollCount++;
        if (pollCount % heartbeatInterval === 0) {
          console.log(`💓 Invoice Worker Heartbeat: ${pollCount} polls completed, still running...`);
        }
        
        await new Promise((resolve) => setTimeout(resolve, this.pollInterval));
      } catch (error) {
        console.error('❌ Error in Invoice Generation Worker polling:', error);
        await new Promise((resolve) =>
          setTimeout(resolve, this.pollInterval),
        );
      }
    }
  }

  async receiveAndProcessMessages() {
    const pollStartTime = Date.now();
    try {
      const command = new ReceiveMessageCommand({
        QueueUrl: this.queueUrl,
        MaxNumberOfMessages: 10,
        WaitTimeSeconds: 5,
        VisibilityTimeoutSeconds: 30, 
        MessageAttributeNames: ['All'],
        AttributeNames: ['All'],
      });

      const response = await sqsClient.send(command);
      const pollDuration = Date.now() - pollStartTime;

      if (!response.Messages || response.Messages.length === 0) {
        if (pollDuration > 100) { 
          console.log(`No messages found (poll took ${pollDuration}ms)`);
        }
        return;
      }

      console.log(
        `📨 Received ${response.Messages.length} invoice generation messages (poll took ${pollDuration}ms)`,
      );

      response.Messages.forEach((message, index) => {
        try {
          const messageBody = JSON.parse(message.Body);
          const messageTimestamp = new Date(messageBody.timestamp);
          const messageAge = Date.now() - messageTimestamp.getTime();
          console.log(`📩 Message ${index + 1} age: ${messageAge}ms (sent at ${messageBody.timestamp})`);
        } catch (e) {
          console.log(`📩 Message ${index + 1}: Could not parse timestamp`);
        }
      });

      // Process messages in parallel for better performance
      const processingPromises = response.Messages.map(message => 
        this.processMessage(message)
      );
      
      await Promise.allSettled(processingPromises);
    } catch (error) {
      const pollDuration = Date.now() - pollStartTime;
      console.error(
        `❌ Error receiving messages from Invoice Generation queue (${pollDuration}ms):`,
        error,
      );
      throw error;
    }
  }

  async processMessage(message) {
    let messageBody;
    const startTime = Date.now();
    try {
      messageBody = JSON.parse(message.Body);
      console.log(
        `🔄 Processing invoice generation for order: ${messageBody.orderId}`,
      );

      await this.processInvoiceGeneration(messageBody);

      await this.deleteMessage(message.ReceiptHandle);

      const processingTime = Date.now() - startTime;
      console.log(
        `✅ Successfully processed invoice generation for order: ${messageBody.orderId} (${processingTime}ms)`,
      );
    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error(`❌ Error processing invoice generation message (${processingTime}ms):`, error);

      if (messageBody) {
        const retryCount = messageBody.retryCount || 0;
        if (retryCount < this.maxRetries) {
          console.log(
            `🔄 Retrying invoice generation (attempt ${retryCount + 1}/${this.maxRetries})`,
          );
          // Don't delete message - let it retry with shorter visibility timeout
        } else {
          console.error(
            `💀 Max retries exceeded for invoice generation: ${messageBody.orderId}`,
          );
          await this.deleteMessage(message.ReceiptHandle);
        }
      } else {
        console.log('🗑️ Deleting unparseable message');
        await this.deleteMessage(message.ReceiptHandle);
      }
    }
  }

  async processInvoiceGeneration(messageBody) {
    const {
      orderId,
      hospitalId,
      courier,
      amount,
      invoiceDate,
      dueDate,
      status,
    } = messageBody;

    const existingBilling = await Billing.findOne({ order: orderId });
    if (existingBilling) {
      console.log(`⚠️ Billing record already exists for order: ${orderId}`);
      return;
    }

    const [order, hospital] = await Promise.all([
      Order.findById(orderId),
      User.findById(hospitalId)
    ]);

    if (!order) {
      throw new Error(`Order not found: ${orderId}`);
    }

    if (!hospital) {
      throw new Error(`Hospital not found: ${hospitalId}`);
    }

    const billingData = {
      order: orderId,
      hospital: hospitalId,
      invoiceDate: new Date(invoiceDate),
      dueDate: new Date(dueDate),
      amount: amount,
      status: status || 'Unpaid',
    };

    if (courier) {
      billingData.courier = courier;
    }

    // Create billing and update order in parallel
    const [newBilling] = await Promise.all([
      Billing.create(billingData),
      Order.findByIdAndUpdate(orderId, {
        status: 'Invoice Generated',
        updatedAt: new Date(),
      })
    ]);

    console.log(
      `✅ Invoice generated for order ${order.orderId}: Billing ID ${newBilling._id}, Amount: $${amount}`,
    );

    // Here you could add additional invoice processing logic:
    // - Generate PDF invoice
    // - Send email notification
    // - Update accounting system
    // - etc.
  }

  /**
   * Delete message from SQS queue
   * @param {string} receiptHandle - Message receipt handle
   */
  async deleteMessage(receiptHandle) {
    try {
      const command = new DeleteMessageCommand({
        QueueUrl: this.queueUrl,
        ReceiptHandle: receiptHandle,
      });

      await sqsClient.send(command);
    } catch (error) {
      console.error('❌ Error deleting message from queue:', error);
      throw error;
    }
  }
}

module.exports = InvoiceGenerationWorker;
