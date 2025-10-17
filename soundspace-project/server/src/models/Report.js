// server/src/models/Report.js
const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  reporter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  reportedUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true,
  },
  messageId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  messageContent: {
    type: String,
    required: true,
  },
  reason: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'resolved_deleted', 'resolved_muted', 'resolved_ignored'],
    default: 'pending',
  },
}, { timestamps: true });

module.exports = mongoose.model('Report', reportSchema);