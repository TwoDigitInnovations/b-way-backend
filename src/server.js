require("dotenv").config();
require("module-alias/register");
const app = require("./app");
const http = require("http");
const { Server } = require("socket.io");
const socketService = require("./services/socketService");
const workerManager = require("./workers/workerManager");

const PORT = process.env.PORT || 8000;

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Initialize socket service
socketService.init(io);
app.set('io', io);

app.use((req, res, next) => {
  req.socketService = socketService;
  next();
});

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);
 
  socket.on('join', (data) => {
    console.log(`Join request received:`, data);
    
    if (data.userId) {
      socket.join(`user_${data.userId}`);
      console.log(`User ${data.userId} joined their room`);
    }
    
    if (data.role === 'ADMIN') {
      socket.join('admin_room');
      console.log(`Admin user joined admin room`);
      
      const adminRoom = io.sockets.adapter.rooms.get('admin_room');
      const adminCount = adminRoom ? adminRoom.size : 0;
      console.log(`Admin room now has ${adminCount} users`);
    }
    
    if (data.role === 'CLIENT') {
      socket.join('client_room');
      console.log(`Client user joined client room`);

      const clientRoom = io.sockets.adapter.rooms.get('client_room');
      const clientCount = clientRoom ? clientRoom.size : 0;
      console.log(`Client room now has ${clientCount} users`);
    }
    
    if (data.role === 'USER' || data.role === 'HOSPITAL') {
      socket.join('hospital_room');
      console.log(`Hospital user joined hospital room`);

      const hospitalRoom = io.sockets.adapter.rooms.get('hospital_room');
      const hospitalCount = hospitalRoom ? hospitalRoom.size : 0;
      console.log(`Hospital room now has ${hospitalCount} users`);
    }
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);

    setTimeout(() => {
      const adminRoom = io.sockets.adapter.rooms.get('admin_room');
      const adminCount = adminRoom ? adminRoom.size : 0;
      console.log(`Admin room now has ${adminCount} users after disconnect`);

      const clientRoom = io.sockets.adapter.rooms.get('client_room');
      const clientCount = clientRoom ? clientRoom.size : 0;
      console.log(`Client room now has ${clientCount} users after disconnect`);

      const hospitalRoom = io.sockets.adapter.rooms.get('hospital_room');
      const hospitalCount = hospitalRoom ? hospitalRoom.size : 0;
      console.log(`Hospital room now has ${hospitalCount} users after disconnect`);
    }, 100);
  });
});

server.listen(PORT, () => {
  if (process.env.ENABLE_SQS_WORKERS !== 'false') {
    console.log('Starting SQS workers...');
    try {
      workerManager.startAll();
    } catch (error) {
      console.error('Failed to start SQS workers:', error);
      console.log('Server will continue without SQS workers');
    }
  } else {
    console.log('SQS workers are disabled (set ENABLE_SQS_WORKERS=true to enable)');
  }
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received');
  console.log('Shutting down gracefully...');

  if (workerManager.isRunning) {
    workerManager.stopAll();
  }
  
  io.close(() => {
    console.log('Socket.IO server closed');
  });
  
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received');
  console.log('Shutting down gracefully...');

  if (workerManager.isRunning) {
    workerManager.stopAll();
  }
  
  io.close(() => {
    console.log('Socket.IO server closed');
  });
  
  // Close server
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});
