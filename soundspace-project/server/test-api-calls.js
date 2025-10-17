// test-api-calls.js - Test script cho stats API
const axios = require('axios');

const BASE_URL = 'http://localhost:8800';

async function testStatsAPI() {
  console.log('🧪 Testing SoundSpace Stats API...\n');

  try {
    // Test 1: Music Sources (without auth - should fail)
    console.log('1️⃣ Testing music-sources endpoint (no auth)...');
    try {
      const response = await axios.get(`${BASE_URL}/api/admin/stats/music-sources`);
      console.log('   ❌ Should have failed without auth');
    } catch (error) {
      console.log('   ✅ Correctly rejected without auth:', error.response?.status);
    }

    // Test 2: Try to get a real admin token (if admin exists)
    console.log('\n2️⃣ Trying to login as admin...');
    try {
      const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
        identifier: 'admin@example.com', // Change to your admin email
        password: 'admin123' // Change to your admin password
      });
      
      if (loginResponse.data.token) {
        const adminToken = loginResponse.data.token;
        console.log('   ✅ Admin login successful');

        // Test 3: Test all stats endpoints with admin token
        const endpoints = [
          'music-sources',
          'top-contributors', 
          'songs-added',
          'user-growth',
          'overview'
        ];

        console.log('\n3️⃣ Testing all stats endpoints with admin token...');
        
        for (const endpoint of endpoints) {
          try {
            const response = await axios.get(`${BASE_URL}/api/admin/stats/${endpoint}`, {
              headers: { Authorization: `Bearer ${adminToken}` }
            });
            console.log(`   ✅ ${endpoint}:`, JSON.stringify(response.data, null, 2));
          } catch (error) {
            console.log(`   ❌ ${endpoint} failed:`, error.response?.data?.message || error.message);
          }
        }
      }
    } catch (error) {
      console.log('   ⚠️ Admin login failed - testing with mock auth');
      
      // Test with mock data if no admin available
      console.log('\n4️⃣ Testing direct service functions...');
      
      const { getAllStats } = require('./src/services/statsService');
      const allStats = await getAllStats();
      console.log('   📊 Direct stats result:', JSON.stringify(allStats, null, 2));
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }

  console.log('\n🏁 Test completed!');
}

// Run the test
testStatsAPI();