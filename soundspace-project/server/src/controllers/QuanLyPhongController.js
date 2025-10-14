// server/src/controllers/QuanLyPhongController.js
const Room = require('../models/room');
const User = require('../models/User');

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

    console.log('📊 [getAllRooms] Query params:', { status, search, page, limit });

    // Build filter object
    const filter = {};
    
    // ✅ Lọc theo status - FIX LOGIC
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

    // Tìm kiếm theo tên phòng
    if (search && search.trim()) {
      filter.name = { $regex: search.trim(), $options: 'i' };
    }

    console.log('🔍 [getAllRooms] Filter:', JSON.stringify(filter));

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    // Fetch rooms with populated owner
    const rooms = await Room.find(filter)
      .populate('owner', 'username avatar email')
      .populate('members', 'username')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    console.log(`✅ [getAllRooms] Found ${rooms.length} rooms`);

    // Get total count for pagination
    const totalRooms = await Room.countDocuments(filter);

    // ✅ Transform data - GIỮ NGUYÊN STATUS TỪ DATABASE
    const transformedRooms = rooms.map(room => {
      console.log(`🏠 Room: ${room.name} | Status DB: ${room.status} | isBanned: ${room.isBanned}`);
      
      return {
        id: room._id.toString(),
        name: room.name,
        host: room.owner?.username || 'Unknown',
        hostId: room.owner?._id?.toString() || null,
        hostAvatar: room.owner?.avatar || '/default-avatar.png',
        members: room.members?.length || 0,
        status: room.status, // ✅ GIỮ NGUYÊN: "waiting", "live", "ended"
        created: new Date(room.createdAt).toLocaleDateString('vi-VN'),
        createdAt: room.createdAt,
        privacy: room.privacy,
        description: room.description,
        coverImage: room.coverImage,
        isBanned: room.isBanned || false, // ✅ Thêm flag này
        banReason: room.banReason || '',
        roomCode: room.roomCode,
        startedAt: room.startedAt,
        endedAt: room.endedAt,
        statistics: room.statistics
      };
    });

    console.log('📤 [getAllRooms] Sending response with rooms:', transformedRooms.map(r => ({
      name: r.name,
      status: r.status,
      isBanned: r.isBanned
    })));

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
    console.error("❌ Lỗi getAllRooms:", err);
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

    // ✅ Transform data - GIỮ NGUYÊN STATUS
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
      status: room.status, // ✅ GIỮ NGUYÊN
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

    res.status(200).json({
      success: true,
      data: roomDetail
    });

  } catch (err) {
    console.error("❌ Lỗi getRoomById:", err);
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

    // Emit socket để thông báo phòng bị xóa
    const io = req.app.get('io');
    if (io) {
      io.to(roomId).emit('room-deleted', {
        message: 'Phòng đã bị admin xóa.'
      });
    }

    // Xóa phòng
    await Room.findByIdAndDelete(roomId);

    res.status(200).json({
      success: true,
      msg: 'Xóa phòng thành công',
      roomId
    });

  } catch (err) {
    console.error("❌ Lỗi deleteRoom:", err);
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

    // Toggle ban status
    room.isBanned = !room.isBanned;
    room.banReason = room.isBanned ? (banReason || 'Vi phạm chính sách') : '';
    
    await room.save();

    // Emit socket notification
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
    console.error("❌ Lỗi toggleBanRoom:", err);
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
    console.error("❌ Lỗi getRoomStatistics:", err);
    res.status(500).json({ 
      success: false,
      msg: 'Lỗi server khi lấy thống kê', 
      error: err.message 
    });
  }
};