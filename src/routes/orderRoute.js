const router = require("express").Router();
const orderController = require("@controllers/orderController");

router.post("/create", orderController.createOrder);
router.get("/", orderController.getOrders);

module.exports = router;