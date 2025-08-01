const Billing = require('@models/Billing');

module.exports = {
  createBilling: async (req, res) => {
    try {
      const billingData = req.body;
      const newBilling = await Billing.create(billingData);
      res.status(201).json(newBilling);
    } catch (error) {
      console.error('Error creating billing:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  },
  getBilling: async (req, res) => {
    try {
      const billings = await Billing.find();
      res.status(200).json(billings);
    } catch (error) {
      console.error('Error fetching billings:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  },
};
