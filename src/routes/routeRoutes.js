const router = require("express").Router();
const routeController = require("@controllers/routeController");
const auth = require("@middlewares/authMiddleware");

router.post("/create", auth(), routeController.createRoute);
router.get("/", auth(), routeController.getRoutes);
router.put("/:id", auth(), routeController.updateRoute);
router.delete("/:id", auth(), routeController.deleteRoute);
router.get("/:id", auth(), routeController.getRouteById);

module.exports = router;
