const authRoutes = require("@routes/authRoutes");

module.exports = (app) => {
  app.use('/auth', authRoutes);
  app.use('/order', require("@routes/orderRoute"));
};
