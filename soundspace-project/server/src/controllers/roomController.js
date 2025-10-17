const Room = require('../models/room.js');
const { customAlphabet } = require('nanoid');
const cleanupPlayerScripts = require('../utils/cleanupPlayerScripts'); 
const { scheduleRoomCleanup } = require('../services/cleanupService');
// Helper: Populate owner + members
const populateRoom = async (roomId) => {
  return Room.findById(roomId)
    .populate('owner', 'username avatar')
    .populate('members', 'username avatar');
};

// ==========================
// BÁO CÁO PHÒNG
// POST /api/rooms/:roomId/report
// ==========================
const Report = require('../models/Report');
exports.reportRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { category, details } = req.body;
    if (!category) return res.status(400).json({ msg: 'Vui lòng chọn lý do báo cáo.' });

    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ msg: 'Không tìm thấy phòng.' });

    const reporterId = req.user?.id || null;

    const report = new Report({ room: room._id, reporter: reporterId, category, details });
    await report.save();

    // Tăng số lượng báo cáo trên phòng (dùng cho admin dashboard)
    room.reportCount = (room.reportCount || 0) + 1;
    await room.save();

    // Optionally emit socket event for admins
    const io = req.app.get('io');
    if (io) {
      io.emit('room-reported', { roomId: room._id.toString(), reportId: report._id.toString(), category });
    }

    return res.status(201).json({ msg: 'Báo cáo đã được gửi. Cảm ơn bạn.' });
  } catch (err) {
    console.error('❌ Lỗi reportRoom:', err);
    return res.status(500).json({ msg: 'Lỗi server khi gửi báo cáo.', error: err.message });
  }
};

// ==========================
// TẠO PHÒNG MỚI - FIXED ✅
// ==========================
exports.createRoom = async (req, res) => {
  try {
    console.log('📥 Create room request body:', req.body);
    console.log('📥 Uploaded file:', req.file);
    console.log('📥 User ID:', req.user?.id);

    const { name, description, privacy } = req.body;
    const ownerId = req.user.id;

    // Validate input
    if (!name || !name.trim()) {
      return res.status(400).json({ msg: 'Tên phòng không được để trống.' });
    }

    if (!req.file) {
      return res.status(400).json({ msg: 'Vui lòng tải lên ảnh bìa.' });
    }

    // Validate privacy value
    if (!['public', 'manual', 'private'].includes(privacy)) {
      return res.status(400).json({ msg: 'Loại phòng không hợp lệ.' });
    }

    const roomDetails = {
      name: name.trim(),
      description: description?.trim() || '',
      privacy,
      coverImage: req.file.path, // URL từ Cloudinary
      owner: ownerId,
      members: [ownerId], // Owner tự động là member
      status: 'waiting',
      startedAt: null,
      endedAt: null
    };

    // Tạo mã phòng cho private room
    if (privacy === 'private') {
      const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 6);
      roomDetails.roomCode = nanoid();
      console.log('🔑 Generated room code:', roomDetails.roomCode);
    }

    console.log('💾 Creating room with details:', roomDetails);

    let newRoom = new Room(roomDetails);
    await newRoom.save();

    console.log('✅ Room saved to DB:', newRoom._id);

    // Populate owner và members
    newRoom = await Room.findById(newRoom._id)
      .populate('owner', 'username avatar')
      .populate('members', 'username avatar');

    console.log('✅ Room populated:', newRoom);

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.emit('room-created', newRoom);
      console.log(`📢 Emitted 'room-created' for room: ${newRoom.name}`);
    } else {
      console.warn('⚠️ Socket.IO instance not found on app');
    }

    res.status(201).json({ 
      msg: 'Tạo phòng thành công!', 
      room: newRoom 
    });

  } catch (err) {
    console.error("❌ Lỗi khi tạo phòng:");
    console.error("Error name:", err.name);
    console.error("Error message:", err.message);
    console.error("Error stack:", err.stack);
    
    // Xử lý lỗi cụ thể
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ 
        msg: 'Dữ liệu không hợp lệ', 
        errors 
      });
    }

    if (err.code === 11000) {
      return res.status(400).json({ 
        msg: 'Mã phòng đã tồn tại, vui lòng thử lại.' 
      });
    }

    res.status(500).json({ 
      msg: 'Lỗi server khi tạo phòng', 
      error: err.message 
    });
  }
};

// ==========================
// LẤY CÁC PHÒNG ĐANG HOẠT ĐỘNG
// ==========================
exports.getActiveRooms = async (req, res) => {
  try {
    const activeRooms = await Room.find({ status: { $in: ['waiting', 'live'] } })
      .populate('owner', 'username avatar')
      .sort({ createdAt: -1 });

    res.status(200).json(activeRooms);
  } catch (err) {
    console.error("❌ Lỗi getActiveRooms:", err);
    res.status(500).json({ msg: 'Lỗi server', error: err.message });
  }
};

// ==========================
// BẮT ĐẦU PHIÊN LIVE
// ==========================
exports.startSession = async (req, res) => {
  try {
    const room = await Room.findById(req.params.roomId);
    if (!room) return res.status(404).json({ msg: 'Không tìm thấy phòng.' });

    if (room.owner.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Bạn không có quyền bắt đầu phiên.' });
    }

    room.status = 'live';
    await room.save();
    res.status(200).json({ msg: 'Phiên đã bắt đầu!', room });
  } catch (err) {
    console.error("❌ Lỗi startSession:", err);
    res.status(500).json({ msg: 'Lỗi server', error: err.message });
  }
};
// ==========================
// KẾT THÚC PHIÊN LIVE (CÓ DỌN FILE TẠM + Thống kê duration)
// ==========================
exports.endSession = async (req, res) => {
  try {
    const roomId = req.params.roomId;
    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ msg: "Không tìm thấy phòng." });

    if (room.owner.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ msg: "Bạn không có quyền kết thúc phiên." });
    }

    // 🧹 Dọn toàn bộ file rác player-script khi kết thúc phòng
    cleanupPlayerScripts();

    // ✅ Cập nhật trạng thái phòng và thời gian kết thúc
    room.status = "ended";
    room.endedAt = new Date();

    // 🔥 Tính tổng thời gian phiên (nếu có startedAt)
    if (room.startedAt) {
      const duration = Math.floor((room.endedAt - room.startedAt) / 1000); // seconds
      room.statistics.totalDuration = duration;
    }

    await room.save();

    // ⏰ BƯỚC 2: LẬP LỊCH DỌN DẸP FILE TRÊN CLOUD HOẶC LOCAL SAU 1 GIỜ
    scheduleRoomCleanup(roomId);

    // ✅ Gửi socket thông báo tới tất cả thành viên TRỪ chủ phòng
    const io = req.app.get("io");

    if (io) {
     const roomSockets = await io.in(roomId).fetchSockets();

  // Gửi thông báo "phòng đã kết thúc" đến TẤT CẢ sockets trong room
  roomSockets.forEach((socket) => {
    // ✅ FIX: Kiểm tra cả socket.userId để bao gồm admin ghost
    const socketUserId = socket.userId || socket.user?.id;

    // Chỉ KHÔNG gửi cho chính host (dựa vào userId)
    if (socketUserId !== req.user.id) {
      socket.emit("room-ended", {
        message: "Chủ phòng đã kết thúc phiên. Bạn sẽ được đưa về trang chủ.",
      });
       console.log(`📤 [END-SESSION] Sent room-ended to socket ${socket.id} (userId: ${socketUserId}, isGhost: ${socket.isGhostMode})`);
    }
  });

      // 🔔 Gửi tới toàn bộ client đang ở homepage để cập nhật danh sách phòng
      io.emit("room-ended-homepage", { roomId });

      // 🔄 Emit sự kiện membersCount = 0 để UI cập nhật ngay lập tức
  try {
    io.emit("room-members-changed", {
      roomId: String(roomId),
      membersCount: 0,
      totalJoins: room.statistics?.totalJoins || 0,
      peakMembers: room.statistics?.peakMembers || 0,
    });
    console.log("[END-SESSION] Emitted room-members-changed with membersCount=0");
  } catch (e) {
    console.warn("[END-SESSION] Could not emit room-members-changed:", e.message);
  }
}
    console.log(`📢 Phòng ${room.name} đã kết thúc lúc ${room.endedAt}`);
    console.log(`📢 Emitted 'room-ended-homepage' for room ID: ${roomId}`);

    // ✅ Phản hồi về client
    res.status(200).json({
      msg: "Phiên đã kết thúc. File tạm đã được dọn và tài nguyên trên Cloudinary sẽ được xóa sau 1 giờ.",
      room,
    });
    // Xóa các báo cáo liên quan ngay khi phiên kết thúc để tránh giữ báo cáo cũ
    try {
      await Report.deleteMany({ room: roomId });
      console.log(`[CLEANUP] Deleted reports for room ${roomId} on endSession`);
    } catch (e) {
      console.warn(`[CLEANUP] Failed to delete reports for room ${roomId} on endSession:`, e.message);
    }
  } catch (err) {
    console.error("❌ Lỗi endSession:", err);
    res.status(500).json({ msg: "Lỗi server", error: err.message });
  }
};

// ==========================
// THAM GIA PHÒNG - FIXED ✅
// ==========================
exports.joinRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;

    // ✅ 1. Chỉ lấy field cần thiết (tăng tốc truy vấn)
    let room = await Room.findById(roomId).select("owner members status privacy roomCode");
    if (!room || room.status === "ended") {
      return res.status(404).json({ msg: "Phòng không tồn tại hoặc đã kết thúc." });
    }

    // ✅ 2. Kiểm tra đã là member chưa
    const isMember = room.members.some((m) => m.toString() === userId);
    if (isMember) {
      // Dùng promise để trả về nhanh, populate chạy nền
      populateRoom(room._id).then((popRoom) => {
        const io = req.app.get("io");
        if (io) {
          io.to(roomId).emit("update-members", popRoom.members);
        }
      });
      return res.status(200).json({ msg: "Đã ở trong phòng.", roomId });
    }

    // ✅ 3. Kiểm tra quyền vào phòng (theo privacy)
    if (room.privacy === "private") {
      const { roomCode } = req.body;
      if (!roomCode || room.roomCode !== roomCode) {
        return res.status(403).json({ msg: "Mã phòng không chính xác." });
      }
    } else if (room.privacy === "manual") {
      return res.status(403).json({ msg: "Phòng này cần sự phê duyệt của chủ phòng." });
    }

    // ✅ 4. Thêm thành viên và lưu (chỉ lưu ID, không populate lúc này)
    room.members.push(userId);
    await room.save();

    // ⚡️ 5. Trả phản hồi NGAY LẬP TỨC cho frontend (join nhanh)
    res.status(200).json({
      msg: "Tham gia phòng thành công!",
      roomId: room._id,
      fastJoin: true,
    });

    // ✅ 6. Phần populate + socket emit sẽ chạy song song ở background
    (async () => {
      const fullRoom = await populateRoom(room._id);
      const io = req.app.get("io");
      if (!io) return;

      // Đảm bảo chủ phòng đứng đầu danh sách
      const ownerId = String(fullRoom.owner._id);
      const sortedMembers = [
        fullRoom.owner,
        ...fullRoom.members.filter((m) => String(m._id) !== ownerId),
      ];

      // ⚡️ Emit realtime cập nhật danh sách thành viên trong phòng
      io.to(roomId.toString()).emit("update-members", sortedMembers);
      console.log(`✅ [JOIN-ROOM FAST] User ${userId} joined room ${roomId}`);

      // ⚡️ Emit thông báo người mới tham gia
      const joinedUser = sortedMembers.find((m) => String(m._id) === userId);
      if (joinedUser) {
        io.to(roomId.toString()).emit("user-joined-notification", {
          username: joinedUser.username,
          avatar: joinedUser.avatar,
        });
      }
      try {
        const roomDoc = await Room.findById(room._id);
        if (roomDoc) {
          roomDoc.statistics = roomDoc.statistics || {};
          // Only count unique joiners once
          if (!roomDoc.uniqueJoiners.some(u => String(u) === String(userId))) {
            roomDoc.uniqueJoiners.push(userId);
            roomDoc.statistics.totalJoins = (roomDoc.statistics.totalJoins || 0) + 1;
          }
          const currentMembersCount = sortedMembers.length;
          roomDoc.statistics.peakMembers = Math.max(roomDoc.statistics.peakMembers || 0, currentMembersCount);
          await roomDoc.save();

          // Emit global room-members-changed for admin pages
          const ioPayload = {
            roomId: room._id.toString(),
            membersCount: currentMembersCount,
            totalJoins: roomDoc.statistics.totalJoins,
            peakMembers: roomDoc.statistics.peakMembers,
          };
          io.emit('room-members-changed', ioPayload);
          console.log('[JOIN-ROOM FAST] Emitted room-members-changed', ioPayload);
        }
      } catch (e) {
        console.warn('[JOIN-ROOM FAST] Could not update statistics or emit members-changed:', e.message);
      }
      console.log(`📤 [JOIN-ROOM FAST] Emitted update-members + user-joined-notification`);

      // ✅ THÊM MỚI: Phát sự kiện cập nhật thông tin phòng ra ngoài trang chủ
      io.emit("room-info-update", {
        roomId: fullRoom._id,
        memberCount: fullRoom.memberCount, // 🧠 Virtual property từ roomSchema
        status: fullRoom.status,
      });
      console.log(`📢 [BROADCAST] Emitted 'room-info-update' for homepage`);
    })().catch((e) => console.error("⚠️ Background joinRoom error:", e));
  } catch (err) {
    console.error("❌ Lỗi joinRoom:", err);
    res.status(500).json({ msg: "Lỗi server", error: err.message });
  }
};

// ==========================
// GỬI YÊU CẦU THAM GIA (manual)
// ==========================
exports.requestJoinRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.roomId);
    if (!room || room.status === 'ended') {
      return res.status(404).json({ msg: 'Phòng không tồn tại hoặc đã kết thúc.' });
    }
    if (room.privacy !== 'manual') {
      return res.status(400).json({ msg: 'Phòng này không yêu cầu xét duyệt.' });
    }

    const io = req.app.get('io');
    const userSockets = req.app.get('userSockets');
    
    const payload = {
      requester: {
        _id: req.user.id,
        username: req.user.username,
        avatar: req.user.avatar,
      },
      roomId: room._id.toString(),
    };
    
    console.log('📤 Sending join request:', payload);
    
    const hostSockets = userSockets.get(room.owner.toString());
    if (hostSockets && hostSockets.size > 0) {
      const firstSocketId = hostSockets.values().next().value;
      io.to(firstSocketId).emit('new-join-request', payload);
      console.log(`📩 Sent new-join-request to host socket ${firstSocketId}`);
    } else {
      console.log(`ℹ️ Host socket not found for user ${room.owner.toString()}`);
    }

    res.status(200).json({ msg: 'Yêu cầu tham gia đã được gửi đi.' });
  } catch (err) {
    console.error("❌ Lỗi requestJoinRoom:", err);
    res.status(500).json({ msg: 'Lỗi server', error: err.message });
  }
};

// ==========================
// LẤY CHI TIẾT PHÒNG
// ==========================
exports.getRoomDetails = async (req, res) => {
  try {
    // populateRoom helper đã lấy sẵn owner và members
    const room = await populateRoom(req.params.roomId);
    if (!room) {
      return res.status(404).json({ msg: 'Không tìm thấy phòng.' });
    }

    // Chuyển sang plain object để có thể chỉnh sửa
    const roomObject = room.toObject();

    // =============================================================
    // ▼▼▼ THAY ĐỔI: BỔ SUNG isHost VÀO DỮ LIỆU ▼▼▼
    // =============================================================
    
    // 1. Thêm `isHost` vào danh sách thành viên (members)
    if (roomObject.members && roomObject.members.length > 0) {
      roomObject.members = roomObject.members.map(member => ({
        ...member,
        isHost: roomObject.owner._id.equals(member._id)
      }));
    }

    // 2. Thêm `isHost` vào lịch sử trò chuyện (chat)
    if (roomObject.chat && roomObject.chat.length > 0) {
      roomObject.chat = roomObject.chat.map(message => ({
        ...message,
        id: message._id, // Đổi _id thành id cho nhất quán
        isHost: roomObject.owner._id.equals(message.userId)
      }));
    }
    
    // 3. Trả về object đã được chỉnh sửa
    res.json(roomObject);

  } catch (err) {
    console.error("❌ Lỗi getRoomDetails:", err);
    res.status(500).json({ msg: 'Lỗi server', error: err.message });
  }
};
// ==========================
// TÌM PHÒNG THEO MÃ
// ==========================
exports.searchRoomByCode = async (req, res) => {
  try {
    const { roomCode } = req.params;

    if (!roomCode || roomCode.length !== 6) {
      return res.status(400).json({ msg: 'Mã phòng không hợp lệ.' });
    }

    const room = await Room.findOne({ 
      roomCode: roomCode.toUpperCase(),
      status: { $in: ['waiting', 'live'] }
    }).populate('owner', 'username avatar');

    if (!room) {
      return res.status(404).json({ msg: 'Không tìm thấy phòng với mã này.' });
    }

    res.status(200).json({ 
      msg: 'Tìm thấy phòng!', 
      room: {
        _id: room._id,
        name: room.name,
        description: room.description,
        privacy: room.privacy,
        coverImage: room.coverImage,
        owner: room.owner
      }
    });
  } catch (err) {
    console.error("❌ Lỗi searchRoomByCode:", err);
    res.status(500).json({ msg: 'Lỗi server', error: err.message });
  }
};
// ==========================
// ADMIN JOIN PHÒNG Ở CHẾ ĐỘ MA (GHOST MODE)
// ==========================
exports.joinRoomAsGhost = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;

    // ✅ 1. Kiểm tra phòng có tồn tại không
    const room = await Room.findById(roomId)
      .populate('owner', 'username avatar')
      .populate('members', 'username avatar');

    if (!room) {
      return res.status(404).json({ msg: 'Phòng không tồn tại.' });
    }

    if (room.status === 'ended') {
      return res.status(400).json({ msg: 'Phòng đã kết thúc.' });
    }

    // ✅ 2. Kiểm tra user có phải admin không (double-check)
    if (req.user.role !== 'admin') {
      return res.status(403).json({ msg: 'Chỉ admin mới có thể sử dụng chế độ ghost.' });
    }

    // ✅ 3. KHÔNG thêm admin vào members array (đây là điểm quan trọng)
    // Chỉ trả về thông tin phòng để admin có thể vào

    console.log(`👻 [GHOST-JOIN] Admin ${req.user.username} joining room ${roomId} as ghost`);

    // ✅ 4. Trả về thông tin phòng đầy đủ
    res.status(200).json({
      msg: 'Tham gia phòng ở chế độ ghost thành công!',
      room: room,
      isGhostMode: true
    });

  } catch (err) {
    console.error('❌ Lỗi joinRoomAsGhost:', err);
    res.status(500).json({ msg: 'Lỗi server', error: err.message });
  }
};
// ==========================
// GỬI TIN NHẮN GHOST TỪ ADMIN (KHÔNG CẦN VÀO PHÒNG)
// ==========================
exports.sendGhostMessage = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { message } = req.body;
    const userId = req.user.id;

    // ✅ 1. Kiểm tra quyền admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ msg: 'Chỉ admin mới có thể gửi tin nhắn ghost.' });
    }

    // ✅ 2. Validate input
    if (!message || !message.trim()) {
      return res.status(400).json({ msg: 'Nội dung tin nhắn không được để trống.' });
    }

    // ✅ 3. Kiểm tra phòng có tồn tại không
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ msg: 'Phòng không tồn tại.' });
    }

    if (room.status === 'ended') {
      return res.status(400).json({ msg: 'Phòng đã kết thúc, không thể gửi tin nhắn.' });
    }

    // ✅ 4. Tạo tin nhắn ghost (tạm thời, không lưu vào DB)
    const ghostMessage = {
      id: `ghost-${Date.now()}-${Math.random()}`,
      userId: userId,
      username: '👻 Admin',
      avatar: '/images/admin-ghost-avatar.png',
      text: message.trim(),
      meta: {},
      createdAt: new Date(),
      isGhost: true
    };

    // ✅ 5. Lấy Socket.IO instance và gửi tin nhắn vào phòng
    const io = req.app.get('io');
    if (!io) {
      return res.status(500).json({ msg: 'Socket.IO không khả dụng.' });
    }

    // Gửi tin nhắn đến TẤT CẢ clients trong phòng
    io.to(roomId.toString()).emit('new-chat-message', ghostMessage);

    console.log(`👻 [GHOST-MESSAGE] Admin sent ghost message to room ${roomId}: "${message.substring(0, 50)}..."`);

    // ✅ 6. Trả về thành công
    res.status(200).json({
      msg: 'Tin nhắn ghost đã được gửi thành công!',
      message: ghostMessage
    });

  } catch (err) {
    console.error('❌ Lỗi sendGhostMessage:', err);
    res.status(500).json({ msg: 'Lỗi server', error: err.message });
  }
}