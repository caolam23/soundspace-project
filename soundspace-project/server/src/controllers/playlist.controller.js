const ytdl = require('@distube/ytdl-core');
const Room = require('../models/room'); // ✅ FIX LỖI QUAN TRỌNG

// Timeout wrapper cho ytdl
const getVideoInfoWithTimeout = (url, timeoutMs = 8000) => {
  return Promise.race([
    ytdl.getInfo(url),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout khi lấy info từ YouTube')), timeoutMs)
    ),
  ]);
};

exports.addTrack = async (req, res) => {
  const { roomId } = req.params;
  const { url } = req.body;
  const userId = req.user?.id || req.user?._id;

  try {
    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ msg: 'Không tìm thấy phòng' });

    if (room.owner.toString() !== userId.toString()) {
      return res.status(403).json({ msg: 'Bạn không có quyền thêm nhạc' });
    }

    if (!ytdl.validateURL(url)) {
      return res.status(400).json({ msg: 'URL không hợp lệ hoặc chưa được hỗ trợ' });
    }

    let info;
    try {
      console.log(`[YTDL] Đang lấy thông tin cho URL: ${url}`);
      info = await getVideoInfoWithTimeout(url);
      console.log(`[YTDL] Lấy thông tin thành công cho video: ${info.videoDetails.title}`);
    } catch (e) {
      console.error('⚠️ Không thể lấy info từ YouTube:', e.message);
      return res.status(400).json({ msg: 'Không thể lấy thông tin video' });
    }

    const details = info.videoDetails;
    const newTrack = {
      title: details.title,
      artist: details.ownerChannelName,
      thumbnail: details.thumbnails?.at(-1)?.url || '',
      duration: parseInt(details.lengthSeconds),
      source: 'youtube',
      url,
      sourceId: details.videoId,
      addedBy: userId,
    };

    const shouldStartPlaying = room.playlist.length === 0 && !room.isPlaying;
    room.playlist.push(newTrack);

    if (shouldStartPlaying) {
      room.currentTrackIndex = 0;
      room.isPlaying = true;
      room.playbackStartTime = new Date();
    }

    await room.save();

    const populatedRoom = await Room.findById(roomId)
      .populate('playlist.addedBy', 'username');

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

    // ✅ Trả phản hồi ngay để client cập nhật playlist
    return res.status(201).json({
      msg: 'Đã thêm bài hát thành công',
      playlist: populatedRoom.playlist,
    });

  } catch (error) {
    console.error('🔥 Lỗi khi thêm nhạc:', error);
    return res.status(500).json({ msg: 'Lỗi máy chủ', error: error.message });
  }
};
