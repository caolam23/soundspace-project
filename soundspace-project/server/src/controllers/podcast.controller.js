/**
 * podcast.controller.js
 * - POST /api/podcasts/upload
 * Receives a recorded audio file (multipart/form-data -> field `file`)
 * Uploads to Cloudinary and creates a PodcastRecord entry.
 */

const cloudinary = require('cloudinary').v2;
const PodcastRecord = require('../models/PodcastRecord');
const Room = require('../models/room');

// Helper: convert multer memory buffer to data URI
function bufferToDataURI(mimeType, buffer) {
  const base64 = buffer.toString('base64');
  return `data:${mimeType};base64,${base64}`;
}

exports.uploadRecording = async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ message: 'Không có dữ liệu file âm thanh được gửi lên.' });
    }

    const { roomId, title, hostId, duration } = req.body;

    if (!roomId || !hostId) {
      return res.status(400).json({ message: 'Thiếu thông tin Phòng hoặc Chủ phòng.' });
    }

    // ========================================================
    // ✅ BẢO MẬT: KIỂM TRA GIỚI HẠN TỐI ĐA 5 BẢN GHI / 1 PHÒNG 
    // ========================================================
    const recordCount = await PodcastRecord.countDocuments({ room: roomId });
    if (recordCount >= 5) {
      return res.status(403).json({ 
        message: 'Phòng đã đạt giới hạn tối đa 5 bản ghi âm. Phiên Live đã kết thúc nhưng file âm thanh sẽ không được lưu để giảm tải hệ thống.' 
      });
    }

    // Convert to data URI and upload to Cloudinary
    const dataUri = bufferToDataURI(req.file.mimetype, req.file.buffer);

    const uploadResult = await cloudinary.uploader.upload(dataUri, {
      folder: 'soundspace-podcasts',
      resource_type: 'auto',
      chunk_size: 6000000,
    });

    // Create DB entry for the podcast record
    const record = new PodcastRecord({
      room: roomId,
      host: hostId,
      title: title || req.file.originalname || 'Untitled Podcast',
      duration: duration ? Number(duration) : (req.file.duration || 0),
      format: req.file.mimetype,
      cloudinary_url: uploadResult.secure_url,
      cloudinary_public_id: uploadResult.public_id,
      fileSize: req.file.size,
      meta: { uploadResult }
    });

    await record.save();

    // Optionally attach record id to Room records array (non-invasive)
    try {
      await Room.findByIdAndUpdate(roomId, { $push: { podcastRecords: record._id } });
    } catch (err) {
      console.warn('Could not push podcast record to Room:', err.message);
    }

    return res.json({ success: true, record });
  } catch (err) {
    console.error('[podcast.uploadRecording] error:', err);
    return res.status(500).json({ message: 'Lỗi máy chủ khi xử lý file', error: err.message });
  }
};