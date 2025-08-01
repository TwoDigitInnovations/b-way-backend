const router = require("express").Router();
const orderController = require("@controllers/orderController");
const auth = require("@middlewares/authMiddleware");

router.post("/create", auth(), orderController.createOrder);
router.get("/", auth(), orderController.getOrders);
router.get("/:id", auth(), orderController.getOrderById);
router.put("/:id", auth(), orderController.updateOrder);
router.delete("/:id", auth(), orderController.deleteOrder);

module.exports = router;