// setup-admin.js - Tạo admin user từ environment variables
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('./src/config/db');
const User = require('./src/models/User');

async function setupAdmin() {
  try {
    console.log('🔗 Connecting to database...');
    await connectDB();
    
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    
    if (!adminEmail || !adminPassword) {
      console.error('❌ ADMIN_EMAIL và ADMIN_PASSWORD must be set in .env file');
      process.exit(1);
    }
    
    console.log(`👤 Creating admin user: ${adminEmail}`);
    
    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminEmail });
    if (existingAdmin) {
      console.log('⚠️  Admin user already exists');
      
      // Update password if needed
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      existingAdmin.password = hashedPassword;
      existingAdmin.role = 'admin';
      await existingAdmin.save();
      
      console.log('✅ Admin password updated');
    } else {
      // Create new admin
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      
      const admin = new User({
        username: 'Admin',
        email: adminEmail,
        password: hashedPassword,
        role: 'admin',
        status: 'offline',
        requirePasswordChange: false
      });
      
      await admin.save();
      console.log('✅ Admin user created successfully');
    }
    
    console.log(`📧 Admin Email: ${adminEmail}`);
    console.log(`🔑 Admin Password: ${adminPassword}`);
    console.log('\n🎯 You can now login to admin dashboard with these credentials');
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Database disconnected');
    process.exit(0);
  }
}

// Run setup
setupAdmin();