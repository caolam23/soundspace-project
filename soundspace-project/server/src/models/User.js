const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  googleId: { type: String, default: null },
  username: { type: String, required: false },
  email: { type: String, required: true, unique: true, index: true },
  password: { type: String, required: false }, // hashed password for local login
  role: { type: String, enum: ['user','admin'], default: 'user' }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
