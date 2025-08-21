const RouteAssignmentWorker = require('./routeAssignmentWorker');
const InvoiceGenerationWorker = require('./invoiceGenerationWorker');

class WorkerManager {
  constructor() {
    this.workers = {
      routeAssignment: new RouteAssignmentWorker(),
      invoiceGeneration: new InvoiceGenerationWorker(),
    };
    this.isRunning = false;
  }

  /**
   * Start all workers
   */
  startAll() {
    if (this.isRunning) {
      console.log('🔄 Worker Manager is already running');
      return;
    }

    console.log('🚀 Starting all SQS workers...');
    
    try {
      Object.entries(this.workers).forEach(([name, worker]) => {
        console.log(`🔄 Starting ${name} worker...`);
        worker.start();
      });

      this.isRunning = true;
      console.log('✅ All SQS workers started successfully');
    } catch (error) {
      console.error('❌ Error starting workers:', error);
      this.stopAll();
      throw error;
    }
  }

  /**
   * Stop all workers
   */
  stopAll() {
    console.log('🛑 Stopping all SQS workers...');
    
    Object.entries(this.workers).forEach(([name, worker]) => {
      console.log(`🔄 Stopping ${name} worker...`);
      worker.stop();
    });

    this.isRunning = false;
    console.log('✅ All SQS workers stopped');
  }

  /**
   * Start a specific worker
   * @param {string} workerName - Name of the worker to start
   */
  startWorker(workerName) {
    const worker = this.workers[workerName];
    if (!worker) {
      throw new Error(`Worker not found: ${workerName}`);
    }

    console.log(`🚀 Starting ${workerName} worker...`);
    worker.start();
  }

  /**
   * Stop a specific worker
   * @param {string} workerName - Name of the worker to stop
   */
  stopWorker(workerName) {
    const worker = this.workers[workerName];
    if (!worker) {
      throw new Error(`Worker not found: ${workerName}`);
    }

    console.log(`🛑 Stopping ${workerName} worker...`);
    worker.stop();
  }

  /**
   * Get status of all workers
   */
  getStatus() {
    const status = {};
    Object.entries(this.workers).forEach(([name, worker]) => {
      status[name] = {
        isRunning: worker.isRunning,
        queueUrl: worker.queueUrl,
      };
    });

    return {
      managerRunning: this.isRunning,
      workers: status,
    };
  }

  /**
   * Handle graceful shutdown
   */
  handleShutdown() {
    console.log('🔄 Graceful shutdown initiated...');
    
    this.stopAll();
    
    // Give workers time to finish current processing
    setTimeout(() => {
      console.log('✅ Graceful shutdown completed');
      process.exit(0);
    }, 5000);
  }
}

// Create singleton instance
const workerManager = new WorkerManager();

// Handle process signals for graceful shutdown
process.on('SIGTERM', () => {
  console.log('📨 SIGTERM received');
  workerManager.handleShutdown();
});

process.on('SIGINT', () => {
  console.log('📨 SIGINT received');
  workerManager.handleShutdown();
});

module.exports = workerManager;
