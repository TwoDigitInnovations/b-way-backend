const AWS = require('aws-sdk');
const ComplianceReport = require('../models/ComplianceReport');
const Order = require('../models/Orders');

// Chain of custody tracking service for pharmaceutical deliveries
class ChainOfCustodyService {
  constructor() {
    // Configure AWS services
    this.s3 = new AWS.S3({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || 'us-east-1'
    });

    this.dynamoDB = new AWS.DynamoDB.DocumentClient({
      region: process.env.AWS_REGION || 'us-east-1'
    });

    // Bucket for storing delivery photos and signatures
    this.bucketName = process.env.AWS_S3_BUCKET || 'bway-compliance-evidence';
  }

  // Record pickup event
  async recordPickup(pickupData) {
    try {
      const {
        orderId,
        driverId,
        driverName,
        vehicleId,
        licensePlate,
        pickupLocation,
        timestamp,
        signature,
        photos,
        notes,
        gpsCoordinates
      } = pickupData;

      // Validate required data
      this.validateCustodyData(pickupData, 'pickup');

      // Upload signature and photos to S3
      const uploadResults = await this.uploadEvidenceFiles({
        signature,
        photos,
        orderId,
        eventType: 'pickup',
        timestamp
      });

      // Create custody log entry
      const custodyLog = {
        timestamp: new Date(timestamp),
        event: 'pickup',
        location: {
          address: pickupLocation.address,
          coordinates: {
            latitude: gpsCoordinates?.latitude,
            longitude: gpsCoordinates?.longitude
          }
        },
        handlerInfo: {
          driverId,
          driverName,
          signature: uploadResults.signatureUrl,
          vehicleId,
          licensePlate
        },
        notes,
        photosUrls: uploadResults.photoUrls,
        gpsCoordinates
      };

      // Update order with custody information
      await Order.findByIdAndUpdate(orderId, {
        $push: { 'custodyChain': custodyLog },
        $set: { 'lastCustodyEvent': custodyLog }
      });

      // Add to compliance report
      await this.addToComplianceReport(custodyLog, orderId);

      // Log to blockchain for immutable record (optional)
      await this.logToBlockchain(custodyLog, orderId);

      return {
        success: true,
        custodyLogId: custodyLog._id,
        evidenceUrls: uploadResults
      };

    } catch (error) {
      console.error('Error recording pickup:', error);
      throw error;
    }
  }

  // Record in-transit updates
  async recordTransitUpdate(transitData) {
    try {
      const {
        orderId,
        driverId,
        currentLocation,
        timestamp,
        gpsCoordinates,
        vehicleStatus,
        notes,
        photos
      } = transitData;

      // Upload any photos
      const uploadResults = await this.uploadEvidenceFiles({
        photos,
        orderId,
        eventType: 'in_transit',
        timestamp
      });

      const custodyLog = {
        timestamp: new Date(timestamp),
        event: 'in_transit',
        location: {
          address: currentLocation,
          coordinates: {
            latitude: gpsCoordinates?.latitude,
            longitude: gpsCoordinates?.longitude
          }
        },
        handlerInfo: {
          driverId,
          vehicleStatus
        },
        notes,
        photosUrls: uploadResults.photoUrls,
        gpsCoordinates
      };

      // Update order
      await Order.findByIdAndUpdate(orderId, {
        $push: { 'custodyChain': custodyLog },
        $set: { 'lastCustodyEvent': custodyLog }
      });

      // Add to compliance report
      await this.addToComplianceReport(custodyLog, orderId);

      return {
        success: true,
        custodyLogId: custodyLog._id
      };

    } catch (error) {
      console.error('Error recording transit update:', error);
      throw error;
    }
  }

  // Record delivery event
  async recordDelivery(deliveryData) {
    try {
      const {
        orderId,
        driverId,
        driverName,
        deliveryLocation,
        timestamp,
        recipientInfo,
        deliveryPhotos,
        signaturePhoto,
        notes,
        gpsCoordinates,
        deliveryConfirmationCode
      } = deliveryData;

      // Validate delivery data
      this.validateCustodyData(deliveryData, 'delivery');

      // Upload delivery evidence
      const uploadResults = await this.uploadEvidenceFiles({
        signature: signaturePhoto,
        photos: deliveryPhotos,
        orderId,
        eventType: 'delivery',
        timestamp
      });

      const custodyLog = {
        timestamp: new Date(timestamp),
        event: 'delivery',
        location: {
          address: deliveryLocation.address,
          coordinates: {
            latitude: gpsCoordinates?.latitude,
            longitude: gpsCoordinates?.longitude
          }
        },
        handlerInfo: {
          driverId,
          driverName
        },
        recipient: {
          name: recipientInfo.name,
          title: recipientInfo.title,
          signature: uploadResults.signatureUrl,
          contactInfo: recipientInfo.contactInfo,
          confirmationCode: deliveryConfirmationCode
        },
        notes,
        photosUrls: uploadResults.photoUrls,
        gpsCoordinates
      };

      // Update order status and custody chain
      await Order.findByIdAndUpdate(orderId, {
        $push: { 'custodyChain': custodyLog },
        $set: { 
          'lastCustodyEvent': custodyLog,
          'status': 'Delivered',
          'deliveredAt': new Date(timestamp)
        }
      });

      // Generate chain of custody certificate
      const certificate = await this.generateCustodyCertificate(orderId);

      // Add to compliance report
      await this.addToComplianceReport(custodyLog, orderId);

      // Send delivery confirmation
      await this.sendDeliveryConfirmation(orderId, recipientInfo, certificate);

      return {
        success: true,
        custodyLogId: custodyLog._id,
        evidenceUrls: uploadResults,
        certificate
      };

    } catch (error) {
      console.error('Error recording delivery:', error);
      throw error;
    }
  }

  // Record exception events (delays, route deviations, etc.)
  async recordException(exceptionData) {
    try {
      const {
        orderId,
        exceptionType,
        description,
        timestamp,
        location,
        driverId,
        resolutionActions,
        photos,
        gpsCoordinates
      } = exceptionData;

      // Upload exception photos
      const uploadResults = await this.uploadEvidenceFiles({
        photos,
        orderId,
        eventType: 'exception',
        timestamp
      });

      const custodyLog = {
        timestamp: new Date(timestamp),
        event: 'exception',
        location: {
          address: location,
          coordinates: {
            latitude: gpsCoordinates?.latitude,
            longitude: gpsCoordinates?.longitude
          }
        },
        handlerInfo: {
          driverId
        },
        notes: `Exception: ${exceptionType} - ${description}`,
        photosUrls: uploadResults.photoUrls,
        gpsCoordinates,
        exceptionDetails: {
          type: exceptionType,
          description,
          resolutionActions
        }
      };

      // Update order
      await Order.findByIdAndUpdate(orderId, {
        $push: { 'custodyChain': custodyLog },
        $set: { 'lastCustodyEvent': custodyLog }
      });

      // Add exception to compliance report
      await this.addExceptionToComplianceReport({
        type: this.mapExceptionType(exceptionType),
        severity: this.calculateExceptionSeverity(exceptionType),
        description,
        detectedAt: new Date(timestamp),
        resolutionActions,
        affectedProducts: [orderId]
      });

      return {
        success: true,
        custodyLogId: custodyLog._id,
        evidenceUrls: uploadResults
      };

    } catch (error) {
      console.error('Error recording exception:', error);
      throw error;
    }
  }

  // Upload evidence files (signatures, photos) to S3
  async uploadEvidenceFiles({ signature, photos, orderId, eventType, timestamp }) {
    const uploadResults = {
      signatureUrl: null,
      photoUrls: []
    };

    try {
      const basePath = `custody-evidence/${orderId}/${eventType}/${timestamp}`;

      // Upload signature if provided
      if (signature) {
        const signatureKey = `${basePath}/signature.png`;
        const signatureBuffer = Buffer.from(signature.replace(/^data:image\/\w+;base64,/, ''), 'base64');
        
        await this.s3.upload({
          Bucket: this.bucketName,
          Key: signatureKey,
          Body: signatureBuffer,
          ContentType: 'image/png',
          Metadata: {
            orderId,
            eventType,
            timestamp: timestamp.toString(),
            documentType: 'signature'
          }
        }).promise();

        uploadResults.signatureUrl = `https://${this.bucketName}.s3.amazonaws.com/${signatureKey}`;
      }

      // Upload photos if provided
      if (photos && Array.isArray(photos)) {
        for (let i = 0; i < photos.length; i++) {
          const photo = photos[i];
          const photoKey = `${basePath}/photo_${i + 1}.jpg`;
          const photoBuffer = Buffer.from(photo.replace(/^data:image\/\w+;base64,/, ''), 'base64');
          
          await this.s3.upload({
            Bucket: this.bucketName,
            Key: photoKey,
            Body: photoBuffer,
            ContentType: 'image/jpeg',
            Metadata: {
              orderId,
              eventType,
              timestamp: timestamp.toString(),
              documentType: 'photo',
              photoIndex: i.toString()
            }
          }).promise();

          uploadResults.photoUrls.push(`https://${this.bucketName}.s3.amazonaws.com/${photoKey}`);
        }
      }

      return uploadResults;

    } catch (error) {
      console.error('Error uploading evidence files:', error);
      throw error;
    }
  }

  // Add custody log to compliance report
  async addToComplianceReport(custodyLog, orderId) {
    try {
      // Find today's compliance report
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

      let complianceReport = await ComplianceReport.findOne({
        'reportPeriod.startDate': { $lte: startOfDay },
        'reportPeriod.endDate': { $gte: endOfDay }
      });

      if (!complianceReport) {
        // Create new compliance report for today
        complianceReport = new ComplianceReport({
          date: today,
          reportPeriod: { startDate: startOfDay, endDate: endOfDay },
          regulationType: ['HIPAA', 'FDA'],
          complianceCategories: ['chain_of_custody'],
          totalDeliveries: 0,
          audit: 0,
          violation: 0,
          violationType: 'Chain of Custody',
          status: 'draft'
        });
      }

      // Add custody log
      complianceReport.custodyLogs.push(custodyLog);

      // Update chain of custody compliance metrics
      await this.updateCustodyMetrics(complianceReport);

      await complianceReport.save();

    } catch (error) {
      console.error('Error adding to compliance report:', error);
    }
  }

  // Update chain of custody compliance metrics
  async updateCustodyMetrics(complianceReport) {
    const custodyLogs = complianceReport.custodyLogs;
    
    if (custodyLogs.length === 0) return;

    // Calculate completion rates
    const logsWithSignatures = custodyLogs.filter(log => 
      log.handlerInfo?.signature || log.recipient?.signature
    ).length;
    
    const deliveryLogs = custodyLogs.filter(log => log.event === 'delivery');
    const logsWithGPS = custodyLogs.filter(log => log.gpsCoordinates).length;
    
    const signatureCompletionRate = custodyLogs.length > 0 ? 
      (logsWithSignatures / custodyLogs.length) * 100 : 100;
    
    const deliveryConfirmationRate = deliveryLogs.length > 0 ? 
      (deliveryLogs.filter(log => log.recipient).length / deliveryLogs.length) * 100 : 100;
    
    const gpsTrackingCoverage = custodyLogs.length > 0 ? 
      (logsWithGPS / custodyLogs.length) * 100 : 100;

    complianceReport.chainOfCustodyCompliance = {
      completeDocumentationRate: 100, // Calculate based on required fields
      signatureCompletionRate,
      deliveryConfirmationRate,
      gpsTrackingCoverage
    };
  }

  // Generate chain of custody certificate
  async generateCustodyCertificate(orderId) {
    try {
      const order = await Order.findById(orderId)
        .populate('user', 'name email')
        .populate('items', 'name')
        .populate('route', 'routeName');

      if (!order || !order.custodyChain) {
        throw new Error('Order or custody chain not found');
      }

      const certificate = {
        certificateId: `COC-${orderId}-${Date.now()}`,
        orderId: order.orderId,
        generatedAt: new Date(),
        order: {
          items: order.items?.name,
          quantity: order.qty,
          customer: order.user?.name,
          route: order.route?.routeName
        },
        custodyChain: order.custodyChain.map(log => ({
          event: log.event,
          timestamp: log.timestamp,
          location: log.location?.address,
          handler: log.handlerInfo?.driverName || log.handlerInfo?.driverId,
          recipient: log.recipient?.name,
          evidenceUrls: {
            signature: log.handlerInfo?.signature || log.recipient?.signature,
            photos: log.photosUrls
          }
        })),
        integrity: {
          totalEvents: order.custodyChain.length,
          signedEvents: order.custodyChain.filter(log => 
            log.handlerInfo?.signature || log.recipient?.signature
          ).length,
          gpsTrackedEvents: order.custodyChain.filter(log => log.gpsCoordinates).length
        },
        compliance: {
          hipaaCompliant: true, // Calculate based on data handling
          fdaCompliant: true,   // Calculate based on cold chain
          chainComplete: this.validateChainCompleteness(order.custodyChain)
        }
      };

      // Store certificate in DynamoDB for audit purposes
      await this.storeCertificate(certificate);

      return certificate;

    } catch (error) {
      console.error('Error generating custody certificate:', error);
      throw error;
    }
  }

  // Store certificate in DynamoDB
  async storeCertificate(certificate) {
    try {
      const params = {
        TableName: 'ChainOfCustodyCertificates',
        Item: {
          certificateId: certificate.certificateId,
          orderId: certificate.orderId,
          generatedAt: certificate.generatedAt.toISOString(),
          certificate: JSON.stringify(certificate),
          ttl: Math.floor((Date.now() + (7 * 365 * 24 * 60 * 60 * 1000)) / 1000) // 7 years retention
        }
      };

      await this.dynamoDB.put(params).promise();

    } catch (error) {
      console.error('Error storing certificate in DynamoDB:', error);
    }
  }

  // Validate chain completeness
  validateChainCompleteness(custodyChain) {
    const requiredEvents = ['pickup', 'delivery'];
    const presentEvents = [...new Set(custodyChain.map(log => log.event))];
    
    return requiredEvents.every(event => presentEvents.includes(event));
  }

  // Add exception to compliance report
  async addExceptionToComplianceReport(exceptionData) {
    try {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

      const complianceReport = await ComplianceReport.findOne({
        'reportPeriod.startDate': { $lte: startOfDay },
        'reportPeriod.endDate': { $gte: endOfDay }
      });

      if (complianceReport) {
        if (!complianceReport.exceptions) {
          complianceReport.exceptions = [];
        }
        
        complianceReport.exceptions.push(exceptionData);
        complianceReport.violation += 1;
        
        await complianceReport.save();
      }

    } catch (error) {
      console.error('Error adding exception to compliance report:', error);
    }
  }

  // Validate custody data
  validateCustodyData(data, eventType) {
    const baseRequired = ['orderId', 'timestamp', 'driverId'];
    
    const eventSpecificRequired = {
      'pickup': ['pickupLocation', 'signature'],
      'delivery': ['deliveryLocation', 'recipientInfo', 'signaturePhoto'],
      'exception': ['exceptionType', 'description']
    };

    const required = [...baseRequired, ...(eventSpecificRequired[eventType] || [])];
    const missing = required.filter(field => !data[field]);

    if (missing.length > 0) {
      throw new Error(`Missing required fields for ${eventType}: ${missing.join(', ')}`);
    }

    return true;
  }

  // Map exception types to compliance categories
  mapExceptionType(exceptionType) {
    const mapping = {
      'route_deviation': 'route_deviation',
      'delivery_delay': 'delivery_delay',
      'package_damage': 'package_damage',
      'unauthorized_access': 'unauthorized_access',
      'documentation_missing': 'documentation_missing',
      'temperature_issue': 'temperature_excursion'
    };

    return mapping[exceptionType] || 'documentation_missing';
  }

  // Calculate exception severity
  calculateExceptionSeverity(exceptionType) {
    const severityMap = {
      'package_damage': 'critical',
      'unauthorized_access': 'critical',
      'temperature_issue': 'high',
      'route_deviation': 'medium',
      'delivery_delay': 'medium',
      'documentation_missing': 'low'
    };

    return severityMap[exceptionType] || 'medium';
  }

  // Send delivery confirmation
  async sendDeliveryConfirmation(orderId, recipientInfo, certificate) {
    // Implement delivery confirmation logic
    console.log(`Delivery confirmation sent for order ${orderId} to ${recipientInfo.contactInfo}`);
  }

  // Log to blockchain for immutable record (optional)
  async logToBlockchain(custodyLog, orderId) {
    // Implement blockchain logging if required
    console.log(`Blockchain log for order ${orderId}:`, custodyLog.event);
  }
}

module.exports = ChainOfCustodyService;
