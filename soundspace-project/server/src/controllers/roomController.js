const Room = require('../models/room.js');
const { customAlphabet } = require('nanoid');

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
// KẾT THÚC PHIÊN LIVE - FIXED ✅
// ==========================
exports.endSession = async (req, res) => {
  try {
    const roomId = req.params.roomId;
    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ msg: 'Không tìm thấy phòng.' });

    if (room.owner.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Bạn không có quyền kết thúc phiên.' });
    }

    // ✅ Cập nhật cả status và endedAt
    room.status = 'ended';
    room.endedAt = new Date(); // Thêm timestamp kết thúc
    
    // 🔥 Tính tổng thời gian phiên (nếu có startedAt)
    if (room.startedAt) {
      const duration = Math.floor((room.endedAt - room.startedAt) / 1000); // seconds
      room.statistics.totalDuration = duration;
    }
    
    await room.save();

    const io = req.app.get('io');

    io.to(roomId).emit('room-ended', {
      message: 'Chủ phòng đã kết thúc phiên. Bạn sẽ được đưa về trang chủ.'
    });

    io.emit('room-ended-homepage', { roomId: roomId });
    console.log(`📢 Phòng ${room.name} đã kết thúc lúc ${room.endedAt}`);

    res.status(200).json({ msg: 'Phiên đã kết thúc!', room });
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
    let room = await Room.findById(req.params.roomId);
    if (!room || room.status === 'ended') {
      return res.status(404).json({ msg: 'Phòng không tồn tại hoặc đã kết thúc.' });
    }

    const userId = req.user.id;
    const isMember = room.members.some(m => m.toString() === userId);

    // Nếu đã là member rồi thì trả về luôn
    if (isMember) {
      room = await populateRoom(room._id);
      return res.status(200).json({ msg: 'Đã ở trong phòng.', room });
    }

    // ✅ Kiểm tra điều kiện join theo privacy
    if (room.privacy === 'private') {
      const { roomCode } = req.body;
      if (!roomCode || room.roomCode !== roomCode) {
        return res.status(403).json({ msg: 'Mã phòng không chính xác.' });
      }
      // Mã đúng → cho phép join
    } else if (room.privacy === 'manual') {
      // Manual cần approval từ host, không cho join trực tiếp qua API
      return res.status(403).json({ msg: 'Phòng này cần sự phê duyệt của chủ phòng.' });
    }
    // Nếu là public → không cần kiểm tra gì

    // ✅ Thêm user vào members
    room.members.push(userId);
    await room.save();
    
    // ✅ Populate để lấy thông tin đầy đủ
    room = await populateRoom(room._id);

    // ✅ Emit socket update-members cho TẤT CẢ các privacy types
    const io = req.app.get('io');
    
    // Đảm bảo owner đứng đầu danh sách
    const ownerId = String(room.owner._id);
    const ownerMember = room.members.find(m => String(m._id) === ownerId);
    const otherMembers = room.members.filter(m => String(m._id) !== ownerId);
    const sortedMembers = ownerMember ? [ownerMember, ...otherMembers] : room.members;
    
    // ✅ Emit realtime update
    io.to(room._id.toString()).emit('update-members', sortedMembers);
    console.log(`✅ [JOIN-ROOM API] User ${userId} joined room ${room._id}`);
    console.log(`📤 [JOIN-ROOM API] Emitted update-members with ${sortedMembers.length} members`);
    // Notify everyone in room that a user has joined (transient notification)
    try {
      const joinedMember = sortedMembers.find(m => String(m._id) === String(userId));
      if (joinedMember) {
        io.to(room._id.toString()).emit('user-joined-notification', { username: joinedMember.username, avatar: joinedMember.avatar });
        console.log(`[JOIN-ROOM API] Emitted user-joined-notification for ${joinedMember.username}`);
      }
    } catch (e) {
      console.warn('[JOIN-ROOM API] Could not emit user-joined-notification:', e.message);
    }

    res.status(200).json({ msg: 'Tham gia phòng thành công!', room });
  } catch (err) {
    console.error("❌ Lỗi joinRoom:", err);
    res.status(500).json({ msg: 'Lỗi server', error: err.message });
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
    const room = await populateRoom(req.params.roomId);
    if (!room) {
      return res.status(404).json({ msg: 'Không tìm thấy phòng.' });
    }
    res.json(room);
  } catch (err) {
    console.error("❌ Lỗi getRoomDetails:", err);
    res.status(500).json({ msg: 'Lỗi server', error: err.message });
  }
};