const io = require('socket.io-client');

// Test Socket.IO connection
const socket = io('http://localhost:8000', {
  transports: ['websocket', 'polling'],
  autoConnect: true,
  timeout: 20000,
});

console.log('🔌 Attempting to connect to Socket.IO server...');

socket.on('connect', () => {
  console.log('✅ Connected to Socket.IO server');
  console.log('Socket ID:', socket.id);
  
  // Test joining as different user types
  console.log('\n🏥 Testing as HOSPITAL user...');
  socket.emit('join', {
    userId: 'test-hospital-123',
    role: 'USER'
  });
  
  setTimeout(() => {
    console.log('\n👑 Testing as ADMIN user...');
    socket.emit('join', {
      userId: 'test-admin-456',
      role: 'ADMIN'
    });
  }, 1000);
  
  setTimeout(() => {
    console.log('\n🏢 Testing as CLIENT user...');
    socket.emit('join', {
      userId: 'test-client-789',
      role: 'CLIENT'
    });
  }, 2000);
});

socket.on('disconnect', (reason) => {
  console.log('❌ Disconnected:', reason);
});

socket.on('connect_error', (error) => {
  console.error('❌ Connection error:', error.message);
});

// Listen for order events
socket.on('new_order', (data) => {
  console.log('\n📦 NEW ORDER RECEIVED:');
  console.log('Message:', data.message);
  console.log('Order ID:', data.order?.orderId);
  console.log('Timestamp:', data.timestamp);
});

socket.on('order_status_update', (data) => {
  console.log('\n📊 ORDER STATUS UPDATE:');
  console.log('Message:', data.message);
  console.log('Order ID:', data.order?.orderId);
  console.log('Status:', data.currentStatus);
});

socket.on('route_assigned', (data) => {
  console.log('\n🗺️ ROUTE ASSIGNED:');
  console.log('Message:', data.message);
  console.log('Order ID:', data.order?.orderId);
  console.log('Route:', data.route?.routeName);
});

// Keep the connection alive
setTimeout(() => {
  console.log('\n🧹 Closing connection...');
  socket.disconnect();
  process.exit(0);
}, 10000);
