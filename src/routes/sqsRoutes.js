const express = require('express');
const router = express.Router();
const workerManager = require('@workers/workerManager');
const { sqsClient, QUEUE_URLS } = require('@config/sqs');
const { GetQueueAttributesCommand } = require('@aws-sdk/client-sqs');
const { PurgeQueueCommand } = require('@aws-sdk/client-sqs');


router.get('/workers/status', async (req, res) => {
  try {
    const status = workerManager.getStatus();
    
    const queueStats = {};
    
    for (const [queueName, queueUrl] of Object.entries(QUEUE_URLS)) {
      try {
        const command = new GetQueueAttributesCommand({
          QueueUrl: queueUrl,
          AttributeNames: [
            'ApproximateNumberOfMessages',
            'ApproximateNumberOfMessagesNotVisible',
            'ApproximateNumberOfMessagesDelayed'
          ]
        });
        
        const result = await sqsClient.send(command);
        queueStats[queueName] = {
          url: queueUrl,
          messagesAvailable: parseInt(result.Attributes.ApproximateNumberOfMessages || '0'),
          messagesInFlight: parseInt(result.Attributes.ApproximateNumberOfMessagesNotVisible || '0'),
          messagesDelayed: parseInt(result.Attributes.ApproximateNumberOfMessagesDelayed || '0')
        };
      } catch (error) {
        console.error(`Error getting stats for queue ${queueName}:`, error);
        queueStats[queueName] = {
          url: queueUrl,
          error: 'Unable to fetch stats',
          messagesAvailable: 'N/A',
          messagesInFlight: 'N/A',
          messagesDelayed: 'N/A'
        };
      }
    }

    res.json({
      status: true,
      data: {
        ...status,
        queueStats,
        lastUpdated: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error getting worker status:', error);
    res.status(500).json({
      status: false,
      message: 'Failed to get worker status',
      error: error.message
    });
  }
});

router.post('/workers/:workerName/start', async (req, res) => {
  try {
    const { workerName } = req.params;
    
    workerManager.startWorker(workerName);
    
    res.json({
      status: true,
      message: `Worker ${workerName} started successfully`
    });
  } catch (error) {
    console.error(`Error starting worker ${req.params.workerName}:`, error);
    res.status(500).json({
      status: false,
      message: `Failed to start worker ${req.params.workerName}`,
      error: error.message
    });
  }
});

router.post('/workers/:workerName/stop', async (req, res) => {
  try {
    const { workerName } = req.params;
    
    workerManager.stopWorker(workerName);
    
    res.json({
      status: true,
      message: `Worker ${workerName} stopped successfully`
    });
  } catch (error) {
    console.error(`Error stopping worker ${req.params.workerName}:`, error);
    res.status(500).json({
      status: false,
      message: `Failed to stop worker ${req.params.workerName}`,
      error: error.message
    });
  }
});

router.post('/workers/start-all', async (req, res) => {
  try {
    workerManager.startAll();
    
    res.json({
      status: true,
      message: 'All workers started successfully'
    });
  } catch (error) {
    console.error('Error starting all workers:', error);
    res.status(500).json({
      status: false,
      message: 'Failed to start all workers',
      error: error.message
    });
  }
});

router.post('/workers/stop-all', async (req, res) => {
  try {
    workerManager.stopAll();
    
    res.json({
      status: true,
      message: 'All workers stopped successfully'
    });
  } catch (error) {
    console.error('Error stopping all workers:', error);
    res.status(500).json({
      status: false,
      message: 'Failed to stop all workers',
      error: error.message
    });
  }
});

router.post('/queues/:queueName/purge', async (req, res) => {
  try {
    const { queueName } = req.params;
    const queueUrl = QUEUE_URLS[queueName];

    if (!queueUrl) {
      return res.status(400).json({
        status: false,
        message: `Queue "${queueName}" not found in QUEUE_URLS`
      });
    }

    const command = new PurgeQueueCommand({ QueueUrl: queueUrl });
    await sqsClient.send(command);

    res.json({
      status: true,
      message: `Queue "${queueName}" purged successfully`,
      queueUrl
    });
  } catch (error) {
    console.error(`Error purging queue ${req.params.queueName}:`, error);
    res.status(500).json({
      status: false,
      message: `Failed to purge queue ${req.params.queueName}`,
      error: error.message
    });
  }
});

router.post('/queues/purge-all', async (req, res) => {
  try {
    const results = [];

    for (const [queueName, queueUrl] of Object.entries(QUEUE_URLS)) {
      try {
        const command = new PurgeQueueCommand({ QueueUrl: queueUrl });
        await sqsClient.send(command);
        results.push({ queueName, queueUrl, status: 'purged' });
      } catch (err) {
        results.push({ queueName, queueUrl, status: 'error', error: err.message });
      }
    }

    res.json({
      status: true,
      message: 'All queues purge attempted',
      results
    });
  } catch (error) {
    console.error('Error purging all queues:', error);
    res.status(500).json({
      status: false,
      message: 'Failed to purge all queues',
      error: error.message
    });
  }
});

module.exports = router;
