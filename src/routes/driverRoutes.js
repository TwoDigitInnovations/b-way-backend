const router = require("express").Router();
const driverController = require("@controllers/driverController");

router.post("/create", driverController.createDriver);
router.get("/", driverController.getDrivers);
router.put("/:driverId", driverController.updateDriver);
router.delete("/:driverId", driverController.deleteDriver);
router.get("/:driverId", driverController.getDriverById);
router.get("/:driverId/routes", driverController.getDriverRoutes);
router.get("/:driverId/orders", driverController.getDriverOrders);
router.post("/:driverId/assign-route", driverController.assignRouteToDriver);
router.post("/:driverId/unassign-route", driverController.unassignRouteFromDriver);

module.exports = router;