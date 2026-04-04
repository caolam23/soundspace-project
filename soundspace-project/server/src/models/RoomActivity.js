const mongoose = require("mongoose");

/**
 * =============================================
 * RoomActivitySchema - Lịch sử hoạt động join/leave của phòng
 * =============================================
 */
const RoomActivitySchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    action: { type: String, enum: ["join", "leave"] },
    timestamp: { type: Date, default: Date.now },
});

/**
 * =============================================
 * RoomStatisticsSchema - Thống kê phòng
 * =============================================
 */
const RoomStatisticsSchema = new mongoose.Schema({
    totalJoins: { type: Number, default: 0 },
    peakMembers: { type: Number, default: 0 },
    totalMessages: { type: Number, default: 0 },
    totalDuration: { type: Number, default: 0 },
}, { _id: false });

const RoomActivity = mongoose.model("RoomActivity", RoomActivitySchema);

// Export cả schema (để Room embed) và model
module.exports = RoomActivity;
module.exports.RoomActivitySchema = RoomActivitySchema;
module.exports.RoomStatisticsSchema = RoomStatisticsSchema;
