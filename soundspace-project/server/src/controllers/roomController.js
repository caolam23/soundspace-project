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
// TẠO PHÒNG MỚI
// ==========================
exports.createRoom = async (req, res) => {
  try {
    const { name, description, privacy } = req.body;
    const ownerId = req.user.id;

    if (!req.file) {
      return res.status(400).json({ msg: 'Vui lòng tải lên ảnh bìa.' });
    }

    const roomDetails = {
      name,
      description,
      privacy,
      coverImage: req.file.path,
      owner: ownerId,
      members: [ownerId],
      status: 'waiting'
    };

    if (privacy === 'private') {
      const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 6);
      roomDetails.roomCode = nanoid();
    }

    let newRoom = new Room(roomDetails);
    await newRoom.save();

    newRoom = await populateRoom(newRoom._id);

    const io = req.app.get('io');
    io.emit('room-created', newRoom);
    console.log(`📢 Emitted 'room-created' for room: ${newRoom.name}`);

    res.status(201).json({ msg: 'Tạo phòng thành công!', room: newRoom });
  } catch (err) {
    console.error("❌ Lỗi khi tạo phòng:", err);
    res.status(500).json({ msg: 'Lỗi server', error: err.message });
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
// KẾT THÚC PHIÊN LIVE (CÓ DỌN FILE TẠM)
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

    // ✅ Cập nhật trạng thái phòng
    room.status = 'ended';
    await room.save();

    // ✅ Gửi socket thông báo
    const io = req.app.get('io');
    io.to(roomId).emit('room-ended', {
      message: 'Chủ phòng đã kết thúc phiên. Bạn sẽ được đưa về trang chủ.'
    });
    io.emit('room-ended-homepage', { roomId: roomId });
    console.log(`📢 Emitted 'room-ended-homepage' for room ID: ${roomId}`);

    res.status(200).json({ msg: 'Phiên đã kết thúc và file rác đã được dọn sạch.', room });
  } catch (err) {
    console.error("❌ Lỗi endSession:", err);
    res.status(500).json({ msg: 'Lỗi server', error: err.message });
  }
};

// ==========================
// THAM GIA PHÒNG
// ==========================
exports.joinRoom = async (req, res) => {
  try {
    let room = await Room.findById(req.params.roomId);
    if (!room || room.status === 'ended') {
      return res.status(404).json({ msg: 'Phòng không tồn tại hoặc đã kết thúc.' });
    }

    const userId = req.user.id;
    const isMember = room.members.some(m => m.toString() === userId);

    if (isMember) {
      room = await populateRoom(room._id);
      return res.status(200).json({ msg: 'Đã ở trong phòng.', room });
    }

    // Kiểm tra quyền tham gia
    if (room.privacy === 'private') {
      const { roomCode } = req.body;
      if (!roomCode || room.roomCode !== roomCode) {
        return res.status(403).json({ msg: 'Mã phòng không chính xác.' });
      }
    } else if (room.privacy === 'manual') {
      return res.status(403).json({ msg: 'Phòng này cần sự phê duyệt của chủ phòng.' });
    }

    // Thêm user vào danh sách
    room.members.push(userId);
    await room.save();

    room = await populateRoom(room._id);

    const io = req.app.get('io');
    const ownerId = String(room.owner._id);
    const ownerMember = room.members.find(m => String(m._id) === ownerId);
    const otherMembers = room.members.filter(m => String(m._id) !== ownerId);
    const sortedMembers = ownerMember ? [ownerMember, ...otherMembers] : room.members;

    io.to(room._id.toString()).emit('update-members', sortedMembers);
    console.log(`✅ [JOIN-ROOM API] User ${userId} joined room ${room._id}`);
    console.log(`📤 [JOIN-ROOM API] Emitted update-members with ${sortedMembers.length} members`);

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
