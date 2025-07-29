const router = require("express").Router();
const orderController = require("@controllers/orderController");

router.post("/create", orderController.createOrder);
router.get("/", orderController.getOrders);
router.get("/:id", orderController.getOrderById);
router.put("/:id", orderController.updateOrder);
router.delete("/:id", orderController.deleteOrder);

module.exports = router;