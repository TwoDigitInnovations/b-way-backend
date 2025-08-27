const dashboardController = require("@controllers/dashboardController");
const express = require("express");
const router = express.Router();


router.get("/stats", dashboardController.dashboard);

module.exports = router;