const { SendMessageCommand } = require('@aws-sdk/client-sqs');
const { sqsClient, QUEUE_URLS } = require('@config/sqs');

class SQSService {
  async sendMessage(queueUrl, messageBody, messageAttributes = {}) {
    try {
      const command = new SendMessageCommand({
        QueueUrl: queueUrl,
        MessageBody: JSON.stringify(messageBody),
        MessageAttributes: messageAttributes,
      });

      const response = await sqsClient.send(command);
      console.log(`✅ Message sent to SQS queue: ${queueUrl}`, {
        messageId: response.MessageId,
        bodySize: JSON.stringify(messageBody).length,
      });

      return response;
    } catch (error) {
      console.error(`❌ Failed to send message to SQS queue: ${queueUrl}`, error);
      throw error;
    }
  }

  async sendRouteAssignmentMessage(orderData) {
    const messageBody = {
      type: 'ROUTE_ASSIGNMENT',
      timestamp: new Date().toISOString(),
      orderId: orderData.orderId,
      orderDbId: orderData.orderDbId,
      userId: orderData.userId,
      pickupLocation: orderData.pickupLocation,
      deliveryLocation: orderData.deliveryLocation,
      items: orderData.items,
      qty: orderData.qty,
      hospitalName: orderData.hospitalName,
      priority: orderData.priority || 'normal',
      retryCount: orderData.retryCount || 0,
    };

    const messageAttributes = {
      OrderId: {
        DataType: 'String',
        StringValue: orderData.orderId,
      },
      UserId: {
        DataType: 'String',
        StringValue: orderData.userId.toString(),
      },
      MessageType: {
        DataType: 'String',
        StringValue: 'ROUTE_ASSIGNMENT',
      },
    };

    return this.sendMessage(QUEUE_URLS.ROUTE_ASSIGNMENT, messageBody, messageAttributes);
  }

  async sendInvoiceGenerationMessage(billingData) {
    const messageBody = {
      type: 'INVOICE_GENERATION',
      timestamp: new Date().toISOString(),
      orderId: billingData.orderId,
      hospitalId: billingData.hospitalId,
      courier: billingData.courier,
      amount: billingData.amount,
      invoiceDate: billingData.invoiceDate,
      dueDate: billingData.dueDate,
      status: billingData.status,
      priority: billingData.priority || 'normal',
      retryCount: billingData.retryCount || 0,
    };

    const messageAttributes = {
      OrderId: {
        DataType: 'String',
        StringValue: billingData.orderId.toString(),
      },
      HospitalId: {
        DataType: 'String',
        StringValue: billingData.hospitalId.toString(),
      },
      Amount: {
        DataType: 'Number',
        StringValue: billingData.amount.toString(),
      },
      MessageType: {
        DataType: 'String',
        StringValue: 'INVOICE_GENERATION',
      },
    };

    return this.sendMessage(QUEUE_URLS.INVOICE_GENERATION, messageBody, messageAttributes);
  }
  
  async sendBatchMessages(queueUrl, messages) {
    const promises = messages.map(message => 
      this.sendMessage(queueUrl, message.body, message.attributes)
    );

    try {
      const responses = await Promise.allSettled(promises);
      
      const successful = responses.filter(r => r.status === 'fulfilled').length;
      const failed = responses.filter(r => r.status === 'rejected').length;

      console.log(`📊 Batch SQS operation completed: ${successful} successful, ${failed} failed`);
      
      return responses;
    } catch (error) {
      console.error('❌ Batch SQS operation failed:', error);
      throw error;
    }
  }
}

module.exports = new SQSService();
