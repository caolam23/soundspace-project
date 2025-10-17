const axios = require('axios');

async function testAdminLogin() {
  try {
    console.log('🧪 Testing admin login...');
    
    const response = await axios.post('http://localhost:8800/api/auth/login', {
      identifier: 'realadmin@company.com',
      password: 'SuperSecret123'
    });
    
    console.log('✅ Đăng nhập thành công!');
    console.log('📧 Email:', response.data.user.email);
    console.log('👤 Username:', response.data.user.username);
    console.log('🔐 Role:', response.data.user.role);
    console.log('🎫 Token:', response.data.token ? '✅ Generated' : '❌ Missing');
    
  } catch (error) {
    console.log('❌ Đăng nhập thất bại!');
    console.log('Status:', error.response?.status);
    console.log('Message:', error.response?.data?.msg || error.message);
  }
}

testAdminLogin();