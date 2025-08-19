const ComplianceReport = require('../models/ComplianceReport');
const Order = require('../models/Orders');
const Route = require('../models/Routes');
const AWS = require('aws-sdk');

// Configure AWS S3 for document storage
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1'
});

// Helper function to generate audit-ready evidence package
const generateAuditEvidence = (report) => {
  return {
    reportSummary: {
      reportId: report.reportId,
      generatedAt: new Date(),
      period: report.reportPeriod,
      complianceRate: report.complianceRate,
      totalDeliveries: report.totalDeliveries,
      violations: report.violation
    },
    hipaaCompliance: report.hipaaCompliance,
    fdaCompliance: report.fdaCompliance,
    temperatureEvidence: {
      excursions: report.temperatureLogs.filter(log => !log.isWithinRange),
      averageTemp: report.coldChainCompliance?.averageTemperature,
      coverage: report.coldChainCompliance?.sensorCoveragePercentage
    },
    chainOfCustody: {
      completionRate: report.chainOfCustodyCompliance?.completeDocumentationRate,
      signatureRate: report.chainOfCustodyCompliance?.signatureCompletionRate,
      deliveryConfirmation: report.chainOfCustodyCompliance?.deliveryConfirmationRate
    },
    exceptions: report.exceptions.map(ex => ({
      type: ex.type,
      severity: ex.severity,
      description: ex.description,
      detectedAt: ex.detectedAt,
      resolved: !!ex.resolvedAt,
      actions: ex.resolutionActions
    })),
    riskAssessment: report.riskAssessment,
    evidenceDocuments: report.evidenceDocuments
  };
};

const assessComplianceRisk = (report) => {
  let riskScore = 0;
  const risks = [];
  
  // Temperature compliance risk
  if (report.coldChainCompliance?.temperatureExcursions > 0) {
    riskScore += 20;
    risks.push('Temperature excursions detected in cold chain');
  }
  
  // Documentation completeness risk
  if (report.chainOfCustodyCompliance?.completeDocumentationRate < 95) {
    riskScore += 15;
    risks.push('Incomplete chain of custody documentation');
  }
  
  // HIPAA compliance risk
  if (!report.hipaaCompliance?.patientDataEncrypted || report.hipaaCompliance?.unauthorizedAccessAttempts > 0) {
    riskScore += 25;
    risks.push('HIPAA compliance issues detected');
  }
  
  // Violation rate risk
  if (report.complianceRate < 90) {
    riskScore += 30;
    risks.push('High violation rate detected');
  }
  
  // Critical risk
  const criticalExceptions = report?.exceptions?.filter(ex => ex.severity === 'critical');
  if (criticalExceptions?.length > 0) {
    riskScore += 40;
    risks.push('Critical exceptions require immediate attention');
  }
  
  let riskLevel = 'low';
  if (riskScore >= 50) riskLevel = 'critical';
  else if (riskScore >= 30) riskLevel = 'high';
  else if (riskScore >= 15) riskLevel = 'medium';
  
  return { riskLevel, riskScore, identifiedRisks: risks };
};

module.exports = {
  createComplianceReport: async (req, res) => {
    try {
      const reportData = req.body.reportData || req.body;
      
      if (!reportData.associatedOrders && reportData.reportPeriod) {
        const orders = await Order.find({
          createdAt: {
            $gte: new Date(reportData.reportPeriod.startDate),
            $lte: new Date(reportData.reportPeriod.endDate)
          }
        }).select('_id');
        reportData.associatedOrders = orders.map(order => order._id);
        reportData.totalDeliveries = orders.length;
      }
      
      const riskAssessment = assessComplianceRisk(reportData);
      reportData.riskAssessment = riskAssessment;
      
      const report = new ComplianceReport(reportData);
      await report.save();
      
      res.status(201).json({
        status: true,
        message: 'Compliance report created successfully',
        data: report,
        auditEvidence: generateAuditEvidence(report)
      });
    } catch (error) {
      console.error('Error creating compliance report:', error);
      res.status(500).json({ status: false, message: error.message });
    }
  },

  getComplianceReports: async (req, res) => {
    try {
      const {
        page = 1,
        limit = 10,
        regulationType,
        status,
        startDate,
        endDate,
        riskLevel
      } = req.query;

      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);
      const skip = (pageNum - 1) * limitNum;

      // Build query filters
      const query = {};
      
      if (regulationType) {
        query.regulationType = { $in: regulationType.split(',') };
      }
      
      if (status) {
        query.status = status;
      }
      
      if (startDate && endDate) {
        query.date = {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        };
      }
      
      if (riskLevel) {
        query['riskAssessment.overallRiskLevel'] = riskLevel;
      }

      const reports = await ComplianceReport.find(query)
        .populate('associatedOrders', 'orderId status')
        .populate('associatedRoutes', 'routeName')
        .sort({ date: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean();

      const totalReports = await ComplianceReport.countDocuments(query);
      const totalPages = Math.ceil(totalReports / limitNum);

      const transformedReports = reports.map((report, index) => ({
        _id: report._id,
        no: skip + index + 1,
        reportId: report.reportId,
        date: new Date(report.date).toLocaleDateString(),
        regulationType: Array.isArray(report.regulationType) ? report.regulationType.join(', ') : report.regulationType,
        audit: report.audit,
        violation: report.violation,
        violationType: report.violationType,
        status: report.status,
        complianceRate: report.complianceRate,
        riskLevel: report.riskAssessment?.overallRiskLevel || 'low',
        associatedOrders: report.associatedOrders?.length || 0,
        createdAt: report.createdAt,
        reportPeriod: report.reportPeriod,
        hipaaCompliance: report.hipaaCompliance,
        fdaCompliance: report.fdaCompliance,
        coldChainCompliance: report.coldChainCompliance,
        chainOfCustodyCompliance: report.chainOfCustodyCompliance,
        complianceCategories: report.complianceCategories,
        totalDeliveries: report.totalDeliveries
      }));

      res.status(200).json({
        status: true,
        currentPage: pageNum,
        totalPages,
        totalReports,
        limit: limitNum,
        data: transformedReports
      });
    } catch (error) {
      console.error('Error fetching compliance reports:', error);
      res.status(500).json({ status: false, message: error.message });
    }
  },

  getComplianceReportById: async (req, res) => {
    try {
      const report = await ComplianceReport.findById(req.params.id)
        .populate('associatedOrders', 'orderId status deliveryLocation user')
        .populate('associatedRoutes', 'routeName startLocation endLocation')
        .populate({
          path: 'associatedOrders',
          populate: {
            path: 'user',
            select: 'name email'
          }
        });

      if (!report) {
        return res.status(404).json({
          status: false,
          message: 'Compliance report not found'
        });
      }

      const auditEvidence = generateAuditEvidence(report);

      res.status(200).json({
        status: true,
        data: report,
        auditEvidence
      });
    } catch (error) {
      console.error('Error fetching compliance report:', error);
      res.status(500).json({ status: false, message: error.message });
    }
  },

  updateComplianceReport: async (req, res) => {
    try {
      const updateData = req.body.updateData || req.body;
      
      if (updateData.exceptions || updateData.violation || updateData.coldChainCompliance) {
        const riskAssessment = assessComplianceRisk(updateData);
        updateData.riskAssessment = riskAssessment;
      }

      const report = await ComplianceReport.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true, runValidators: true }
      );

      if (!report) {
        return res.status(404).json({
          status: false,
          message: 'Compliance report not found'
        });
      }

      res.status(200).json({
        status: true,
        message: 'Compliance report updated successfully',
        data: report
      });
    } catch (error) {
      console.error('Error updating compliance report:', error);
      res.status(500).json({ status: false, message: error.message });
    }
  },

  // Delete compliance report
  deleteComplianceReport: async (req, res) => {
    try {
      const report = await ComplianceReport.findByIdAndDelete(req.params.id);
      
      if (!report) {
        return res.status(404).json({
          status: false,
          message: 'Compliance report not found'
        });
      }

      res.status(200).json({
        status: true,
        message: 'Compliance report deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting compliance report:', error);
      res.status(500).json({ status: false, message: error.message });
    }
  },

  // Add temperature log entry
  addTemperatureLog: async (req, res) => {
    try {
      const { reportId } = req.params;
      const temperatureData = req.body;

      // Validate temperature against required range
      temperatureData.isWithinRange = 
        temperatureData.temperature >= temperatureData.requiredMinTemp &&
        temperatureData.temperature <= temperatureData.requiredMaxTemp;

      const report = await ComplianceReport.findByIdAndUpdate(
        reportId,
        { $push: { temperatureLogs: temperatureData } },
        { new: true }
      );

      if (!report) {
        return res.status(404).json({
          status: false,
          message: 'Compliance report not found'
        });
      }

      // Update cold chain compliance metrics
      const temperatureLogs = report.temperatureLogs;
      const excursions = temperatureLogs.filter(log => !log.isWithinRange);
      const avgTemp = temperatureLogs.reduce((sum, log) => sum + log.temperature, 0) / temperatureLogs.length;

      await ComplianceReport.findByIdAndUpdate(reportId, {
        $set: {
          'coldChainCompliance.temperatureExcursions': excursions.length,
          'coldChainCompliance.averageTemperature': avgTemp,
          'coldChainCompliance.minRecordedTemp': Math.min(...temperatureLogs.map(log => log.temperature)),
          'coldChainCompliance.maxRecordedTemp': Math.max(...temperatureLogs.map(log => log.temperature))
        }
      });

      res.status(200).json({
        status: true,
        message: 'Temperature log added successfully',
        excursionDetected: !temperatureData.isWithinRange
      });
    } catch (error) {
      console.error('Error adding temperature log:', error);
      res.status(500).json({ status: false, message: error.message });
    }
  },

  // Add chain of custody log entry
  addCustodyLog: async (req, res) => {
    try {
      const { reportId } = req.params;
      const custodyData = req.body;

      const report = await ComplianceReport.findByIdAndUpdate(
        reportId,
        { $push: { custodyLogs: custodyData } },
        { new: true }
      );

      if (!report) {
        return res.status(404).json({
          status: false,
          message: 'Compliance report not found'
        });
      }

      res.status(200).json({
        status: true,
        message: 'Chain of custody log added successfully'
      });
    } catch (error) {
      console.error('Error adding custody log:', error);
      res.status(500).json({ status: false, message: error.message });
    }
  },

  // Add exception/violation
  addException: async (req, res) => {
    try {
      const { reportId } = req.params;
      const exceptionData = req.body;

      const report = await ComplianceReport.findByIdAndUpdate(
        reportId,
        { 
          $push: { exceptions: exceptionData },
          $inc: { violation: 1 }
        },
        { new: true }
      );

      if (!report) {
        return res.status(404).json({
          status: false,
          message: 'Compliance report not found'
        });
      }

      // Recalculate risk assessment
      const riskAssessment = assessComplianceRisk(report);
      await ComplianceReport.findByIdAndUpdate(reportId, {
        $set: { riskAssessment }
      });

      res.status(200).json({
        status: true,
        message: 'Exception added successfully',
        criticalAlert: exceptionData.severity === 'critical'
      });
    } catch (error) {
      console.error('Error adding exception:', error);
      res.status(500).json({ status: false, message: error.message });
    }
  },

  // Generate audit-ready compliance package
  generateAuditPackage: async (req, res) => {
    try {
      const { reportId } = req.params;
      const { format = 'json' } = req.query;

      const report = await ComplianceReport.findById(reportId)
        .populate('associatedOrders')
        .populate('associatedRoutes');

      if (!report) {
        return res.status(404).json({
          status: false,
          message: 'Compliance report not found'
        });
      }

      const auditPackage = {
        metadata: {
          generatedAt: new Date(),
          reportId: report.reportId,
          format,
          version: '1.0'
        },
        executiveSummary: {
          complianceRate: report.complianceRate,
          totalDeliveries: report.totalDeliveries,
          violations: report.violation,
          riskLevel: report.riskAssessment?.overallRiskLevel,
          period: report.reportPeriod
        },
        regulatoryCompliance: {
          hipaa: report.hipaaCompliance,
          fda: report.fdaCompliance,
          regulations: report.regulationType
        },
        operationalEvidence: {
          temperatureControl: {
            excursions: report.temperatureLogs.filter(log => !log.isWithinRange),
            compliance: report.coldChainCompliance,
            sensorData: report.temperatureLogs.slice(0, 100) // Limit for size
          },
          chainOfCustody: {
            completionRate: report.chainOfCustodyCompliance,
            logs: report.custodyLogs.slice(0, 50) // Limit for size
          }
        },
        exceptions: report.exceptions,
        evidenceDocuments: report.evidenceDocuments,
        certifications: report.auditInfo,
        digitalSignatures: {
          reviewer: report.reviewedBy,
          approver: report.approvedBy
        }
      };

      if (format === 'pdf') {
        // In a real implementation, you would generate a PDF here
        res.status(200).json({
          status: true,
          message: 'PDF generation would be implemented here',
          downloadUrl: 'placeholder-for-pdf-url'
        });
      } else {
        res.status(200).json({
          status: true,
          auditPackage
        });
      }
    } catch (error) {
      console.error('Error generating audit package:', error);
      res.status(500).json({ status: false, message: error.message });
    }
  },

  // Upload evidence document
  uploadEvidence: async (req, res) => {
    try {
      const { reportId } = req.params;
      const { documentType, description } = req.body;
      
      if (!req.file) {
        return res.status(400).json({
          status: false,
          message: 'No file uploaded'
        });
      }

      // Upload to S3 (placeholder - implement actual S3 upload)
      const s3Key = `compliance-evidence/${reportId}/${Date.now()}-${req.file.originalname}`;
      const s3Url = `https://your-bucket.s3.amazonaws.com/${s3Key}`;

      const evidenceDoc = {
        documentType,
        fileName: req.file.originalname,
        s3Url,
        uploadedAt: new Date(),
        description
      };

      const report = await ComplianceReport.findByIdAndUpdate(
        reportId,
        { $push: { evidenceDocuments: evidenceDoc } },
        { new: true }
      );

      if (!report) {
        return res.status(404).json({
          status: false,
          message: 'Compliance report not found'
        });
      }

      res.status(200).json({
        status: true,
        message: 'Evidence document uploaded successfully',
        document: evidenceDoc
      });
    } catch (error) {
      console.error('Error uploading evidence:', error);
      res.status(500).json({ status: false, message: error.message });
    }
  },

  // Get compliance dashboard metrics
  getComplianceDashboard: async (req, res) => {
    try {
      const { period = '30' } = req.query; // days
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(period));

      const reports = await ComplianceReport.find({
        date: { $gte: startDate }
      });

      const totalReports = reports.length;
      const avgComplianceRate = reports.reduce((sum, report) => sum + (report.complianceRate || 0), 0) / totalReports;
      const totalViolations = reports.reduce((sum, report) => sum + (report.violation || 0), 0);
      const criticalIssues = reports.reduce((sum, report) => 
        sum + (report.exceptions?.filter(ex => ex.severity === 'critical').length || 0), 0);

      const riskDistribution = reports.reduce((dist, report) => {
        const risk = report.riskAssessment?.overallRiskLevel || 'low';
        dist[risk] = (dist[risk] || 0) + 1;
        return dist;
      }, {});

      const temperatureExcursions = reports.reduce((sum, report) => 
        sum + (report.coldChainCompliance?.temperatureExcursions || 0), 0);

      res.status(200).json({
        status: true,
        dashboard: {
          overview: {
            totalReports,
            avgComplianceRate: Math.round(avgComplianceRate * 100) / 100,
            totalViolations,
            criticalIssues,
            period: `${period} days`
          },
          riskDistribution,
          coldChainMetrics: {
            temperatureExcursions,
            avgTemperature: reports.reduce((sum, report) => 
              sum + (report.coldChainCompliance?.averageTemperature || 0), 0) / totalReports
          },
          complianceByRegulation: reports.reduce((reg, report) => {
            if (Array.isArray(report.regulationType)) {
              report.regulationType.forEach(type => {
                reg[type] = (reg[type] || 0) + 1;
              });
            } else if (report.regulationType) {
              reg[report.regulationType] = (reg[report.regulationType] || 0) + 1;
            }
            return reg;
          }, {}),
          trends: {
            complianceRateByDay: [], // Implement time series data
            violationsByType: reports.reduce((types, report) => {
              const type = report.violationType;
              types[type] = (types[type] || 0) + 1;
              return types;
            }, {})
          }
        }
      });
    } catch (error) {
      console.error('Error fetching compliance dashboard:', error);
      res.status(500).json({ status: false, message: error.message });
    }
  }
};
