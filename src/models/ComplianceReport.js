const mongoose = require('mongoose');

// temparatuer
const temperatureLogSchema = new mongoose.Schema({
  timestamp: { type: Date, required: true },
  temperature: { type: Number, required: true }, // celsiuss
  humidity: { type: Number },
  sensorId: { type: String, required: true },
  location: { type: String }, 
  isWithinRange: { type: Boolean, required: true },
  requiredMinTemp: { type: Number, required: true },
  requiredMaxTemp: { type: Number, required: true },
  alertTriggered: { type: Boolean, default: false }
});

// Chain of custody
const custodyLogSchema = new mongoose.Schema({
  timestamp: { type: Date, required: true },
  event: { 
    type: String, 
    enum: ['pickup', 'in_transit', 'delivery', 'return', 'exception'],
    required: true 
  },
  location: {
    address: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  handlerInfo: {
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    driverName: String,
    signature: String, // base64 encoded
    vehicleId: String,
    licensePlate: String
  },
  recipient: {
    name: String,
    title: String,
    signature: String,
    contactInfo: String
  },
  notes: String,
  photosUrls: [String], // S3 URLs for delivery photos
  gpsCoordinates: {
    latitude: Number,
    longitude: Number
  }
});

// Exception tracking for violations and issues
const exceptionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['temperature_excursion', 'route_deviation', 'delivery_delay', 'package_damage', 'unauthorized_access', 'documentation_missing'],
    required: true
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    required: true
  },
  description: { type: String, required: true },
  detectedAt: { type: Date, required: true },
  resolvedAt: Date,
  resolutionActions: [String],
  affectedProducts: [String],
  impactAssessment: String,
  rootCause: String,
  preventiveActions: [String],
  reportedToRegulator: { type: Boolean, default: false },
  regulatorReference: String
});

// Main compliance report schema
const complianceSchema = new mongoose.Schema({
  reportId: {
    type: String,
    unique: true,
    index: true
  },
  date: {
    type: Date,
    required: true
  },
  reportPeriod: {
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true }
  },
  
  // Regulation types and compliance categories
  regulationType: {
    type: [String],
    enum: ['HIPAA', 'FDA'],
    required: true
  },
  complianceCategories: {
    type: [String],
    enum: ['patient_data_protection', 'cold_chain', 'chain_of_custody', 'controlled_substances', 'hazardous_materials', 'delivery_validation'],
    required: true
  },

  // Audit and violation tracking
  totalDeliveries: {
    type: Number,
    required: true,
    min: 0
  },
  audit: {
    type: Number,
    required: true,
    min: 0
  },
  violation: {
    type: Number,
    required: true,
    min: 0
  },
  violationType: {
    type: String,
    required: true
  },
  complianceRate: {
    type: Number,
    min: 0,
    max: 100
  },

  // Temperature and cold-chain
  temperatureLogs: [temperatureLogSchema],
  coldChainCompliance: {
    totalMonitoredDeliveries: Number,
    temperatureExcursions: Number,
    averageTemperature: Number,
    minRecordedTemp: Number,
    maxRecordedTemp: Number,
    sensorCoveragePercentage: Number
  },

  // Chain of custody
  custodyLogs: [custodyLogSchema],
  chainOfCustodyCompliance: {
    completeDocumentationRate: Number,
    signatureCompletionRate: Number,
    deliveryConfirmationRate: Number,
    gpsTrackingCoverage: Number
  },

  // HIPAA
  hipaaCompliance: {
    patientDataEncrypted: { type: Boolean, default: true },
    accessLogsComplete: { type: Boolean, default: true },
    unauthorizedAccessAttempts: { type: Number, default: 0 },
    dataBreachIncidents: { type: Number, default: 0 },
    businessAssociateAgreements: { type: Boolean, default: true },
    auditTrailComplete: { type: Boolean, default: true }
  },

  // FDA/USP
  fdaCompliance: {
    drugPedigreeComplete: { type: Boolean, default: true },
    serialNumberVerification: { type: Boolean, default: true },
    temperatureMapping: { type: Boolean, default: true },
    qualificationDocuments: { type: Boolean, default: true },
    adverseEventReporting: { type: Boolean, default: true }
  },

  // Exception and violation
  exceptions: [exceptionSchema],
  
  // Associated orders and routes
  associatedOrders: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  }],
  associatedRoutes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Route'
  }],

  // Audit and certification information
  auditInfo: {
    auditorName: String,
    auditFirm: String,
    auditDate: Date,
    certificationLevel: {
      type: String,
      enum: ['compliant', 'non_compliant', 'conditionally_compliant']
    },
    nextAuditDue: Date,
    auditScore: Number
  },

  // Evidence and documentation
  evidenceDocuments: [{
    documentType: {
      type: String,
      enum: ['temperature_logs', 'delivery_receipts', 'signatures', 'photos', 'certificates', 'training_records', 'sop_documents']
    },
    fileName: String,
    s3Url: String,
    uploadedAt: Date,
    description: String
  }],

  // Report status and workflow
  status: {
    type: String,
    enum: ['draft', 'pending_review', 'approved', 'published', 'archived'],
    default: 'draft'
  },
  
  // Approval workflow
  reviewedBy: {
    name: String,
    title: String,
    date: Date,
    signature: String
  },
  approvedBy: {
    name: String,
    title: String,
    date: Date,
    signature: String
  },

  // Regulatory submission
  submittedToRegulators: [{
    regulator: String,
    submissionDate: Date,
    confirmationNumber: String,
    status: String
  }],

  // Risk assessment
  riskAssessment: {
    overallRiskLevel: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical']
    },
    identifiedRisks: [String],
    mitigationActions: [String],
    residualRisk: String
  },

  // Analytics and metrics
  metrics: {
    onTimeDeliveryRate: Number,
    temperatureComplianceRate: Number,
    documentationCompleteness: Number,
    customerSatisfactionScore: Number,
    regulatoryInspectionReadiness: Number
  }
}, {
  timestamps: true
});

complianceSchema.pre('save', async function (next) {
  try {
    if (this.isNew && !this.reportId) {
      const Counter = mongoose.model('Counter');
      const counter = await Counter.findByIdAndUpdate(
        { _id: 'complianceReportId' },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      this.reportId = `CR-${String(counter.seq).padStart(6, '0')}`;
    }
    
    // Calculate compliance rate
    if (this.audit > 0) {
      this.complianceRate = ((this.audit - this.violation) / this.audit) * 100;
    }
    
    next();
  } catch (err) {
    next(err);
  }
});

complianceSchema.index({ date: -1 });
complianceSchema.index({ regulationType: 1 });
complianceSchema.index({ status: 1 });
complianceSchema.index({ 'reportPeriod.startDate': 1, 'reportPeriod.endDate': 1 });

const ComplianceReport = mongoose.model('ComplianceReport', complianceSchema);

module.exports = ComplianceReport;
