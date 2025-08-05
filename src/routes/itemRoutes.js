const router = require('express').Router();
const itemController = require('@controllers/itemController');
const auth = require('@middlewares/authMiddleware');

router.post('/create', auth(), itemController.createItem);
router.get('/', auth(), itemController.getItems);
router.get('/all', itemController.getOnlyItems);
router.get('/:id', itemController.getItemById);
router.put('/:id', itemController.updateItem);
router.delete('/:id', itemController.deleteItem);

module.exports = router;
