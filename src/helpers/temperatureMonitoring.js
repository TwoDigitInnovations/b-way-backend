const AWS = require('aws-sdk');
const ComplianceReport = require('../models/ComplianceReport');

// Temperature monitoring service for Logmore sensors and other IoT devices
class TemperatureMonitoringService {
  constructor() {
    // Configure AWS IoT for sensor data ingestion (with fallback for demo)
    try {
      this.iotCore = new AWS.Iot({
        region: process.env.AWS_REGION || 'us-east-1'
      });
    } catch (error) {
      console.warn('AWS IoT not configured, using mock data:', error.message);
      this.iotCore = null;
    }
    
    // Cold-chain temperature requirements for pharmaceuticals
    this.temperatureRequirements = {
      'frozen': { min: -25, max: -15, unit: 'C' },
      'refrigerated': { min: 2, max: 8, unit: 'C' },
      'controlled_room_temp': { min: 20, max: 25, unit: 'C' },
      'room_temperature': { min: 15, max: 30, unit: 'C' }
    };
  }

  // Process incoming temperature data from Logmore sensors
  async processTemperatureReading(sensorData) {
    try {
      const {
        sensorId,
        temperature,
        humidity,
        timestamp,
        location,
        orderId,
        productType = 'refrigerated',
        batteryLevel,
        signalStrength
      } = sensorData;

      // Get temperature requirements for product type
      const requirements = this.temperatureRequirements[productType];
      if (!requirements) {
        throw new Error(`Unknown product type: ${productType}`);
      }

      // Check if temperature is within acceptable range
      const isWithinRange = temperature >= requirements.min && temperature <= requirements.max;
      
      // Create temperature log entry
      const temperatureLog = {
        timestamp: new Date(timestamp),
        temperature: parseFloat(temperature),
        humidity: humidity ? parseFloat(humidity) : null,
        sensorId,
        location: location || 'unknown',
        isWithinRange,
        requiredMinTemp: requirements.min,
        requiredMaxTemp: requirements.max,
        alertTriggered: !isWithinRange,
        metadata: {
          batteryLevel,
          signalStrength,
          productType,
          orderId
        }
      };

      // Find or create compliance report for current period
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

      let complianceReport = await ComplianceReport.findOne({
        'reportPeriod.startDate': { $lte: startOfDay },
        'reportPeriod.endDate': { $gte: endOfDay },
        regulationType: { $in: ['FDA', 'USP_797'] }
      });

      if (!complianceReport) {
        // Create new daily compliance report
        complianceReport = new ComplianceReport({
          date: today,
          reportPeriod: {
            startDate: startOfDay,
            endDate: endOfDay
          },
          regulationType: ['FDA', 'USP_797'],
          complianceCategories: ['cold_chain'],
          totalDeliveries: 0,
          audit: 0,
          violation: 0,
          violationType: 'Temperature Monitoring',
          status: 'draft',
          temperatureLogs: [],
          coldChainCompliance: {
            totalMonitoredDeliveries: 0,
            temperatureExcursions: 0,
            averageTemperature: 0,
            sensorCoveragePercentage: 100
          }
        });
      }

      // Add temperature log to compliance report
      complianceReport.temperatureLogs.push(temperatureLog);

      // Update cold chain compliance metrics
      await this.updateColdChainMetrics(complianceReport);

      // Trigger alerts if temperature excursion detected
      if (!isWithinRange) {
        await this.triggerTemperatureAlert(temperatureLog, complianceReport);
      }

      await complianceReport.save();

      return {
        success: true,
        excursionDetected: !isWithinRange,
        temperatureLog,
        complianceReportId: complianceReport._id
      };

    } catch (error) {
      console.error('Error processing temperature reading:', error);
      throw error;
    }
  }

  // Update cold chain compliance metrics
  async updateColdChainMetrics(complianceReport) {
    const temperatureLogs = complianceReport.temperatureLogs;
    
    if (temperatureLogs.length === 0) return;

    const excursions = temperatureLogs.filter(log => !log.isWithinRange);
    const totalReadings = temperatureLogs.length;
    const avgTemp = temperatureLogs.reduce((sum, log) => sum + log.temperature, 0) / totalReadings;
    const minTemp = Math.min(...temperatureLogs.map(log => log.temperature));
    const maxTemp = Math.max(...temperatureLogs.map(log => log.temperature));

    // Update compliance metrics
    complianceReport.coldChainCompliance = {
      ...complianceReport.coldChainCompliance,
      temperatureExcursions: excursions.length,
      averageTemperature: parseFloat(avgTemp.toFixed(2)),
      minRecordedTemp: minTemp,
      maxRecordedTemp: maxTemp
    };

    // Update violation count if new excursions detected
    if (excursions.length > complianceReport.violation) {
      complianceReport.violation = excursions.length;
    }
  }

  // Trigger temperature excursion alerts
  async triggerTemperatureAlert(temperatureLog, complianceReport) {
    try {
      const alertData = {
        type: 'temperature_excursion',
        severity: this.calculateSeverity(temperatureLog),
        description: `Temperature excursion detected: ${temperatureLog.temperature}°C (Range: ${temperatureLog.requiredMinTemp}°C to ${temperatureLog.requiredMaxTemp}°C)`,
        detectedAt: temperatureLog.timestamp,
        affectedProducts: [temperatureLog.metadata?.productType || 'unknown'],
        sensorInfo: {
          sensorId: temperatureLog.sensorId,
          location: temperatureLog.location,
          batteryLevel: temperatureLog.metadata?.batteryLevel,
          signalStrength: temperatureLog.metadata?.signalStrength
        },
        orderId: temperatureLog.metadata?.orderId
      };

      // Add exception to compliance report
      if (!complianceReport.exceptions) {
        complianceReport.exceptions = [];
      }
      
      complianceReport.exceptions.push(alertData);

      // Send real-time notifications (implement based on your notification system)
      await this.sendAlertNotification(alertData);

      // Log to AWS CloudWatch for monitoring
      await this.logToCloudWatch(alertData);

      console.log(`🚨 Temperature Alert: ${alertData.description}`);

    } catch (error) {
      console.error('Error triggering temperature alert:', error);
    }
  }

  // Calculate alert severity based on temperature deviation
  calculateSeverity(temperatureLog) {
    const { temperature, requiredMinTemp, requiredMaxTemp } = temperatureLog;
    const midPoint = (requiredMinTemp + requiredMaxTemp) / 2;
    const tolerance = (requiredMaxTemp - requiredMinTemp) / 2;
    
    const deviation = Math.abs(temperature - midPoint);
    const deviationPercentage = (deviation / tolerance) * 100;

    if (deviationPercentage > 200) return 'critical';
    if (deviationPercentage > 150) return 'high';
    if (deviationPercentage > 100) return 'medium';
    return 'low';
  }

  // Send alert notifications
  async sendAlertNotification(alertData) {
    // Implement your notification system here
    // Could be email, SMS, Slack, Teams, etc.
    console.log('Sending alert notification:', alertData);
  }

  // Log events to AWS CloudWatch
  async logToCloudWatch(data) {
    try {
      const cloudWatch = new AWS.CloudWatchLogs({
        region: process.env.AWS_REGION || 'us-east-1'
      });

      const logParams = {
        logGroupName: '/aws/bway/compliance/temperature-alerts',
        logStreamName: `alerts-${new Date().toISOString().split('T')[0]}`,
        logEvents: [{
          timestamp: Date.now(),
          message: JSON.stringify(data)
        }]
      };

      await cloudWatch.putLogEvents(logParams).promise();
    } catch (error) {
      console.error('Error logging to CloudWatch:', error);
    }
  }

  // Generate temperature compliance report
  async generateTemperatureReport(startDate, endDate) {
    try {
      const reports = await ComplianceReport.find({
        'reportPeriod.startDate': { $gte: new Date(startDate) },
        'reportPeriod.endDate': { $lte: new Date(endDate) },
        temperatureLogs: { $exists: true, $ne: [] }
      });

      const allLogs = reports.reduce((logs, report) => {
        return logs.concat(report.temperatureLogs || []);
      }, []);

      const excursions = allLogs.filter(log => !log.isWithinRange);
      const totalReadings = allLogs.length;
      const complianceRate = totalReadings > 0 ? ((totalReadings - excursions.length) / totalReadings) * 100 : 100;

      // Group excursions by severity
      const excursionsBySeverity = excursions.reduce((acc, log) => {
        const severity = this.calculateSeverity(log);
        acc[severity] = (acc[severity] || 0) + 1;
        return acc;
      }, {});

      // Group by sensor for coverage analysis
      const sensorCoverage = allLogs.reduce((acc, log) => {
        acc[log.sensorId] = (acc[log.sensorId] || 0) + 1;
        return acc;
      }, {});

      return {
        period: { startDate, endDate },
        summary: {
          totalReadings,
          excursionsCount: excursions.length,
          complianceRate: parseFloat(complianceRate.toFixed(2)),
          averageTemperature: totalReadings > 0 ? 
            parseFloat((allLogs.reduce((sum, log) => sum + log.temperature, 0) / totalReadings).toFixed(2)) : 0
        },
        excursionAnalysis: {
          bySeverity: excursionsBySeverity,
          byTimeOfDay: this.analyzeExcursionsByTime(excursions),
          byLocation: this.analyzeExcursionsByLocation(excursions)
        },
        sensorPerformance: {
          coverage: sensorCoverage,
          activeSensors: Object.keys(sensorCoverage).length,
          averageReadingsPerSensor: totalReadings / Object.keys(sensorCoverage).length || 0
        },
        recommendations: this.generateRecommendations(excursions, complianceRate)
      };

    } catch (error) {
      console.error('Error generating temperature report:', error);
      throw error;
    }
  }

  // Analyze excursions by time of day
  analyzeExcursionsByTime(excursions) {
    const timeSlots = {};
    excursions.forEach(excursion => {
      const hour = new Date(excursion.timestamp).getHours();
      const timeSlot = `${hour}:00-${hour + 1}:00`;
      timeSlots[timeSlot] = (timeSlots[timeSlot] || 0) + 1;
    });
    return timeSlots;
  }

  // Analyze excursions by location
  analyzeExcursionsByLocation(excursions) {
    const locations = {};
    excursions.forEach(excursion => {
      const location = excursion.location || 'unknown';
      locations[location] = (locations[location] || 0) + 1;
    });
    return locations;
  }

  // Generate recommendations based on analysis
  generateRecommendations(excursions, complianceRate) {
    const recommendations = [];

    if (complianceRate < 95) {
      recommendations.push('Temperature compliance is below 95%. Review cold chain procedures and sensor placement.');
    }

    if (excursions.length > 0) {
      const criticalExcursions = excursions.filter(ex => this.calculateSeverity(ex) === 'critical');
      if (criticalExcursions.length > 0) {
        recommendations.push('Critical temperature excursions detected. Immediate review of affected products required.');
      }
    }

    const frequentLocations = this.analyzeExcursionsByLocation(excursions);
    const problematicLocations = Object.entries(frequentLocations)
      .filter(([_, count]) => count > 5)
      .map(([location, _]) => location);

    if (problematicLocations.length > 0) {
      recommendations.push(`High excursion frequency at locations: ${problematicLocations.join(', ')}. Consider environmental controls.`);
    }

    return recommendations;
  }

  // Validate sensor data integrity
  validateSensorData(sensorData) {
    const required = ['sensorId', 'temperature', 'timestamp'];
    const missing = required.filter(field => !sensorData[field]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }

    if (isNaN(parseFloat(sensorData.temperature))) {
      throw new Error('Temperature must be a valid number');
    }

    if (new Date(sensorData.timestamp).toString() === 'Invalid Date') {
      throw new Error('Timestamp must be a valid date');
    }

    return true;
  }
}

module.exports = TemperatureMonitoringService;
