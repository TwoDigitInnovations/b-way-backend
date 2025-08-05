const Item = require('@models/items');

module.exports = {
  createItem: async (req, res) => {
    try {
      const {
        name,
        description,
        price,
        category,
        stock,
        dispatcher,
        pickupLocation,
      } = req.body;

      if (
        !name ||
        !description ||
        !price ||
        !category ||
        !stock ||
        !pickupLocation
      ) {
        return res
          .status(400)
          .json({ status: false, message: 'All fields are required' });
      }

      const item = new Item({
        name,
        description,
        price,
        category,
        stock,
        dispatcher: dispatcher || req.user._id,
        pickupLocation,
      });

      await item.save();

      res.status(201).json({
        status: true,
        message: 'Item created successfully',
        data: item,
      });
    } catch (error) {
      console.error('Error fetching items:', error);
      res.status(500).json({ status: false, message: error.message });
    }
  },

  getItems: async (req, res) => {
    try {
      const { page = 1, limit = 10 } = req.query;
      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);
      const skip = (pageNum - 1) * limitNum;

      const { role, _id } = req.user; 
      const query = role === 'DISPATCHER' ? { dispatcher: _id } : {};
      console.log('Query:', query);

      const [items, total] = await Promise.all([
        Item.find(query)
          .populate('dispatcher', 'name email')
          .sort({ createdAt: -1 })
          .select('-__v')
          .skip(skip)
          .limit(limitNum),
        Item.countDocuments(query),

      ]);

      const data = items.map((item, index) => ({
        ...item.toObject(),
        index: skip + index + 1,
      }));

      const totalPages = Math.ceil(total / limitNum);

      res.status(200).json({
        status: true,
        data,
        total,
        totalPages,
        page: pageNum,
        limit: limitNum,
      });
    } catch (error) {
      console.error('Error fetching items', error);
      res.status(500).json({ status: false, message: error.message });
    }
  },
  getOnlyItems: async (req, res) => {
    try {
      const items = await Item.find()
        .populate('dispatcher', 'name email')
        .select('_id name price pickupLocation')
        .lean();

      res.status(200).json({
        status: true,
        data: items,
      });
    } catch (error) {
      res.status(500).json({ status: false, message: error.message });
    }
  },
  getItemById: async (req, res) => {
    try {
      const { id } = req.params;
      const item = await Item.findById(id)
        .populate('dispatcher', 'name email')
        .exec();

      if (!item) {
        return res
          .status(404)
          .json({ status: false, message: 'Item not found' });
      }

      res.status(200).json({
        status: true,
        message: 'Item retrieved successfully',
        data: item,
      });
    } catch (error) {
      res.status(500).json({ status: false, message: error.message });
    }
  },
  updateItem: async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const item = await Item.findByIdAndUpdate(id, updates, {
        new: true,
      }).populate('dispatcher', 'name email');

      if (!item) {
        return res
          .status(404)
          .json({ status: false, message: 'Item not found' });
      }

      res.status(200).json({
        status: true,
        message: 'Item updated successfully',
        data: item,
      });
    } catch (error) {
      res.status(500).json({ status: false, message: error.message });
    }
  },
  deleteItem: async (req, res) => {
    try {
      const { id } = req.params;

      const item = await Item.findByIdAndDelete(id);

      if (!item) {
        return res
          .status(404)
          .json({ status: false, message: 'Item not found' });
      }

      res.status(200).json({
        status: true,
        message: 'Item deleted successfully',
      });
    } catch (error) {
      res.status(500).json({ status: false, message: error.message });
    }
  },
};
