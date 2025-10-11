const Room = require('../models/room');
const ytdl = require('@distube/ytdl-core'); // Dùng bản ổn định hơn

// ======================================================
// ⚙️ HÀM HỖ TRỢ: LẤY THÔNG TIN VIDEO CÓ TIMEOUT AN TOÀN
// ======================================================
const getVideoInfoWithTimeout = (url, timeoutMs = 8000) => {
  return Promise.race([
    ytdl.getInfo(url),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout khi lấy info từ YouTube')), timeoutMs)
    ),
  ]);
};

// ======================================================
// 🎵 HÀM CHÍNH: THÊM BÀI HÁT VÀO PHÒNG
// ======================================================
exports.addTrack = async (req, res) => {
  const { roomId } = req.params;
  const { url } = req.body;
  const userId = req.user?.id || req.user?._id;

  // 1️⃣ Kiểm tra input cơ bản
  if (!url || !url.trim()) {
    return res.status(400).json({ msg: 'Vui lòng cung cấp URL hợp lệ.' });
  }
  if (!ytdl.validateURL(url)) {
    return res.status(400).json({ msg: 'URL YouTube không hợp lệ hoặc chưa được hỗ trợ.' });
  }

  try {
    // 2️⃣ Tìm phòng
    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ msg: 'Không tìm thấy phòng.' });

    // 3️⃣ Xác thực quyền chủ phòng
    if (room.owner.toString() !== userId.toString()) {
      return res.status(403).json({ msg: 'Chỉ chủ phòng mới được thêm nhạc.' });
    }

    // 4️⃣ Check trùng theo URL
    const existingTrack = room.playlist.find(track => track.url === url);
    if (existingTrack) {
      return res.status(409).json({ msg: 'Bài hát này đã có trong danh sách phát.' });
    }

    // 5️⃣ Lấy info video (có timeout + try/catch riêng)
    let info;
    try {
      console.log(`[YTDL] Đang lấy thông tin cho URL: ${url}`);
      info = await getVideoInfoWithTimeout(url);
      console.log(`[YTDL] ✅ Lấy thành công: ${info.videoDetails.title}`);
    } catch (err) {
      console.error(`[YTDL] ⚠️ Không thể lấy thông tin từ YouTube: ${err.message}`);
      return res.status(400).json({ msg: 'Không thể lấy thông tin video. Có thể video bị giới hạn hoặc không tồn tại.' });
    }

    const details = info.videoDetails;
    const videoId = details.videoId;

    // 6️⃣ Check trùng theo videoId (đảm bảo không thêm lại cùng bài)
    const duplicateById = room.playlist.find(track => track.sourceId === videoId);
    if (duplicateById) {
      return res.status(409).json({ msg: 'Bài hát này đã tồn tại trong playlist.' });
    }

    // 7️⃣ Tạo object bài hát mới
    const newTrack = {
      title: details.title,
      artist: details.ownerChannelName,
      thumbnail: details.thumbnails?.at(-1)?.url || '',
      duration: parseInt(details.lengthSeconds),
      source: 'youtube',
      url,
      sourceId: videoId,
      addedBy: userId,
      sourceType: 'link',
    };

    // 8️⃣ Thêm vào playlist và cập nhật trạng thái
    const shouldStartPlaying = room.playlist.length === 0 && !room.isPlaying;
    room.playlist.push(newTrack);

    if (shouldStartPlaying) {
      room.currentTrackIndex = 0;
      room.isPlaying = true;
      room.playbackStartTime = new Date();
    }

    await room.save();

    // 9️⃣ Populate để trả về thông tin người thêm
    const populatedRoom = await Room.findById(roomId)
      .populate('playlist.addedBy', 'username');

    // 🔟 Emit socket realtime cho các client trong phòng
    const io = req.app.get('io');
    if (io) {
      const fullPlaybackState = {
        playlist: populatedRoom.playlist,
        currentTrackIndex: room.currentTrackIndex,
        isPlaying: room.isPlaying,
        playbackStartTime: room.playbackStartTime,
      };
      io.to(roomId).emit('playback-state-changed', fullPlaybackState);
    }

    // ✅ Trả về kết quả cho client
    return res.status(201).json({
      msg: '🎶 Đã thêm bài hát thành công!',
      playlist: populatedRoom.playlist,
    });

  } catch (error) {
    console.error('🔥 Lỗi khi thêm nhạc:', error);
    return res.status(500).json({
      msg: 'Lỗi máy chủ. Vui lòng thử lại sau.',
      error: error.message,
    });
  }
};
