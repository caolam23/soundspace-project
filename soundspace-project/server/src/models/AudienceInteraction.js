const mongoose = require('mongoose');

/**
 * ✅ FEATURE: Audience Interaction (Like & Gift)
 * Tracks audience reactions to podcast broadcasts:
 * - Like/Heart reactions
 * - Gift/Donation interactions
 * - Real-time broadcast to all users
 * Implementation Date: April 2026
 */

const AudienceInteractionSchema = new mongoose.Schema(
  {
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: [true, 'Room ID is required']
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required']
    },
    type: {
      type: String,
      enum: ['like', 'gift'],
      required: [true, 'Interaction type is required']
    },
    // For gifts: track gift type and value
    giftType: {
      type: String,
      enum: ['flower', 'rose', 'diamond', 'crown', null],
      default: null
    },
    giftValue: {
      type: Number, // Points/coins value
      default: 0
    },
    // Animation metadata
    animationId: {
      type: String, // Unique ID for frontend animation tracking
      default: () => `anim-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 3600 // Auto-delete after 1 hour
    }
  },
  { timestamps: false }
);

// Index for efficient queries
AudienceInteractionSchema.index({ room: 1, createdAt: -1 });
AudienceInteractionSchema.index({ user: 1, room: 1 });

module.exports = mongoose.model('AudienceInteraction', AudienceInteractionSchema);
