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
    this.pollInterval = 5000; // 5 seconds
  }

  /**
   * Start the worker to poll for invoice generation messages
   */
  start() {
    if (this.isRunning) {
      console.log('🔄 Invoice Generation Worker is already running');
      return;
    }

    this.isRunning = true;
    console.log('🚀 Starting Invoice Generation Worker...');
    this.poll();
  }

  /**
   * Stop the worker
   */
  stop() {
    this.isRunning = false;
    console.log('🛑 Invoice Generation Worker stopped');
  }

  /**
   * Poll SQS for messages
   */
  async poll() {
    while (this.isRunning) {
      try {
        await this.receiveAndProcessMessages();
        await new Promise((resolve) => setTimeout(resolve, this.pollInterval));
      } catch (error) {
        console.error('❌ Error in Invoice Generation Worker polling:', error);
        await new Promise((resolve) =>
          setTimeout(resolve, this.pollInterval * 2),
        ); // Wait longer on error
      }
    }
  }

  /**
   * Receive and process messages from SQS
   */
  async receiveAndProcessMessages() {
    try {
      const command = new ReceiveMessageCommand({
        QueueUrl: this.queueUrl,
        MaxNumberOfMessages: 10,
        WaitTimeSeconds: 20, // Long polling
        MessageAttributeNames: ['All'],
      });

      const response = await sqsClient.send(command);

      if (!response.Messages || response.Messages.length === 0) {
        return; // No messages to process
      }

      console.log(
        `📨 Received ${response.Messages.length} invoice generation messages`,
      );

      for (const message of response.Messages) {
        await this.processMessage(message);
      }
    } catch (error) {
      console.error(
        '❌ Error receiving messages from Invoice Generation queue:',
        error,
      );
      throw error;
    }
  }

  async processMessage(message) {
    try {
      const messageBody = JSON.parse(message.Body);
      console.log(
        `🔄 Processing invoice generation for order: ${messageBody.orderId}`,
      );

      await this.processInvoiceGeneration(messageBody);

      await this.deleteMessage(message.ReceiptHandle);

      console.log(
        `✅ Successfully processed invoice generation for order: ${messageBody.orderId}`,
      );
    } catch (error) {
      console.error(`❌ Error processing invoice generation message:`, error);

      const retryCount = messageBody.retryCount || 0;
      if (retryCount < this.maxRetries) {
        console.log(
          `🔄 Retrying invoice generation (attempt ${retryCount + 1}/${this.maxRetries})`,
        );
      } else {
        console.error(
          `💀 Max retries exceeded for invoice generation: ${messageBody.orderId}`,
        );
        await this.deleteMessage(message.ReceiptHandle); // Remove from queue
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

    const order = await Order.findById(orderId);
    if (!order) {
      throw new Error(`Order not found: ${orderId}`);
    }

    const hospital = await User.findById(hospitalId);
    if (!hospital) {
      throw new Error(`Hospital not found: ${hospitalId}`);
    }

    const billingData = {
      order: orderId,
      hospital: hospitalId,
      courier: courier,
      invoiceDate: new Date(invoiceDate),
      dueDate: new Date(dueDate),
      amount: amount,
      status: status || 'Unpaid',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const newBilling = await Billing.create(billingData);

    await Order.findByIdAndUpdate(orderId, {
      status: 'Invoice Generated',
      updatedAt: new Date(),
    });

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
