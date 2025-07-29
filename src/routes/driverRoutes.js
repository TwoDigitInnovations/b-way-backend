const router = require("express").Router();
const driverController = require("@controllers/driverController");

router.post("/create", driverController.createDriver);
router.get("/", driverController.getDrivers);
router.put("/:driverId", driverController.updateDriver);
router.delete("/:driverId", driverController.deleteDriver);

module.exports = router;