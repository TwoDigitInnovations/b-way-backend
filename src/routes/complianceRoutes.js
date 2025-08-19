const express = require('express');
const router = express.Router();
const multer = require('multer');
const complianceController = require('../controllers/complianceController');
const auth = require('../middlewares/authMiddleware');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow common document and image formats
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, images, and office documents are allowed.'), false);
    }
  }
});

router.post('/', auth(), complianceController.createComplianceReport);
router.get('/', auth(), complianceController.getComplianceReports);
router.get('/dashboard', auth(), complianceController.getComplianceDashboard); // cloudwatch
router.get('/:id', auth(), complianceController.getComplianceReportById);
router.put('/:id', auth(), complianceController.updateComplianceReport);
router.delete('/:id', auth(), complianceController.deleteComplianceReport);

router.post('/:reportId/temperature-log', auth(), complianceController.addTemperatureLog);
router.post('/:reportId/custody-log', auth(), complianceController.addCustodyLog);
router.post('/:reportId/exception', auth(), complianceController.addException);
router.post('/:reportId/evidence', 
  auth(), 
  upload.single('document'), 
  complianceController.uploadEvidence
);
router.get('/:reportId/audit-package', auth(), complianceController.generateAuditPackage);

module.exports = router;
