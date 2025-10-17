// server/src/services/cleanupService.js

const schedule = require('node-schedule');
const { cloudinary } = require('../config/uploadConfig');
const Room = require('../models/room.js');
const Report = require('../models/Report');

/**
 * Trích xuất public_id từ URL Cloudinary
 */
const extractPublicIdFromUrl = (url) => {
  if (!url) return null;
  try {
    const match = url.match(/(soundspace-[^/]+\/[^.]+)/);
    return match ? match[1] : null;
  } catch (e) {
    console.error(`Lỗi khi trích xuất public ID từ URL: ${url}`, e);
    return null;
  }
};

/**
 * 🧹 Hàm thực hiện dọn tài nguyên Cloudinary của phòng
 */
const cleanupRoomResources = async (roomId) => {
  console.log(`[BẮT ĐẦU DỌN DẸP] 🧹 Xóa tài nguyên cho phòng ${roomId}...`);
  try {
    const room = await Room.findById(roomId);

    if (!room || room.status !== 'ended') {
      console.log(`[HỦY DỌN DẸP] ❌ Phòng ${roomId} không hợp lệ để xóa hoặc đã bị xóa khỏi DB.`);
      return;
    }

    const imagePublicIds = new Set();
    const videoPublicIds = new Set();

    // Ảnh bìa
    const coverImageId = extractPublicIdFromUrl(room.coverImage);
    if (coverImageId) imagePublicIds.add(coverImageId);

    // Playlist
    if (room.playlist && room.playlist.length > 0) {
      for (const track of room.playlist) {
        if (track.source === 'upload') {
          if (track.sourceId) videoPublicIds.add(track.sourceId);
          const thumbId = extractPublicIdFromUrl(track.thumbnail);
          if (thumbId) imagePublicIds.add(thumbId);
        }
      }
    }

    // Gọi Cloudinary API để xóa
    const imageIds = Array.from(imagePublicIds);
    const videoIds = Array.from(videoPublicIds);

    if (imageIds.length > 0) {
      console.log(`[DỌN DẸP] Đang xóa ${imageIds.length} ảnh:`, imageIds);
      await cloudinary.api.delete_resources(imageIds, { resource_type: 'image' });
    }

    if (videoIds.length > 0) {
      console.log(`[DỌN DẸP] Đang xóa ${videoIds.length} audio:`, videoIds);
      await cloudinary.api.delete_resources(videoIds, { resource_type: 'video' });
    }

    console.log(`[DỌN DẸP THÀNH CÔNG] ✅ Đã xóa tài nguyên cho phòng ${roomId}.`);
  } catch (err) {
    console.error(`[DỌN DẸP THẤT BẠI] 🔥 Lỗi khi xóa tài nguyên cho phòng ${roomId}:`, err);
  }
};

/**
 * Sau khi dọn dẹp tài nguyên, xóa luôn bản ghi phòng và các báo cáo liên quan
 */
const finalizeRoomDeletion = async (roomId) => {
  try {
    // Delete reports first
    await Report.deleteMany({ room: roomId });
    console.log(`[CLEANUP] Deleted reports for room ${roomId}`);
  } catch (e) {
    console.warn(`[CLEANUP] Failed to delete reports for room ${roomId}:`, e.message);
  }

  try {
    await Room.findByIdAndDelete(roomId);
    console.log(`[CLEANUP] Deleted room document ${roomId} from DB`);
  } catch (e) {
    console.warn(`[CLEANUP] Failed to delete room ${roomId} from DB:`, e.message);
  }
};

/**
 * ⏰ Lên lịch dọn dẹp sau delayMs mili giây (mặc định 2 phút để test)
 */
// 2 tiếng
const scheduleRoomCleanup = (roomId, delayMs = 2 * 60 * 60 * 1000) => {
  const deletionTime = new Date(Date.now() + delayMs);
  console.log(`[LỊCH DỌN DẸP] ⏰ Tài nguyên phòng ${roomId} sẽ được xóa lúc ${deletionTime.toLocaleTimeString()}`);
  schedule.scheduleJob(deletionTime, async () => {
    await cleanupRoomResources(roomId);
    // finalize deletion (remove room doc + related reports)
    try { await finalizeRoomDeletion(roomId); } catch (e) { console.warn('[CLEANUP] finalizeRoomDeletion failed:', e.message); }
  });
};

const restoreScheduledCleanups = async () => {
  console.log('🔁 Đang khôi phục các lịch dọn dẹp phòng còn dang dở...');
  // Clean up any orphaned reports that reference non-existing rooms
  const removeOrphanReports = async () => {
    try {
      console.log('[CLEANUP] Checking for orphaned reports...');
      const allReports = await Report.find().select('_id room').lean();
      if (!allReports || allReports.length === 0) {
        console.log('[CLEANUP] No reports to check.');
        return;
      }
      const roomIds = Array.from(new Set(allReports.map(r => String(r.room)).filter(Boolean)));
      if (roomIds.length === 0) return;
      const existingRooms = await Room.find({ _id: { $in: roomIds } }).select('_id').lean();
      const existingSet = new Set(existingRooms.map(r => String(r._id)));
      const orphanReportIds = allReports.filter(r => !existingSet.has(String(r.room))).map(r => r._id);
      if (orphanReportIds.length > 0) {
        await Report.deleteMany({ _id: { $in: orphanReportIds } });
        console.log(`[CLEANUP] Deleted ${orphanReportIds.length} orphaned reports.`);
      } else {
        console.log('[CLEANUP] No orphaned reports found.');
      }
    } catch (e) {
      console.warn('[CLEANUP] removeOrphanReports failed:', e.message);
    }
  };

  await removeOrphanReports();
  const rooms = await Room.find({ status: 'ended', endedAt: { $exists: true } });
  const now = Date.now();

  for (const room of rooms) {
    const endedAt = new Date(room.endedAt).getTime();
    const elapsed = now - endedAt;
    const delayMs = 2 * 60 * 60 * 1000 - elapsed; // ⏰ 2 tiếng

    if (delayMs <= 0) {
      console.log(`⚡ Phòng ${room._id} đã hết thời hạn dọn — xóa ngay.`);
      await cleanupRoomResources(room._id);
    } else {
      console.log(`⏳ Phòng ${room._id} còn ${Math.round(delayMs / 1000)} giây nữa sẽ bị xóa.`);
      scheduleRoomCleanup(room._id, delayMs);
    }
  }

  console.log('✅ Khôi phục lịch dọn dẹp hoàn tất.');
};


module.exports = {
  scheduleRoomCleanup,
  restoreScheduledCleanups,
};
