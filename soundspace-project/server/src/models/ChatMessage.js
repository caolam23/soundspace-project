const mongoose = require("mongoose");

/**
 * =============================================
 * ChatMessageSchema - Tin nhắn chat trong phòng
 * =============================================
 */
const ChatMessageSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        username: { type: String, required: true, trim: true },
        avatar: { type: String, trim: true },
        text: { type: String, required: true, trim: true },
        meta: { type: Object, default: {} }, // optional metadata (e.g., emojis)
    },
    { timestamps: true, _id: true }
);

const ChatMessage = mongoose.model("ChatMessage", ChatMessageSchema);

// Export cả schema (để Room embed) và model
module.exports = ChatMessage;
module.exports.ChatMessageSchema = ChatMessageSchema;
