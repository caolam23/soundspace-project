const Room = require('../models/room.js');
const { customAlphabet } = require('nanoid');
const cleanupPlayerScripts = require('../utils/cleanupPlayerScripts'); // 🧹 Dọn file rác khi kết thúc phòng
// Helper: Populate owner + members
const populateRoom = async (roomId) => {
  return Room.findById(roomId)
    .populate('owner', 'username avatar')
    .populate('members', 'username avatar');
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
    if (!room) return res.status(404).json({ msg: 'Không tìm thấy phòng.' });

    if (room.owner.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Bạn không có quyền kết thúc phiên.' });
    }

    // 🧹 Dọn toàn bộ file rác player-script khi kết thúc phòng
    cleanupPlayerScripts();

    // ✅ Cập nhật trạng thái phòng và timestamp kết thúc
    room.status = 'ended';
    room.endedAt = new Date();

    // 🔥 Tính tổng thời gian phiên (nếu có startedAt)
    if (room.startedAt) {
      const duration = Math.floor((room.endedAt - room.startedAt) / 1000); // seconds
      room.statistics.totalDuration = duration;
    }

    await room.save();

    // ✅ Gửi socket thông báo tới tất cả thành viên TRỪ chủ phòng
const io = req.app.get('io');

if (io) {
  // Lấy danh sách socket của room
  const roomSockets = await io.in(roomId).fetchSockets();

  // Lọc socket của chủ phòng ra
  roomSockets.forEach(socket => {
    if (socket.user?.id !== req.user.id) {
      socket.emit('room-ended', {
        message: 'Chủ phòng đã kết thúc phiên. Bạn sẽ được đưa về trang chủ.'
      });
    }
  });

  // Gửi cho tất cả client ở homepage (ví dụ danh sách phòng)
  io.emit('room-ended-homepage', { roomId });
}

    console.log(`📢 Phòng ${room.name} đã kết thúc lúc ${room.endedAt}`);
    console.log(`📢 Emitted 'room-ended-homepage' for room ID: ${roomId}`);

    res.status(200).json({ msg: 'Phiên đã kết thúc, file tạm đã được dọn sạch, và thời lượng được tính toán.', room });
  } catch (err) {
    console.error("❌ Lỗi endSession:", err);
    res.status(500).json({ msg: 'Lỗi server', error: err.message });
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