const router = require('express').Router();
const payoutController = require('@controllers/payoutController');
const auth = require('@middlewares/authMiddleware');

router.post('/', payoutController.createPayout);
router.get('/', payoutController.getAllPayout);
router.get('/stats', payoutController.getInvoiceDashboard);
router.get('/:id', payoutController.getPayout);
router.put('/:id', payoutController.updatePayout);
router.delete('/:id', payoutController.deletePayout);

module.exports = router;
