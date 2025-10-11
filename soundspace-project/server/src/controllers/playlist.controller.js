const Room = require("../models/room");
const ytdl = require("@distube/ytdl-core"); // Dùng bản ổn định
const { cloudinary } = require("../config/uploadConfig");
const getAudioDuration = require("get-audio-duration"); // npm install get-audio-duration

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

  if (!url || !url.trim()) return res.status(400).json({ msg: "Vui lòng cung cấp URL hợp lệ." });
  if (!ytdl.validateURL(url)) return res.status(400).json({ msg: "URL YouTube không hợp lệ." });

  try {
    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ msg: "Không tìm thấy phòng." });

    if (room.owner.toString() !== userId.toString())
      return res.status(403).json({ msg: "Chỉ chủ phòng mới được thêm nhạc." });

    // Check trùng URL & videoId
    const info = await getVideoInfoWithTimeout(url).catch(err => null);
    if (!info)
      return res.status(400).json({ msg: "Không thể lấy thông tin video từ YouTube." });

    const details = info.videoDetails;
    const videoId = details.videoId;

    if (room.playlist.some(t => t.url === url || t.sourceId === videoId))
      return res.status(409).json({ msg: "Bài hát đã tồn tại trong playlist." });

    const newTrack = {
      title: details.title,
      artist: details.ownerChannelName,
      thumbnail: details.thumbnails?.at(-1)?.url || "",
      duration: parseInt(details.lengthSeconds),
      source: "youtube",
      url,
      sourceId: videoId,
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

    const populatedRoom = await Room.findById(roomId).populate("playlist.addedBy", "username");

    const io = req.app.get("io");
    if (io) {
      io.to(roomId).emit("playback-state-changed", {
        playlist: populatedRoom.playlist,
        currentTrackIndex: room.currentTrackIndex,
        isPlaying: room.isPlaying,
        playbackStartTime: room.playbackStartTime,
      });
    }

    return res.status(201).json({ msg: "🎶 Đã thêm bài hát thành công!", playlist: populatedRoom.playlist });
  } catch (error) {
    console.error("🔥 Lỗi khi thêm nhạc:", error);
    return res.status(500).json({ msg: "Lỗi máy chủ. Vui lòng thử lại sau.", error: error.message });
  }
};

// ======================================================
// 🎧 THÊM BÀI HÁT QUA UPLOAD FILE
// ======================================================
exports.addTrackByUpload = async (req, res) => {
  const { roomId } = req.params;
  const userId = req.user?.id || req.user?._id;

  try {
    if (!req.files || !req.files.audio || !req.files.thumbnail)
      return res.status(400).json({ msg: "Vui lòng cung cấp cả file âm thanh và ảnh bìa." });

    const audioFile = req.files.audio[0];
    const thumbnailFile = req.files.thumbnail[0];

    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ msg: "Không tìm thấy phòng." });
    if (room.owner.toString() !== userId.toString())
      return res.status(403).json({ msg: "Chỉ chủ phòng mới có thể tải nhạc lên." });

    const uploadCount = room.playlist.filter(t => t.source === "upload").length;
    if (uploadCount >= 5)
      return res.status(400).json({ msg: "Bạn đã đạt giới hạn 5 bài hát tải lên cho phòng này." });

    // Upload lên Cloudinary
    const [audioUpload, thumbnailUpload] = await Promise.all([
      cloudinary.uploader.upload(audioFile.path, { resource_type: "video", folder: "soundspace-tracks" }),
      cloudinary.uploader.upload(thumbnailFile.path, { folder: "soundspace-thumbnails" }),
    ]);

    let durationInSeconds = 0;
    try { durationInSeconds = await getAudioDuration(audioUpload.secure_url); } catch {}

    const newTrack = {
      title: audioFile.originalname.replace(/\.[^/.]+$/, ""),
      artist: req.user.name || "Nghệ sĩ không xác định",
      thumbnail: thumbnailUpload.secure_url,
      duration: Math.round(durationInSeconds),
      source: "upload",
      url: audioUpload.secure_url,
      sourceId: audioUpload.public_id,
      addedBy: userId,
    };

    room.playlist.push(newTrack);
    await room.save();

    const io = req.app.get("io");
    if (io) io.to(roomId).emit("playlist-updated", room.playlist);

    return res.status(201).json({ msg: "Tải lên thành công!", playlist: room.playlist });
  } catch (err) {
    console.error("🔥 Lỗi khi upload nhạc:", err);
    return res.status(500).json({ msg: "Lỗi máy chủ." });
  }
};
