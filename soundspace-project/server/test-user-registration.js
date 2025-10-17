// Test user registration để kiểm tra real-time user growth update
// Run: node test-user-registration.js

const axios = require('axios');

const testUserRegistration = async () => {
  try {
    console.log('🧪 Testing user registration real-time update...');
    
    const testUser = {
      username: `testuser_${Date.now()}`,
      email: `testuser_${Date.now()}@test.com`,
      password: 'testpass123',
      confirmPassword: 'testpass123'
    };

    console.log('📋 Test user data:', testUser);

    const response = await axios.post('http://localhost:8800/api/auth/register', testUser);
    
    console.log('✅ Registration successful:', response.data);
    console.log('📊 Real-time user growth stats should be emitted now!');
    console.log('🔄 Check frontend /admin/statistics page for automatic update');

  } catch (error) {
    console.error('❌ Registration error:', error.response?.data || error.message);
  }
};

testUserRegistration();