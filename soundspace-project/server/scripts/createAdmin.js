require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../src/models/User');

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  const email = process.argv[2];
  const password = process.argv[3];
  if(!email || !password) {
    console.log('Usage: node createAdmin.js email password');
    process.exit(1);
  }
  const hashed = await bcrypt.hash(password, 10);
  const user = await User.create({ email, username: 'admin', password: hashed, role: 'admin' });
  console.log('Created admin:', user._id);
  process.exit(0);
}

main();
