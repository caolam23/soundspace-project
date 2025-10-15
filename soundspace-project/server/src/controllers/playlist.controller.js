const Room = require("../models/room");
const ytdl = require("@distube/ytdl-core");
const { cloudinary } = require("../config/uploadConfig");
const { getAudioDurationInSeconds } = require("get-audio-duration");

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
exports.addTrack = async (req, res) => {
    const { roomId } = req.params;
    const { url } = req.body;
    const userId = req.user?.id || req.user?._id;

    // 🔍 LOG REQUEST
    console.log('========================================');
    console.log('[ADD_TRACK_YT] Request received');
    console.log('[ADD_TRACK_YT] roomId:', roomId);
    console.log('[ADD_TRACK_YT] userId:', userId);
    console.log('[ADD_TRACK_YT] url:', url);
    console.log('========================================');

    if (!url?.trim()) {
        console.error('[ADD_TRACK_YT] ❌ URL is empty');
        return res.status(400).json({ msg: "Vui lòng cung cấp URL hợp lệ." });
    }

    console.log('[ADD_TRACK_YT] 🔍 Validating YouTube URL...');
    const isValid = ytdl.validateURL(url);
    console.log('[ADD_TRACK_YT] Validation result:', isValid);
    
    if (!isValid) {
        console.error('[ADD_TRACK_YT] ❌ Invalid YouTube URL');
        return res.status(400).json({ msg: "URL YouTube không hợp lệ." });
    }
    
    console.log('[ADD_TRACK_YT] ✅ URL is valid');

    try {
        const room = await Room.findById(roomId);
        if (!room) {
            console.error('[ADD_TRACK_YT] ❌ Room not found:', roomId);
            return res.status(404).json({ msg: "Không tìm thấy phòng." });
        }
        
        console.log('[ADD_TRACK_YT] ✅ Room found:', room.name);
        
        if (room.owner.toString() !== userId.toString()) {
            console.error('[ADD_TRACK_YT] ❌ Unauthorized');
            return res.status(403).json({ msg: "Chỉ chủ phòng mới được thêm nhạc." });
        }
        
        console.log('[ADD_TRACK_YT] ✅ User authorized');

        const ytCount = room.playlist.filter(t => t.source === "youtube").length;
        console.log('[ADD_TRACK_YT] Current YouTube tracks:', ytCount + '/8');
        
        if (ytCount >= 8) {
            console.error('[ADD_TRACK_YT] ❌ YouTube limit reached');
            return res.status(400).json({ msg: "Bạn đã đạt giới hạn 8 bài hát YouTube." });
        }

        console.log('[ADD_TRACK_YT] 📥 Fetching video info from YouTube...');
        console.log('[ADD_TRACK_YT] Timeout: 8000ms');
        
        const info = await getVideoInfoWithTimeout(url, 8000).catch(err => {
            console.error('[ADD_TRACK_YT] ❌ Failed to get video info:', err.message);
            return null;
        });
        
        if (!info) {
            console.error('[ADD_TRACK_YT] ❌ No video info returned');
            return res.status(400).json({ msg: "Không thể lấy thông tin video. Video có thể bị giới hạn hoặc không tồn tại." });
        }
        
        console.log('[ADD_TRACK_YT] ✅ Video info retrieved successfully');

        const details = info.videoDetails;
        console.log('[ADD_TRACK_YT] Video ID:', details.videoId);
        console.log('[ADD_TRACK_YT] Title:', details.title);
        console.log('[ADD_TRACK_YT] Duration:', details.lengthSeconds, 'seconds');
        
        if (room.playlist.some(t => t.sourceId === details.videoId)) {
            console.error('[ADD_TRACK_YT] ❌ Video already in playlist');
            return res.status(409).json({ msg: "Bài hát đã tồn tại trong playlist." });
        }
        
        console.log('[ADD_TRACK_YT] ✅ Video not duplicated');

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

        // 🎵 Tự động phát nếu là bài đầu tiên
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
        
        console.log('[ADD_TRACK_YT] ✅ Track saved to database');
        console.log('[ADD_TRACK_YT] New playlist length:', room.playlist.length);
        
        // ✅ LẤY TRẠNG THÁI MỚI
        const newStatus = room.status;
        const io = req.app.get("io");

        if (io) {
            // Gửi cập nhật playback state
            io.to(roomId).emit("playback-state-changed", {
                playlist: room.playlist,
                currentTrackIndex: room.currentTrackIndex,
                isPlaying: room.isPlaying,
                playbackStartTime: room.playbackStartTime,
            });

            // ✅ Gửi sự kiện thay đổi trạng thái nếu có
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
        console.error("========================================");
        console.error("🔥 [ADD_TRACK_YT] ERROR CAUGHT:");
        console.error("Message:", error.message);
        console.error("Stack:", error.stack);
        console.error("========================================");
        return res.status(500).json({ 
            msg: "Lỗi máy chủ.", 
            error: error.message,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

// ======================================================
// 🎧 THÊM BÀI HÁT QUA UPLOAD FILE (CLOUDINARY)
// ======================================================
exports.addTrackByUpload = async (req, res) => {
    const { roomId } = req.params;
    const userId = req.user?.id || req.user?._id;

    // 🔍 LOG REQUEST
    console.log('========================================');
    console.log('[UPLOAD] Request received');
    console.log('[UPLOAD] roomId:', roomId);
    console.log('[UPLOAD] userId:', userId);
    console.log('[UPLOAD] req.files:', req.files ? Object.keys(req.files) : 'null');
    console.log('[UPLOAD] req.body:', req.body);
    console.log('========================================');

    try {
        // ✅ Kiểm tra file
        if (!req.files) {
            console.error('[UPLOAD] ❌ req.files is null or undefined');
            return res.status(400).json({ msg: "Không có file nào được tải lên." });
        }

        if (!req.files.audio) {
            console.error('[UPLOAD] ❌ req.files.audio is missing');
            console.log('[UPLOAD] Available fields:', Object.keys(req.files));
            return res.status(400).json({ msg: "Thiếu file âm thanh." });
        }

        if (!req.files.thumbnail) {
            console.error('[UPLOAD] ❌ req.files.thumbnail is missing');
            console.log('[UPLOAD] Available fields:', Object.keys(req.files));
            return res.status(400).json({ msg: "Thiếu file ảnh bìa." });
        }

        console.log('[UPLOAD] ✅ Files validated successfully');
        console.log('[UPLOAD] Audio file:', req.files.audio[0]?.originalname);
        console.log('[UPLOAD] Thumbnail file:', req.files.thumbnail[0]?.originalname);

        const room = await Room.findById(roomId);
        if (!room) {
            console.error('[UPLOAD] ❌ Room not found:', roomId);
            return res.status(404).json({ msg: "Không tìm thấy phòng." });
        }
        
        console.log('[UPLOAD] ✅ Room found:', room.name);
        
        if (room.owner.toString() !== userId.toString()) {
            console.error('[UPLOAD] ❌ Unauthorized:', { owner: room.owner, user: userId });
            return res.status(403).json({ msg: "Chỉ chủ phòng mới có thể tải nhạc lên." });
        }
        
        console.log('[UPLOAD] ✅ User authorized');
            
        const uploadCount = room.playlist.filter(t => t.source === "upload").length;
        if (uploadCount >= 5) {
            console.error('[UPLOAD] ❌ Upload limit reached:', uploadCount);
            return res.status(400).json({ msg: "Bạn đã đạt giới hạn 5 bài hát tải lên." });
        }
        
        console.log('[UPLOAD] ✅ Upload limit OK:', uploadCount + '/5');

        // ✅ Upload lên Cloudinary
        console.log(`[UPLOAD] 📤 Uploading to Cloudinary...`);
        console.log(`[UPLOAD] Audio path:`, req.files.audio[0].path);
        console.log(`[UPLOAD] Thumbnail path:`, req.files.thumbnail[0].path);
        
        const [audioUpload, thumbnailUpload] = await Promise.all([
            cloudinary.uploader.upload(req.files.audio[0].path, { 
                resource_type: "video", 
                folder: "soundspace-tracks" 
            }).catch(err => {
                console.error('[UPLOAD] ❌ Audio upload failed:', err.message);
                throw new Error(`Audio upload failed: ${err.message}`);
            }),
            cloudinary.uploader.upload(req.files.thumbnail[0].path, { 
                folder: "soundspace-thumbnails" 
            }).catch(err => {
                console.error('[UPLOAD] ❌ Thumbnail upload failed:', err.message);
                throw new Error(`Thumbnail upload failed: ${err.message}`);
            }),
        ]);

        console.log(`[UPLOAD] ✅ Audio uploaded:`, audioUpload.secure_url);
        console.log(`[UPLOAD] ✅ Thumbnail uploaded:`, thumbnailUpload.secure_url);

        // ✅ Lấy duration
        console.log('[UPLOAD] 🔍 Getting audio duration...');
        console.log('[UPLOAD] getAudioDurationInSeconds type:', typeof getAudioDurationInSeconds);
        
        const durationInSeconds = await getAudioDurationInSeconds(audioUpload.secure_url).catch(err => {
            console.warn(`[UPLOAD] ⚠️ Cannot get duration:`, err.message);
            return 0;
        });
        
        console.log('[UPLOAD] ✅ Duration:', durationInSeconds, 'seconds');

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
    
        // 🎵 Tự động phát nếu là bài đầu tiên
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
        console.log(`[UPLOAD] Đã lưu track vào DB, playlist length: ${room.playlist.length}`);
        
        // ✅ LẤY TRẠNG THÁI MỚI
        const newStatus = room.status;
        const io = req.app.get("io");

        if (io) {
            // Gửi cập nhật playback state
            io.to(roomId).emit("playback-state-changed", {
                playlist: room.playlist,
                currentTrackIndex: room.currentTrackIndex,
                isPlaying: room.isPlaying,
                playbackStartTime: room.playbackStartTime,
            });

            console.log(`[UPLOAD] Đã emit playback-state-changed cho room ${roomId}`);

            // ✅ Gửi sự kiện thay đổi trạng thái nếu có
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
        console.error("========================================");
        console.error("🔥 [UPLOAD] ERROR CAUGHT:");
        console.error("Message:", err.message);
        console.error("Stack:", err.stack);
        console.error("========================================");
        return res.status(500).json({ 
            msg: "Lỗi máy chủ.", 
            error: err.message,
            details: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
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