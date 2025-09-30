// server/src/controllers/roomController.js
const Room = require('../models/room.js');
const { customAlphabet } = require('nanoid'); // npm install nanoid

// ==========================
// TẠO PHÒNG MỚI
// ==========================
exports.createRoom = async (req, res) => {
    try {
        const { name, description, privacy } = req.body;
        const ownerId = req.user.id; // Lấy từ middleware xác thực (verifyToken)

        if (!req.file) {
            return res.status(400).json({ msg: 'Vui lòng tải lên ảnh bìa.' });
        }
        const coverImage = req.file.path;

        const roomDetails = {
            name,
            description,
            privacy,
            coverImage,
            owner: ownerId,
            members: [ownerId],
            status: 'waiting'
        };

        if (privacy === 'private') {
            const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 6);
            roomDetails.roomCode = nanoid();
        }

        const newRoom = new Room(roomDetails);
        await newRoom.save();

        res.status(201).json({ msg: 'Tạo phòng thành công!', room: newRoom });
    } catch (err) {
        console.error("Lỗi khi tạo phòng:", err);
        res.status(500).json({ msg: 'Lỗi server', error: err.message });
    }
};

// ===================================
// LẤY CÁC PHÒNG ĐANG HOẠT ĐỘNG (waiting & live)
// ===================================
exports.getActiveRooms = async (req, res) => {
    try {
        const activeRooms = await Room.find({ status: { $ne: 'ended' } })
            .populate('owner', 'username avatar')
            .sort({ createdAt: -1 });

        res.status(200).json(activeRooms);
    } catch (err) {
        console.error("Lỗi getActiveRooms:", err);
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
        console.error("Lỗi startSession:", err);
        res.status(500).json({ msg: 'Lỗi server', error: err.message });
    }
};

// ==========================
// KẾT THÚC PHIÊN LIVE
// ==========================
exports.endSession = async (req, res) => {
    try {
        const room = await Room.findById(req.params.roomId);
        if (!room) return res.status(404).json({ msg: 'Không tìm thấy phòng.' });

        if (room.owner.toString() !== req.user.id) {
            return res.status(403).json({ msg: 'Bạn không có quyền kết thúc phiên.' });
        }

        room.status = 'ended';
        await room.save();

        // 🔔 Gửi socket thông báo cho tất cả thành viên trong phòng
        const io = req.app.get('io');
        io.to(req.params.roomId).emit('room-ended', {
            message: 'Chủ phòng đã kết thúc phiên. Bạn sẽ được đưa về trang chủ.'
        });

        res.status(200).json({ msg: 'Phiên đã kết thúc!', room });
    } catch (err) {
        console.error("Lỗi endSession:", err);
        res.status(500).json({ msg: 'Lỗi server', error: err.message });
    }
};

// ==========================
// THAM GIA PHÒNG
// ==========================
exports.joinRoom = async (req, res) => {
    try {
        const room = await Room.findById(req.params.roomId);
        if (!room || room.status === 'ended') {
            return res.status(404).json({ msg: 'Phòng không tồn tại hoặc đã kết thúc.' });
        }

        if (room.members.includes(req.user.id) || room.owner.toString() === req.user.id) {
            return res.status(200).json({ msg: 'Đã ở trong phòng.', room });
        }

        if (room.privacy === 'private') {
            const { roomCode } = req.body;
            if (room.roomCode !== roomCode) {
                return res.status(403).json({ msg: 'Mã phòng không chính xác.' });
            }
        } else if (room.privacy === 'manual') {
            return res.status(403).json({ msg: 'Phòng này cần sự phê duyệt của chủ phòng.' });
        }

        room.members.push(req.user.id);
        await room.save();

        // 🔔 Thông báo socket có thành viên mới
        const io = req.app.get('io');
        io.to(room._id.toString()).emit('update-members', room.members);

        res.status(200).json({ msg: 'Tham gia phòng thành công!', room });
    } catch (err) {
        console.error("Lỗi joinRoom:", err.message);
        res.status(500).send('Lỗi Server');
    }
};

// ==========================
// GỬI YÊU CẦU THAM GIA (manual)
// ==========================
// GỬI YÊU CẦU THAM GIA (manual)
exports.requestJoinRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.roomId);
    if (!room || room.status === 'ended') {
      return res.status(404).json({ msg: 'Phòng không tồn tại hoặc đã kết thúc.' });
    }
    if (room.privacy !== 'manual') {
      return res.status(400).json({ msg: 'Phòng này không yêu cầu xét duyệt.' });
    }

    // Lấy io và userSockets từ app (server.js đã set)
    const io = req.app.get('io');
    const userSockets = req.app.get('userSockets'); // Map: userId -> socketId

    const payload = {
      requester: {
        _id: req.user._id || req.user.id || req.user, // bảo vệ trường hợp cấu trúc khác
        username: req.user.username,
        avatar: req.user.avatar,
      },
      roomId: room._id.toString(),
    };

    // 1) Gửi trực tiếp tới socket của host nếu host đang đăng ký
    const hostSocketId = userSockets.get(room.owner.toString());
    if (hostSocketId) {
      io.to(hostSocketId).emit('new-join-request', payload);
      console.log(`📩 Sent new-join-request to host socket ${hostSocketId}`);
    } else {
      console.log(`ℹ️ Host socket not found for user ${room.owner.toString()}`);
    }

    // 2) Đồng thời broadcast vào room (nếu host đang nằm trong room socket)
    io.to(room._id.toString()).emit('new-join-request', payload);

    res.status(200).json({ msg: 'Yêu cầu tham gia đã được gửi đi.' });
  } catch (err) {
    console.error("Lỗi requestJoinRoom:", err.message);
    res.status(500).send('Lỗi Server');
  }
};


// ==========================
// LẤY CHI TIẾT PHÒNG
// ==========================
exports.getRoomDetails = async (req, res) => {
    try {
        const room = await Room.findById(req.params.roomId)
            .populate('owner', 'username avatar')
            .populate('members', 'username avatar');

        if (!room) {
            return res.status(404).json({ msg: 'Không tìm thấy phòng.' });
        }

        res.json(room);
    } catch (err) {
        console.error("Lỗi getRoomDetails:", err.message);
        res.status(500).send('Lỗi Server');
    }
};