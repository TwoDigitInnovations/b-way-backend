const Billing = require('@models/Billing');
const Order = require('@models/Orders');

const courierGen = () => {
  let name = 'COURIER_';
  return name + Math.floor(Math.random() * 1000);
};

module.exports = {
  createBilling: async (req, res) => {
    try {
      const {
        order,
        hospital,
        courier = courierGen(),
        invoiceDate,
        dueDate,
        amount,
        status,
      } = req.body;

      const billingData = {
        order,
        hospital,
        courier,
        invoiceDate,
        dueDate,
        amount,
        status,
      };

      const newBilling = await Billing.create(billingData);
      res.status(201).json(newBilling);
    } catch (error) {
      console.error('Error creating billing:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  },
  getBilling: async (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    try {
      const billings = await Billing.find()
        .populate('order')
        .populate('hospital')
        .sort({createdAt: -1})
        .skip(skip)
        .limit(limitNum)
        .lean();

      billings.forEach((billing, index) => {
        billing.index = skip + index + 1;
      });

      const totalBillings = await Billing.countDocuments();
      const totalPages = Math.ceil(totalBillings / limitNum);

      res.status(200).json({ 
        status: true,
        data: billings,
        totalPages,
        totalBillings,
        limit: limitNum,
        currentPage: pageNum
      });
    } catch (error) {
      console.error('Error fetching billings:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  },
  getBillingById: async (req, res) => {
    const { id } = req.params;

    try {
      const billing = await Billing.findById(id)
        .populate('order')
        .populate('hospital')
        .lean();

      if (!billing) {
        return res.status(404).json({ message: 'Billing not found' });
      }

      res.status(200).json(billing);
    } catch (error) {
      console.error('Error fetching billing by ID:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  },
  updateBilling: async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;

    try {
      const updatedBilling = await Billing.findByIdAndUpdate(id, updateData, { new: true });
      if (!updatedBilling) {
        return res.status(404).json({ message: 'Billing not found' });
      }
      res.status(200).json(updatedBilling);
    } catch (error) {
      console.error('Error updating billing:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  },
  deleteBilling: async (req, res) => {
    const { id } = req.params;

    try {
      const deletedBilling = await Billing.findByIdAndDelete(id);
      if (!deletedBilling) {
        return res.status(404).json({ message: 'Billing not found' });
      }
      res.status(200).json({ message: 'Billing deleted successfully' });
    } catch (error) {
      console.error('Error deleting billing:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  },
}