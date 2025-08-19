const express = require('express');
const router = express.Router();
const Payout = require('@models/Payouts');
const Billing = require('@models/Billing');
const Driver = require('@models/Drivers');
const Order = require('@models/Orders');

const startOfMonth = new Date();
startOfMonth.setDate(1);
startOfMonth.setHours(0, 0, 0, 0);

const endOfMonth = new Date(startOfMonth);
endOfMonth.setMonth(endOfMonth.getMonth() + 1);

module.exports = {
  createPayout: async (req, res) => {
    try {
      const payout = new Payout(req.body);
      await payout.save();
      res.status(201).json(payout);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  getAllPayout: async (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    try {
      const payouts = await Payout.find()
        .populate('driver')
        .skip(skip)
        .limit(limitNum)
        .lean();

      payouts.forEach((payout, index) => {
        payout.index = skip + index + 1;
        delete payout.__v;
      });

      const totalPayouts = await Payout.countDocuments();
      const totalPages = Math.ceil(totalPayouts / limitNum);

      res.status(200).json({
        status: true,
        data: payouts,
        totalPayouts,
        totalPages,
        limit: limitNum,
        currentPage: pageNum,
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  getPayout: async (req, res) => {
    try {
      const payout = await Payout.findById(req.params.id);
      if (!payout) {
        return res.status(404).json({ error: 'Payout not found' });
      }
      res.json(payout);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  updatePayout: async (req, res) => {
    try {
      const payout = await Payout.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
      });
      if (!payout) {
        return res.status(404).json({ error: 'Payout not found' });
      }
      res.json(payout);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  deletePayout: async (req, res) => {
    try {
      const payout = await Payout.findByIdAndDelete(req.params.id);
      if (!payout) {
        return res.status(404).json({ error: 'Payout not found' });
      }
      res.json({ message: 'Payout deleted successfully' });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  // Invoice dashboard
  getInvoiceDashboard: async (req, res) => {
    try {
      // Date range: current month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const endOfMonth = new Date(startOfMonth);
      endOfMonth.setMonth(endOfMonth.getMonth() + 1);

      // Stats queries
      const totalPayouts = await Payout.countDocuments();
      const totalDrivers = await Driver.countDocuments();
      const totalDeliveries = await Order.countDocuments({
        status: 'Delivered',
      });

      const totalPaidAmount = await Payout.aggregate([
        { $match: { status: 'Paid' } },
        { $group: { _id: null, total: { $sum: '$totalPayout' } } },
      ]);

      const totalPaidThisMonthAmount = await Payout.aggregate([
        {
          $match: {
            status: 'Paid',
            createdAt: { $gte: startOfMonth, $lt: endOfMonth },
          },
        },
        { $group: { _id: null, total: { $sum: '$totalPayout' } } },
      ]);

      const totalBilledThisMonth = await Billing.aggregate([
        { $match: { createdAt: { $gte: startOfMonth, $lt: endOfMonth } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]);

      const outstandingInvoices = await Billing.aggregate([
        { $match: { status: 'Unpaid' } },
        { $count: 'total' },
      ]);

      const clientWiseReceivables = await Billing.aggregate([
        { $match: { status: 'Unpaid' } },
        { $group: { _id: '$clientId', total: { $sum: '$amount' } } },
      ]);

      res.status(200).json({
        status: true,
        data: {
          totalPayouts,
          totalPaidAmount: totalPaidAmount[0]?.total || 0,
          totalPaidThisMonth: totalPaidThisMonthAmount[0]?.total || 0,
          totalBilledThisMonth: totalBilledThisMonth[0]?.total || 0,
          outstandingInvoices: outstandingInvoices[0]?.total || 0,
          clientWiseReceivables,
          totalDrivers,
          totalDeliveries,
        },
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },
};
