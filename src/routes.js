const authRoutes = require("@routes/authRoutes");

module.exports = (app) => {
  app.use('/auth', authRoutes);
};
