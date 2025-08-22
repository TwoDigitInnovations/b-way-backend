const { ReceiveMessageCommand, DeleteMessageCommand } = require('@aws-sdk/client-sqs');
const { sqsClient, QUEUE_URLS } = require('@config/sqs');
const Order = require('@models/Orders');
const { findOrCreateRouteForDelivery } = require('@helpers/routeMatching');
const socketService = require('@services/socketService');

class RouteAssignmentWorker {
  constructor() {
    this.queueUrl = QUEUE_URLS.ROUTE_ASSIGNMENT;
    this.isRunning = false;
    this.maxRetries = 3;
    this.pollInterval = 5000;
  }

  start() {
    if (this.isRunning) {
      console.log('🔄 Route Assignment Worker is already running');
      return;
    }

    this.isRunning = true;
    console.log('🚀 Starting Route Assignment Worker...');
    this.poll();
  }

  /**
   * Stop the worker
   */
  stop() {
    this.isRunning = false;
    console.log('🛑 Route Assignment Worker stopped');
  }

  /**
   * Poll SQS for messages
   */
  async poll() {
    while (this.isRunning) {
      try {
        await this.receiveAndProcessMessages();
        await new Promise(resolve => setTimeout(resolve, this.pollInterval));
      } catch (error) {
        console.error('❌ Error in Route Assignment Worker polling:', error);
        await new Promise(resolve => setTimeout(resolve, this.pollInterval * 2)); // Wait longer on error
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

      console.log(`📨 Received ${response.Messages.length} route assignment messages`);

      for (const message of response.Messages) {
        await this.processMessage(message);
      }
    } catch (error) {
      console.error('❌ Error receiving messages from Route Assignment queue:', error);
      throw error;
    }
  }

  async processMessage(message) {
    try {
      const messageBody = JSON.parse(message.Body);
      console.log(`🔄 Processing route assignment for order: ${messageBody.orderId}`);

      await this.processRouteAssignment(messageBody);

      await this.deleteMessage(message.ReceiptHandle);
      
      console.log(`✅ Successfully processed route assignment for order: ${messageBody.orderId}`);
    } catch (error) {
      console.error(`❌ Error processing route assignment message:`, error);
      
      const retryCount = messageBody.retryCount || 0;
      if (retryCount < this.maxRetries) {
        console.log(`🔄 Retrying route assignment (attempt ${retryCount + 1}/${this.maxRetries})`);
      } else {
        console.error(`Max retries exceeded for route assignment: ${messageBody.orderId}`);
        await this.deleteMessage(message.ReceiptHandle); // Remove from queue
      }
    }
  }

  /**
   * Process route assignment for an order
   * @param {object} messageBody - Message body containing order data
   */
  async processRouteAssignment(messageBody) {
    const { orderDbId, pickupLocation, deliveryLocation, userId } = messageBody;

    // Find the order in database
    const order = await Order.findById(orderDbId).populate('user', 'name delivery_Address');
    if (!order) {
      throw new Error(`Order not found: ${orderDbId}`);
    }

    // Skip if order already has a route assigned
    if (order.route) {
      console.log(`⚠️ Order ${order.orderId} already has route assigned: ${order.route}`);
      return;
    }

    // Construct addresses
    const staticPickupAddress = "160 W Forest Ave, Englewood";
    const deliveryAddress = `${deliveryLocation.address}, ${deliveryLocation.city}, ${deliveryLocation.state} ${deliveryLocation.zipcode}`;
    const hospitalName = order.user?.name || `Hospital-${userId.toString().slice(-6)}`;

    console.log(`🚀 Processing route assignment from: "${staticPickupAddress}" → to: "${deliveryAddress}" for hospital: "${hospitalName}"`);

    // Find or create route
    const routeMatch = await findOrCreateRouteForDelivery(
      staticPickupAddress, 
      deliveryAddress, 
      hospitalName, 
      deliveryAddress
    );

    // Update order with route assignment
    if (routeMatch.route) {
      const updatedOrder = await Order.findByIdAndUpdate(orderDbId, {
        route: routeMatch.route._id,
        status: 'Scheduled',
        updatedAt: new Date()
      }, { new: true })
      .populate('user', 'name email role')
      .populate('items', 'name')
      .populate('route', 'routeName');

      console.log(`✅ Route assigned to order ${order.orderId}: "${routeMatch.route.routeName}"`);
      
      // Emit socket event for route assignment
      try {
        if (socketService && updatedOrder) {
          console.log(`📡 Emitting route assignment event for order ${updatedOrder.orderId}`);
          socketService.emitRouteAssignment(updatedOrder, routeMatch.route);
        } else {
          console.warn('⚠️ Socket service not available or order not found for route assignment notification');
        }
      } catch (socketError) {
        console.error('❌ Error emitting route assignment socket event:', socketError);
        // Don't fail the worker if socket emission fails
      }
    } else {
      console.error(`❌ Failed to assign route to order ${order.orderId}`);
      throw new Error(`Failed to find or create route for order ${order.orderId}`);
    }
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

module.exports = RouteAssignmentWorker;
