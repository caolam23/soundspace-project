/**
 * ✅ FEATURE: Audience Interaction Controller
 * Handles like and gift interactions from audience during podcast
 * Implementation Date: April 2026
 */

const AudienceInteraction = require('../models/AudienceInteraction');
const Room = require('../models/room');
const User = require('../models/User');

// ========================================
// SEND LIKE
// ========================================
exports.sendLike = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;

    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ msg: 'Phòng không tồn tại' });
    }

    if (room.status !== 'live') {
      return res.status(400).json({ msg: 'Phòng không đang phát sóng' });
    }

    const user = await User.findById(userId).select('username avatar');
    if (!user) {
      return res.status(404).json({ msg: 'Người dùng không tìm thấy' });
    }

    // Create like interaction
    const like = new AudienceInteraction({
      room: roomId,
      user: userId,
      type: 'like'
    });

    await like.save();

    res.status(201).json({
      msg: 'Đã gửi tim',
      interaction: {
        _id: like._id,
        animationId: like.animationId,
        type: 'like',
        user: {
          _id: userId,
          username: user.username,
          avatar: user.avatar
        },
        createdAt: like.createdAt
      }
    });
  } catch (err) {
    console.error('❌ Lỗi sendLike:', err);
    res.status(500).json({ msg: 'Lỗi server', error: err.message });
  }
};

// ========================================
// SEND GIFT
// ========================================
exports.sendGift = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { giftType } = req.body;
    const userId = req.user.id;

    if (!['flower', 'rose', 'diamond', 'crown'].includes(giftType)) {
      return res.status(400).json({ msg: 'Loại quà không hợp lệ' });
    }

    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ msg: 'Phòng không tồn tại' });
    }

    if (room.status !== 'live') {
      return res.status(400).json({ msg: 'Phòng không đang phát sóng' });
    }

    const user = await User.findById(userId).select('username avatar');
    if (!user) {
      return res.status(404).json({ msg: 'Người dùng không tìm thấy' });
    }

    // Gift values (points)
    const giftValues = {
      flower: 10,
      rose: 25,
      diamond: 100,
      crown: 500
    };

    // Create gift interaction
    const gift = new AudienceInteraction({
      room: roomId,
      user: userId,
      type: 'gift',
      giftType: giftType,
      giftValue: giftValues[giftType]
    });

    await gift.save();

    // Update room statistics
    if (!room.statistics) room.statistics = {};
    if (!room.statistics.giftCount) room.statistics.giftCount = 0;
    if (!room.statistics.giftValue) room.statistics.giftValue = 0;
    
    room.statistics.giftCount += 1;
    room.statistics.giftValue += giftValues[giftType];
    await room.save();

    res.status(201).json({
      msg: 'Đã gửi quà',
      interaction: {
        _id: gift._id,
        animationId: gift.animationId,
        type: 'gift',
        giftType: giftType,
        giftValue: giftValues[giftType],
        user: {
          _id: userId,
          username: user.username,
          avatar: user.avatar
        },
        createdAt: gift.createdAt
      }
    });
  } catch (err) {
    console.error('❌ Lỗi sendGift:', err);
    res.status(500).json({ msg: 'Lỗi server', error: err.message });
  }
};

// ========================================
// GET INTERACTION STATS
// ========================================
exports.getInteractionStats = async (req, res) => {
  try {
    const { roomId } = req.params;

    const likes = await AudienceInteraction.countDocuments({
      room: roomId,
      type: 'like'
    });

    const gifts = await AudienceInteraction.find({
      room: roomId,
      type: 'gift'
    }).select('giftValue');

    const totalGiftValue = gifts.reduce((sum, gift) => sum + gift.giftValue, 0);

    res.json({
      roomId,
      stats: {
        likes,
        giftCount: gifts.length,
        totalGiftValue
      }
    });
  } catch (err) {
    console.error('❌ Lỗi getInteractionStats:', err);
    res.status(500).json({ msg: 'Lỗi server', error: err.message });
  }
};
