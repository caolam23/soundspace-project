// server/src/models/RoomReport.js
const mongoose = require('mongoose');

// Sửa ở đây: đổi 'reportSchema' thành 'roomReportSchema'
const roomReportSchema = new mongoose.Schema({
  room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
  reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  category: { type: String, required: true },
  details: { type: String, default: '' },
  status: { type: String, enum: ['open', 'reviewed', 'dismissed'], default: 'open' },
}, { timestamps: true });

// Tên biến giờ đã khớp
module.exports = mongoose.model('RoomReport', roomReportSchema);