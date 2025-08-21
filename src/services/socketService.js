class SocketService {
  constructor() {
    this.io = null;
  }

  init(io) {
    this.io = io;
    console.log('Socket service initialized');
  }

  emitNewOrderToAdmins(order) {
    if (!this.io) {
      console.warn('Socket.IO not initialized');
      return;
    }

    try {
      const adminRoom = this.io.sockets.adapter.rooms.get('admin_room');
      const adminCount = adminRoom ? adminRoom.size : 0;
      
      const clientRoom = this.io.sockets.adapter.rooms.get('client_room');
      const clientCount = clientRoom ? clientRoom.size : 0;
      
      console.log(`Admin room has ${adminCount} connected users`);
      console.log(`Client room has ${clientCount} connected users`);
      
      if (adminCount === 0 && clientCount === 0) {
        console.warn('No admin or client users connected to receive the new order notification');
      }
      
      const notificationData = {
        type: 'NEW_ORDER',
        order: order,
        timestamp: new Date().toISOString(),
        message: `New order ${order.orderId} created by ${order.user?.name || 'Hospital'}`
      };
      
      this.io.to('admin_room').emit('new_order', notificationData);
      console.log(`New order ${order.orderId} emitted to admin room (${adminCount} recipients)`);
      
      this.io.to('client_room').emit('new_order', notificationData);
      console.log(`New order ${order.orderId} emitted to client room (${clientCount} recipients)`);
      
    } catch (error) {
      console.error('Error emitting new order to admins/clients:', error);
    }
  }

  emitOrderToUser(userId, order, event = 'order_update') {
    if (!this.io) {
      console.warn('Socket.IO not initialized');
      return;
    }

    try {
      this.io.to(`user_${userId}`).emit(event, {
        type: event.toUpperCase(),
        order: order,
        timestamp: new Date().toISOString(),
        message: `Order ${order.orderId} ${event.replace('_', ' ')}`
      });
      
      console.log(`Order ${order.orderId} emitted to user ${userId}`);
    } catch (error) {
      console.error(`Error emitting order to user ${userId}:`, error);
    }
  }

  emitOrderStatusUpdate(order, previousStatus) {
    if (!this.io) {
      console.warn('Socket.IO not initialized');
      return;
    }

    try {
      const updateData = {
        type: 'ORDER_STATUS_UPDATE',
        order: order,
        previousStatus: previousStatus,
        currentStatus: order.status,
        timestamp: new Date().toISOString(),
        message: `Order ${order.orderId} status changed from ${previousStatus} to ${order.status}`
      };

      this.io.to(`user_${order.user}`).emit('order_status_update', updateData);
      
      this.io.to('admin_room').emit('order_status_update', updateData);
      
      this.io.to('client_room').emit('order_status_update', updateData);
      
      console.log(`Order status update for ${order.orderId} emitted to user, admin, and client rooms`);
    } catch (error) {
      console.error('Error emitting order status update:', error);
    }
  }

  emitRouteAssignment(order, route) {
    if (!this.io) {
      console.warn('Socket.IO not initialized');
      return;
    }

    try {
      const updateData = {
        type: 'ROUTE_ASSIGNED',
        order: order,
        route: route,
        timestamp: new Date().toISOString(),
        message: `Route ${route.routeName} assigned to order ${order.orderId}`
      };

      this.io.to(`user_${order.user}`).emit('route_assigned', updateData);
      
      this.io.to('admin_room').emit('route_assigned', updateData);
      
      this.io.to('client_room').emit('route_assigned', updateData);
      
      console.log(`Route assignment for order ${order.orderId} emitted to user, admin, and client rooms`);
    } catch (error) {
      console.error('Error emitting route assignment:', error);
    }
  }

  getConnectedClientsCount() {
    if (!this.io) return 0;
    return this.io.engine.clientsCount;
  }

  emitToAll(event, data) {
    if (!this.io) {
      console.warn('Socket.IO not initialized');
      return;
    }

    try {
      this.io.emit(event, {
        ...data,
        timestamp: new Date().toISOString()
      });
      
      console.log(`Event ${event} emitted to all clients`);
    } catch (error) {
      console.error(`Error emitting ${event} to all clients:`, error);
    }
  }
}

const socketService = new SocketService();
module.exports = socketService;
