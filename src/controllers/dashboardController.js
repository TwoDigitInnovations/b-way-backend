const User = require('../models/User');
const Billing = require('../models/Billing');
const Item = require('../models/items');
const Route = require('../models/Routes');
const Compliance = require('../models/ComplianceReport');
const Order = require('../models/Orders');

module.exports = {
  dashboard: async (req, res) => {
    try {
      const userRole = req.user?.role || 'CLIENT';

      const userCount = await User.countDocuments();
      const driverCount = await User.countDocuments({ role: 'DRIVER' });
      const partnerCount = await User.countDocuments({ role: 'CLIENT' });
      const billingCount = await Billing.countDocuments();
      const itemCount = await Item.countDocuments();
      const routeCount = await Route.countDocuments();
      const complianceCount = await Compliance.countDocuments();

      const activeRoutes = await Route.countDocuments({ status: 'active' });
      const ordersInTransit = await Order.countDocuments({ status: 'in_transit' });
      const deliveryCompleted = await Order.countDocuments({ status: 'delivered' });
      const missingDelivery = await Order.countDocuments({ 
        $or: [
          { status: 'delayed' },
          { status: 'missing' }
        ]
      });
      
      const proofOfDelivery = await Order.countDocuments({ 
        status: 'delivered',
        proofOfDelivery: { $exists: true }
      });

      const availableDrivers = await User.countDocuments({ 
        role: 'DRIVER',
        isActive: true,
        currentStatus: 'available'
      });
      
      const availablePartners = await User.countDocuments({ 
        role: 'CLIENT',
        isActive: true
      });

      const facilities = await User.countDocuments({ role: { $in: ['HOSPITAL', 'CLINIC'] } });

      const complianceAlerts = await Compliance.countDocuments({ 
        status: 'flagged'
      });

      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - 7);
      
      const currentWeekSales = await Billing.aggregate([
        {
          $match: {
            createdAt: { $gte: weekStart },
            status: 'paid'
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' }
          }
        }
      ]);

      const salesThisWeek = currentWeekSales[0]?.total || 0;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todayTotalOrders = await Order.countDocuments({
        createdAt: { $gte: today, $lt: tomorrow }
      });
      
      const todayCompletedOrders = await Order.countDocuments({
        createdAt: { $gte: today, $lt: tomorrow },
        status: 'delivered'
      });

      const dailyWorkCompleted = todayTotalOrders > 0 
        ? Math.round((todayCompletedOrders / todayTotalOrders) * 100)
        : 0;

      const activeRoutesChange = "13% active";
      const salesChange = "7% Up from past week";
      const complianceAlertsCount = `${complianceAlerts} Flagged alerts`;

      res.status(200).json({
        userCount,
        driverCount,
        partnerCount,
        billingCount,
        itemCount,
        routeCount,
        complianceCount,
        
        data: {
          activeRoutes,
          ordersInTransit,
          deliveryCompleted,
          missingDelivery,
          proofOfDelivery,
          availableDrivers,
          availablePartners,
          facilities,
          complianceAlerts,
          salesThisWeek,
          dailyWorkCompleted,
          dailyWorkCompletedPercentage: `${dailyWorkCompleted}%`,
          
          totalOrders: await Order.countDocuments(),
          totalUsers: userCount,
          todayTotalOrders,
          todayCompletedOrders,
          
          activeRoutesChangeText: activeRoutesChange,
          salesChangeText: salesChange,
          complianceAlertsText: complianceAlertsCount
        },
        
        userRole
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};
