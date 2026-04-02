// server/src/controllers/interactController.js
// =============================================
// Audience Interaction – Reactions & Gifts
// =============================================

// Static gift catalog
const GIFT_CATALOG = [
  { id: 'gift_rose',     name: 'Rose',       emoji: '🌹', price: 10 },
  { id: 'gift_heart',    name: 'Heart',      emoji: '💖', price: 20 },
  { id: 'gift_star',     name: 'Star',       emoji: '⭐', price: 50 },
  { id: 'gift_crown',    name: 'Crown',      emoji: '👑', price: 100 },
  { id: 'gift_diamond',  name: 'Diamond',    emoji: '💎', price: 200 },
];

const Room = require('../models/room');
const User = require('../models/User');

const toId = (v) => (v == null ? null : String(v));

// ==============================
// GET /api/interact/gifts
// Return static gift catalog
// ==============================
exports.getGiftCatalog = (req, res) => {
  return res.status(200).json({ gifts: GIFT_CATALOG });
};

// ==============================
// POST /api/interact/:roomId/reaction
// Audience sends a reaction (emoji type)
// ==============================
exports.sendReaction = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { type = 'heart' } = req.body; // e.g. 'heart', 'fire', 'star'
    const userId = toId(req.user?.id || req.user?._id);

    const room = await Room.findById(roomId).select('status');
    if (!room || room.status === 'ended') {
      return res.status(404).json({ msg: 'Phòng không tồn tại hoặc đã kết thúc.' });
    }

    const io = req.app.get('io');
    if (io) {
      io.to(roomId).emit('interact:reaction-batch', { userId, type, count: 1 });
    }

    return res.status(200).json({ msg: 'Đã gửi cảm xúc.' });
  } catch (err) {
    console.error('[interactController] sendReaction error:', err);
    return res.status(500).json({ msg: 'Lỗi server.', error: err.message });
  }
};

// ==============================
// POST /api/interact/:roomId/gift
// Audience sends a gift (deduct virtual coins)
// ==============================
exports.sendGift = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { giftId } = req.body;
    const userId = toId(req.user?.id || req.user?._id);

    const gift = GIFT_CATALOG.find(g => g.id === giftId);
    if (!gift) return res.status(400).json({ msg: 'Quà không hợp lệ.' });

    const room = await Room.findById(roomId).select('status');
    if (!room || room.status === 'ended') {
      return res.status(404).json({ msg: 'Phòng không tồn tại hoặc đã kết thúc.' });
    }

    // NOTE: Real coin deduction would go here once User has a `coins` field.
    // For now, we trust the client and just broadcast the gift event.
    const sender = await User.findById(userId).select('username avatar');

    const io = req.app.get('io');
    if (io) {
      io.to(roomId).emit('interact:gift-received', {
        sender: {
          _id: userId,
          username: sender?.username || 'Ẩn danh',
          avatar: sender?.avatar || null,
        },
        gift,
        sentAt: new Date().toISOString(),
      });
    }

    return res.status(200).json({ msg: `Đã tặng ${gift.name}!`, gift });
  } catch (err) {
    console.error('[interactController] sendGift error:', err);
    return res.status(500).json({ msg: 'Lỗi server.', error: err.message });
  }
};

module.exports.GIFT_CATALOG = GIFT_CATALOG;
