// server/src/controllers/QuanLyPhongController.js
const Room = require('../models/room');
const User = require('../models/User');
const Report = require('../models/Report');

/**
 * =============================================
 * LẤY DANH SÁCH TẤT CẢ PHÒNG (CHO ADMIN)
 * =============================================
 */
exports.getAllRooms = async (req, res) => {
  try {
    const { 
      status, 
      search, 
      page = 1, 
      limit = 5,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const filter = {};
    
    if (status && status !== 'all') {
      if (status === 'waiting') {
        filter.status = 'waiting';
      } else if (status === 'live') {
        filter.status = 'live';
      } else if (status === 'ended') {
        filter.status = 'ended';
      } else if (status === 'banned') {
        filter.isBanned = true;
      }
    }

    if (search && search.trim()) {
      filter.name = { $regex: search.trim(), $options: 'i' };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const rooms = await Room.find(filter)
      .populate('owner', 'username avatar email')
      .populate('members', 'username')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const totalRooms = await Room.countDocuments(filter);

    const transformedRooms = rooms.map(room => ({
      id: room._id.toString(),
      name: room.name,
      host: room.owner?.username || 'Unknown',
      hostId: room.owner?._id?.toString() || null,
      hostAvatar: room.owner?.avatar || '/default-avatar.png',
      members: room.members?.length || 0,
      status: room.status,
      created: new Date(room.createdAt).toLocaleDateString('vi-VN'),
      createdAt: room.createdAt,
      privacy: room.privacy,
      description: room.description,
      coverImage: room.coverImage,
      isBanned: room.isBanned || false,
      banReason: room.banReason || '',
      roomCode: room.roomCode,
      startedAt: room.startedAt,
      endedAt: room.endedAt,
      statistics: room.statistics
    }));

    res.status(200).json({
      success: true,
      data: transformedRooms,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalRooms / parseInt(limit)),
        totalRooms,
        limit: parseInt(limit)
      }
    });

  } catch (err) {
    res.status(500).json({ 
      success: false,
      msg: 'Lỗi server khi lấy danh sách phòng', 
      error: err.message 
    });
  }
};

/**
 * =============================================
 * LẤY CHI TIẾT MỘT PHÒNG
 * =============================================
 */
exports.getRoomById = async (req, res) => {
  try {
    const { roomId } = req.params;

    const room = await Room.findById(roomId)
      .populate('owner', 'username avatar email')
      .populate('members', 'username avatar email')
      .lean();

    if (!room) {
      return res.status(404).json({ 
        success: false,
        msg: 'Không tìm thấy phòng' 
      });
    }

    const roomDetail = {
      id: room._id.toString(),
      name: room.name,
      description: room.description,
      coverImage: room.coverImage,
      host: room.owner?.username || 'Unknown',
      hostId: room.owner?._id?.toString(),
      hostEmail: room.owner?.email,
      hostAvatar: room.owner?.avatar,
      members: room.members || [],
      totalMembers: room.members?.length || 0,
      status: room.status,
      privacy: room.privacy,
      roomCode: room.roomCode,
      isBanned: room.isBanned || false,
      banReason: room.banReason || '',
      createdAt: room.createdAt,
      startedAt: room.startedAt,
      endedAt: room.endedAt,
      statistics: room.statistics,
      playlist: room.playlist,
      chat: room.chat
    };
  // If totalJoins is not set but there are members, fallback to current members length
    if ((!roomDetail.statistics || !roomDetail.statistics.totalJoins) && roomDetail.totalMembers) {
      roomDetail.statistics = roomDetail.statistics || {};
      roomDetail.statistics.totalJoins = roomDetail.statistics.totalJoins || roomDetail.totalMembers;
    }
    res.status(200).json({
      success: true,
      data: roomDetail
    });

  } catch (err) {
    res.status(500).json({ 
      success: false,
      msg: 'Lỗi server khi lấy chi tiết phòng', 
      error: err.message 
    });
  }
};

/**
 * =============================================
 * XÓA PHÒNG (ADMIN)
 * =============================================
 */
exports.deleteRoom = async (req, res) => {
  try {
    const { roomId } = req.params;

    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ 
        success: false,
        msg: 'Không tìm thấy phòng' 
      });
    }

    const io = req.app.get('io');
    if (io) {
      io.to(roomId).emit('room-deleted', {
        message: 'Phòng đã bị admin xóa.'
      });
    }

    await Room.findByIdAndDelete(roomId);

    // Remove any reports associated with this room to avoid orphaned report records
    try {
      await Report.deleteMany({ room: roomId });
      console.log(`[CLEANUP] Deleted reports for removed room ${roomId}`);
    } catch (e) {
      console.warn(`[CLEANUP] Failed to delete reports for room ${roomId}:`, e.message);
    }

    res.status(200).json({
      success: true,
      msg: 'Xóa phòng thành công',
      roomId
    });

  } catch (err) {
    res.status(500).json({ 
      success: false,
      msg: 'Lỗi server khi xóa phòng', 
      error: err.message 
    });
  }
};

/**
 * =============================================
 * CẤM/BỎ CẤM PHÒNG (BAN/UNBAN)
 * =============================================
 */
exports.toggleBanRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { banReason } = req.body;

    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ 
        success: false,
        msg: 'Không tìm thấy phòng' 
      });
    }

    room.isBanned = !room.isBanned;
    room.banReason = room.isBanned ? (banReason || 'Vi phạm chính sách') : '';
    
    await room.save();

    const io = req.app.get('io');
    if (io && room.isBanned) {
      io.to(roomId).emit('room-banned', {
        message: `Phòng đã bị cấm. Lý do: ${room.banReason}`
      });
    }

    res.status(200).json({
      success: true,
      msg: room.isBanned ? 'Đã cấm phòng' : 'Đã bỏ cấm phòng',
      data: {
        roomId,
        isBanned: room.isBanned,
        banReason: room.banReason
      }
    });

  } catch (err) {
    res.status(500).json({ 
      success: false,
      msg: 'Lỗi server khi cấm/bỏ cấm phòng', 
      error: err.message 
    });
  }
};

/**
 * =============================================
 * LẤY THỐNG KÊ TỔNG QUAN
 * =============================================
 */
exports.getRoomStatistics = async (req, res) => {
  try {
    const totalRooms = await Room.countDocuments();
    const activeRooms = await Room.countDocuments({ 
      status: { $in: ['waiting', 'live'] } 
    });
    const endedRooms = await Room.countDocuments({ status: 'ended' });
    const bannedRooms = await Room.countDocuments({ isBanned: true });

    res.status(200).json({
      success: true,
      data: {
        totalRooms,
        activeRooms,
        endedRooms,
        bannedRooms
      }
    });

  } catch (err) {
    res.status(500).json({ 
      success: false,
      msg: 'Lỗi server khi lấy thống kê', 
      error: err.message 
    });
  }
};
