const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true // Index for fast user-based queries
    },
    type: {
        type: String,
        required: true,
        enum: ['song_approved', 'song_rejected', 'vote_milestone', 'mention', 'other']
    },
    payload: {
        songTitle: String,
        roomName: String,
        roomId: mongoose.Schema.Types.ObjectId,
        requestId: mongoose.Schema.Types.ObjectId,
        voteCount: Number,
        message: String,
        // Flexible for future notification types
        metadata: mongoose.Schema.Types.Mixed
    },
    isRead: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now,
        index: true // Index for sorting by date
    }
});

// Compound index for efficient querying: get user's notifications sorted by date
NotificationSchema.index({ userId: 1, createdAt: -1 });

// Compound index for unread count queries
NotificationSchema.index({ userId: 1, isRead: 1 });

module.exports = mongoose.model('Notification', NotificationSchema);
