const router = require("express").Router();
const routeController = require("@controllers/routeController");

router.post("/create", routeController.createRoute);
router.get("/", routeController.getRoutes);
router.put("/:id", routeController.updateRoute);
router.delete("/:id", routeController.deleteRoute);

module.exports = router;
