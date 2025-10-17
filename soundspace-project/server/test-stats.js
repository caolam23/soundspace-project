// server/test-stats.js
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./src/config/db');
const {
  getMusicSourcesStats,
  getTopContributors,
  getSongsAddedOverTime,
  getUserGrowth,
  getAllStats
} = require('./src/services/statsService');

async function testStats() {
  try {
    console.log('🔗 Connecting to database...');
    await connectDB();
    console.log('✅ Connected to database');

    console.log('\n📊 Testing Stats Service...\n');

    // Test 1: Music Sources
    console.log('1️⃣ Testing getMusicSourcesStats...');
    const musicSources = await getMusicSourcesStats();
    console.log('   Result:', musicSources);

    // Test 2: Top Contributors  
    console.log('\n2️⃣ Testing getTopContributors...');
    const topContributors = await getTopContributors();
    console.log('   Result:', topContributors);

    // Test 3: Songs Added Over Time
    console.log('\n3️⃣ Testing getSongsAddedOverTime...');
    const songsAdded = await getSongsAddedOverTime();
    console.log('   Result:', songsAdded);

    // Test 4: User Growth
    console.log('\n4️⃣ Testing getUserGrowth...');
    const userGrowth = await getUserGrowth();
    console.log('   Result:', userGrowth);

    // Test 5: All Stats
    console.log('\n5️⃣ Testing getAllStats...');
    const allStats = await getAllStats();
    console.log('   Result:', JSON.stringify(allStats, null, 2));

    console.log('\n✅ All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    console.log('\n🔌 Closing database connection...');
    await mongoose.disconnect();
    console.log('✅ Database disconnected');
    process.exit(0);
  }
}

// Run test
testStats();