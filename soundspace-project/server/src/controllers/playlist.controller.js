const Room = require("../models/room");
const ytdl = require("@distube/ytdl-core");
const { cloudinary } = require("../config/uploadConfig");
const getAudioDuration = require("get-audio-duration");

// ======================================================
// ⚙️ HÀM HỖ TRỢ: LẤY THÔNG TIN VIDEO CÓ TIMEOUT AN TOÀN
// ======================================================
const getVideoInfoWithTimeout = (url, timeoutMs = 8000) => {
  return Promise.race([
    ytdl.getInfo(url),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Timeout khi lấy info từ YouTube")), timeoutMs)
    ),
  ]);
};

// ======================================================
// 🎵 THÊM BÀI HÁT TỪ LINK YOUTUBE
// ======================================================
// controllers/playlistController.js

exports.addTrack = async (req, res) => {
    const { roomId } = req.params;
    const { url } = req.body;
    const userId = req.user?.id || req.user?._id;

    if (!url?.trim()) return res.status(400).json({ msg: "Vui lòng cung cấp URL hợp lệ." });
    if (!ytdl.validateURL(url)) return res.status(400).json({ msg: "URL YouTube không hợp lệ." });

    try {
        const room = await Room.findById(roomId);
        if (!room) return res.status(404).json({ msg: "Không tìm thấy phòng." });
        if (room.owner.toString() !== userId.toString())
            return res.status(403).json({ msg: "Chỉ chủ phòng mới được thêm nhạc." });

        const ytCount = room.playlist.filter(t => t.source === "youtube").length;
        if (ytCount >= 8)
            return res.status(400).json({ msg: "Bạn đã đạt giới hạn 8 bài hát YouTube." });

        const info = await getVideoInfoWithTimeout(url).catch(() => null);
        if (!info) return res.status(400).json({ msg: "Không thể lấy thông tin video." });

        const details = info.videoDetails;
        if (room.playlist.some(t => t.sourceId === details.videoId))
            return res.status(409).json({ msg: "Bài hát đã tồn tại trong playlist." });

        const newTrack = {
            title: details.title,
            artist: details.ownerChannelName,
            thumbnail: details.thumbnails?.at(-1)?.url || "",
            duration: parseInt(details.lengthSeconds),
            source: "youtube",
            url,
            sourceId: details.videoId,
            addedBy: userId,
        };

        // ✅ LƯU TRẠNG THÁI CŨ
        const oldStatus = room.status;

        room.playlist.push(newTrack);

        if (room.playlist.length === 1 && !room.isPlaying) {
            room.currentTrackIndex = 0;
            room.isPlaying = true;
            room.playbackStartTime = new Date();
            
            if (room.status === "waiting") {
                room.status = "live";
                room.startedAt = new Date();
            }
        }

        await room.save();
        
        // ✅ LẤY TRẠNG THÁI MỚI
        const newStatus = room.status;
        const io = req.app.get("io");

        if (io) {
            // Gửi cập nhật cho người trong phòng
            io.to(roomId).emit("playback-state-changed", {
                playlist: room.playlist,
                currentTrackIndex: room.currentTrackIndex,
                isPlaying: room.isPlaying,
                playbackStartTime: room.playbackStartTime,
            });

            // ✅ BỔ SUNG: Gửi sự kiện thay đổi trạng thái nếu có
            if (oldStatus !== newStatus) {
                const payload = {
                    roomId: room._id.toString(),
                    status: newStatus,
                    startedAt: room.startedAt
                };
                io.emit('room-status-changed', payload);
                console.log(`📢 [ADD_TRACK] Broadcasted room-status-changed:`, payload);
            }
        }

        return res.status(201).json({ msg: "🎶 Đã thêm bài hát thành công!", playlist: room.playlist });
    } catch (error) {
        console.error("🔥 Lỗi khi thêm nhạc:", error);
        return res.status(500).json({ msg: "Lỗi máy chủ.", error: error.message });
    }
};
// ======================================================
// 🎧 THÊM BÀI HÁT QUA UPLOAD FILE (CLOUDINARY)
// ======================================================
// controllers/playlistController.js

exports.addTrackByUpload = async (req, res) => {
    const { roomId } = req.params;
    const userId = req.user?.id || req.user?._id;

    try {
        if (!req.files || !req.files.audio || !req.files.thumbnail)
            return res.status(400).json({ msg: "Vui lòng cung cấp cả file âm thanh và ảnh bìa." });

        const room = await Room.findById(roomId);
        if (!room) return res.status(404).json({ msg: "Không tìm thấy phòng." });
        if (room.owner.toString() !== userId.toString())
            return res.status(403).json({ msg: "Chỉ chủ phòng mới có thể tải nhạc lên." });
            
        const uploadCount = room.playlist.filter(t => t.source === "upload").length;
        if (uploadCount >= 5)
            return res.status(400).json({ msg: "Bạn đã đạt giới hạn 5 bài hát tải lên." });

        const [audioUpload, thumbnailUpload] = await Promise.all([
            cloudinary.uploader.upload(req.files.audio[0].path, { resource_type: "video", folder: "soundspace-tracks" }),
            cloudinary.uploader.upload(req.files.thumbnail[0].path, { folder: "soundspace-thumbnails" }),
        ]);

        const durationInSeconds = await getAudioDuration(audioUpload.secure_url).catch(() => 0);

        const newTrack = {
            title: req.files.audio[0].originalname.replace(/\.[^/.]+$/, ""),
            artist: req.user.name || "Nghệ sĩ không xác định",
            thumbnail: thumbnailUpload.secure_url,
            duration: Math.round(durationInSeconds),
            source: "upload",
            url: audioUpload.secure_url,
            sourceId: audioUpload.public_id,
            addedBy: userId,
        };

        // ✅ LƯU TRẠNG THÁI CŨ
        const oldStatus = room.status;

        room.playlist.push(newTrack);
    
        if (room.playlist.length === 1 && !room.isPlaying) {
            room.currentTrackIndex = 0;
            room.isPlaying = true;
            room.playbackStartTime = new Date();
            
            if (room.status === "waiting") {
                room.status = "live";
                room.startedAt = new Date();
            }
        }
    
        await room.save();
        
        // ✅ LẤY TRẠNG THÁI MỚI
        const newStatus = room.status;
        const io = req.app.get("io");

        if (io) {
            // Gửi cập nhật cho người trong phòng
            io.to(roomId).emit("playback-state-changed", {
                playlist: room.playlist,
                currentTrackIndex: room.currentTrackIndex,
                isPlaying: room.isPlaying,
                playbackStartTime: room.playbackStartTime,
            });

            // ✅ BỔ SUNG: Gửi sự kiện thay đổi trạng thái nếu có
            if (oldStatus !== newStatus) {
                const payload = {
                    roomId: room._id.toString(),
                    status: newStatus,
                    startedAt: room.startedAt
                };
                io.emit('room-status-changed', payload);
                console.log(`📢 [UPLOAD_TRACK] Broadcasted room-status-changed:`, payload);
            }
        }

        return res.status(201).json({ msg: "Tải lên thành công!", playlist: room.playlist });
    } catch (err) {
        console.error("🔥 Lỗi khi upload nhạc:", err);
        return res.status(500).json({ msg: "Lỗi máy chủ." });
    }
};

// ======================================================
// ❌ XOÁ BÀI HÁT KHỎI PLAYLIST
// ======================================================
exports.removeTrackFromPlaylist = async (req, res) => {
  try {
    const { roomId, trackId } = req.params;
    const userId = req.user?.id || req.user?._id;

    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ msg: "Không tìm thấy phòng." });

    // Chỉ chủ phòng mới được xóa
    if (room.owner.toString() !== userId.toString())
      return res.status(403).json({ msg: "Bạn không có quyền xóa bài hát." });

    const trackIndex = room.playlist.findIndex(t => t._id.toString() === trackId);
    if (trackIndex === -1)
      return res.status(404).json({ msg: "Không tìm thấy bài hát trong playlist." });

    // Nếu là file upload, xoá khỏi Cloudinary
    const deletedTrack = room.playlist[trackIndex];
    if (deletedTrack.source === "upload" && deletedTrack.sourceId) {
      try {
        await cloudinary.uploader.destroy(deletedTrack.sourceId, { resource_type: "video" });
      } catch (err) {
        console.warn("⚠️ Không thể xóa file Cloudinary:", err.message);
      }
    }

    // Xóa bài hát khỏi danh sách
    room.playlist.splice(trackIndex, 1);

    // === Cập nhật trạng thái phát ===
    if (room.currentTrackIndex === trackIndex) {
      if (room.playlist.length > 0) {
        room.currentTrackIndex = Math.min(trackIndex, room.playlist.length - 1);
        room.playbackStartTime = room.isPlaying ? new Date() : null;
      } else {
        room.isPlaying = false;
        room.currentTrackIndex = -1;
        room.playbackStartTime = null;
      }
    } else if (room.currentTrackIndex > trackIndex) {
      room.currentTrackIndex -= 1;
    }

    await room.save();

    const io = req.app.get("io");
    const roomState = {
      playlist: room.playlist,
      currentTrackIndex: room.currentTrackIndex,
      isPlaying: room.isPlaying,
      playbackStartTime: room.playbackStartTime,
    };
    if (io) io.to(roomId).emit("playback-state-changed", roomState);

    return res.status(200).json({ msg: "Đã xóa bài hát thành công.", playlist: room.playlist });
  } catch (error) {
    console.error("🔥 Lỗi khi xóa bài hát:", error);
    res.status(500).json({ msg: "Lỗi máy chủ." });
  }
};
