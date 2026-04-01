/**
 * Server Entry Point
 * 
 * Minimal, clean entry point that orchestrates:
 * 1. Database connection
 * 2. Express app setup
 * 3. HTTP server creation
 * 4. Socket.io initialization
 * 5. Cleanup service restoration
 * 6. Server startup
 */

require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');

const connectDB = require('./config/db');
const createApp = require('./app');
const { initializeSocket, startCleanupInterval } = require('./socket');
const { restoreScheduledCleanups } = require('./services/cleanupService');

// Initialize Express app
const app = createApp();

// Configure CORS and JSON middleware
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(express.json());

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io with all handlers
const io = initializeSocket(server);

// Start auto-cleanup interval for join approvals (memory leak prevention)
startCleanupInterval();

// Attach IO instances to app for use in route controllers
const { userSockets } = require('./socket/store');
app.set('io', io);
app.set('userSockets', userSockets);

// Routes
app.use('/api/stream', require('./routes/stream.routes'));

// Server startup
const PORT = process.env.PORT || 8800;

const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Restore any scheduled room cleanup tasks
    await restoreScheduledCleanups();

    // Start HTTP server
    server.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start the server:', error);
    process.exit(1);
  }
};

// Start the application
startServer();

module.exports = { io, userSockets };
