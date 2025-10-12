// server/src/models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  googleId: { type: String, default: null },
  username: { type: String, trim: true },
  email: { type: String, required: true, unique: true, index: true },
  password: { type: String, required: false },

  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  currentRole: { type: String, enum: ['user', 'host', 'listener'], default: 'user' },

  status: { type: String, enum: ['online', 'offline', 'blocked', 'reported'], default: 'offline' },
  reportCount: { type: Number, default: 0 },
  isBlocked: { type: Boolean, default: false },
  lastActiveAt: { type: Date, default: Date.now },
  avatar: { type: String, default: '/images/default-avatar.png' },
  
  // 🔥 Thêm trường mới
  requirePasswordChange: { type: Boolean, default: false }, // Bắt buộc đổi password lần đầu
  passwordChangedAt: { type: Date } // Thời gian đổi password gần nhất
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);