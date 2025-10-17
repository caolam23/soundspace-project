// Test script để kiểm tra realtime user growth
// Run: node test-user-growth-realtime.js

const axios = require('axios');
const io = require('socket.io-client');

const BASE_URL = 'http://localhost:8800';
const CLIENT_URL = 'http://localhost:5173';

console.log('🧪 ========================================');
console.log('🧪 TESTING USER GROWTH REALTIME');
console.log('🧪 ========================================\n');

// Step 1: Connect Socket.IO client
console.log('📡 Step 1: Connecting to Socket.IO...');
const socket = io(BASE_URL, {
  transports: ['websocket'],
  reconnection: true
});

socket.on('connect', () => {
  console.log('✅ Socket connected:', socket.id);
});

socket.on('disconnect', () => {
  console.log('❌ Socket disconnected');
});

socket.on('connect_error', (error) => {
  console.error('❌ Socket connection error:', error.message);
});

// Step 2: Listen for user-growth-update event
console.log('👂 Step 2: Listening for stats:user-growth-update event...\n');

let updateReceived = false;

socket.on('stats:user-growth-update', (payload) => {
  updateReceived = true;
  console.log('\n🎉 ========================================');
  console.log('🎉 USER GROWTH UPDATE RECEIVED!');
  console.log('🎉 ========================================');
  console.log('📊 Payload:', JSON.stringify(payload, null, 2));
  
  if (payload.data && payload.range) {
    console.log(`✅ Format: NEW (with range: ${payload.range})`);
    console.log(`✅ Data points: ${Array.isArray(payload.data) ? payload.data.length : 0}`);
  } else {
    console.log('⚠️  Format: OLD (direct data)');
  }
  console.log('🎉 ========================================\n');
});

// Step 3: Wait a moment for socket to stabilize
setTimeout(async () => {
  console.log('👤 Step 3: Creating new user to trigger stats update...\n');
  
  const testUser = {
    username: `test_realtime_${Date.now()}`,
    email: `test_realtime_${Date.now()}@test.com`,
    password: 'testpass123',
    confirmPassword: 'testpass123'
  };

  try {
    console.log('📋 Test user:', testUser);
    
    const response = await axios.post(`${BASE_URL}/api/auth/register`, testUser);
    
    console.log('\n✅ ========================================');
    console.log('✅ USER REGISTERED SUCCESSFULLY');
    console.log('✅ ========================================');
    console.log('👤 User:', response.data.user);
    console.log('✅ ========================================\n');
    
    console.log('⏳ Waiting 3 seconds for stats update event...\n');
    
    setTimeout(() => {
      if (updateReceived) {
        console.log('\n🎉 ========================================');
        console.log('🎉 TEST PASSED!');
        console.log('🎉 User growth stats received in realtime');
        console.log('🎉 ========================================\n');
      } else {
        console.log('\n❌ ========================================');
        console.log('❌ TEST FAILED!');
        console.log('❌ No user growth stats received');
        console.log('❌ ========================================');
        console.log('\n🔍 Troubleshooting:');
        console.log('1. Check backend logs for emission');
        console.log('2. Verify Socket.IO is properly initialized');
        console.log('3. Check authController emits event after user creation');
        console.log('4. Verify frontend is listening on correct event name\n');
      }
      
      socket.disconnect();
      process.exit(updateReceived ? 0 : 1);
    }, 3000);
    
  } catch (error) {
    console.error('\n❌ ========================================');
    console.error('❌ ERROR CREATING USER');
    console.error('❌ ========================================');
    console.error('Error:', error.response?.data || error.message);
    console.error('❌ ========================================\n');
    socket.disconnect();
    process.exit(1);
  }
}, 2000);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down...');
  socket.disconnect();
  process.exit(0);
});