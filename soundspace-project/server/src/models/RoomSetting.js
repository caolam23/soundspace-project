const mongoose = require("mongoose");

/**
 * =============================================
 * RoomSettingSchema - Cài đặt phòng (Request Settings)
 * =============================================
 */
const RoomSettingSchema = new mongoose.Schema({
    approvalMode: {
        type: String,
        enum: ['manual', 'auto'],
        default: 'manual'
    },
    autoApproveThreshold: {
        type: Number,
        default: 30,  // 30% of members
        min: 10,
        max: 80
    }
}, { _id: false });

const RoomSetting = mongoose.model("RoomSetting", RoomSettingSchema);

// Export cả schema (để Room embed) và model
module.exports = RoomSetting;
module.exports.RoomSettingSchema = RoomSettingSchema;
