const express = require('express');
const router = express.Router();
const billingController = require('../controllers/BillingController');
const auth = require('../middlewares/authMiddleware');

router.post('/', auth(), billingController.createBilling);
router.get('/', auth(), billingController.getBilling);
router.get('/:id', auth(), billingController.getBillingById);
router.put('/:id', auth(), billingController.updateBilling);
router.delete('/:id', auth(), billingController.deleteBilling);

module.exports = router;