require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../src/models/User');

async function updateAdminPassword() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    
    const email = process.env.ADMIN_EMAIL || 'realadmin@company.com';
    const newPassword = process.env.ADMIN_PASSWORD || 'SuperSecret123';
    
    console.log('🔍 Đang tìm admin với email:', email);
    
    // Tìm admin hiện tại
    const admin = await User.findOne({ email, role: 'admin' });
    
    if (!admin) {
      console.log('❌ Không tìm thấy admin với email:', email);
      process.exit(1);
    }
    
    console.log('✅ Tìm thấy admin:', admin.username, '- ID:', admin._id);
    
    // Hash password mới
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Cập nhật password
    await User.findByIdAndUpdate(admin._id, { password: hashedPassword });
    
    console.log('✅ Đã cập nhật password cho admin!');
    console.log('📧 Email:', email);
    console.log('🔑 Password:', newPassword);
    
    // Test đăng nhập
    const testAdmin = await User.findOne({ email });
    const isPasswordValid = await bcrypt.compare(newPassword, testAdmin.password);
    
    if (isPasswordValid) {
      console.log('✅ Test đăng nhập thành công!');
    } else {
      console.log('❌ Test đăng nhập thất bại!');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
    process.exit(1);
  }
}

updateAdminPassword();