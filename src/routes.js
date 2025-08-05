const authRoutes = require("@routes/authRoutes");

module.exports = (app) => {
  app.use('/auth', authRoutes);
  app.use('/order', require("@routes/orderRoute"));
  app.use('/route', require("@routes/routeRoutes"));
  app.use('/driver', require("@routes/driverRoutes"));
};
