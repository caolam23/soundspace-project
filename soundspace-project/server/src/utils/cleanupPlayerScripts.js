const fs = require('fs');
const path = require('path');

/**
 * Dọn dẹp file player-script rác
 * @param {string} targetDir - Đường dẫn thư mục cần dọn (mặc định: thư mục gốc server)
 */
async function cleanupPlayerScripts(targetDir = path.resolve(__dirname, '../../')) {
  try {
    // Kiểm tra thư mục
    if (!fs.existsSync(targetDir)) {
      console.warn(`⚠️ Thư mục không tồn tại: ${targetDir}`);
      return;
    }

    const files = await fs.promises.readdir(targetDir);
    const jsFiles = files.filter(f => f.endsWith('-player-script.js'));

    if (jsFiles.length === 0) {
      console.log('✅ Không có file player-script rác nào.');
      return;
    }

    console.log(`🔍 Tìm thấy ${jsFiles.length} file player-script rác.`);

    for (const file of jsFiles) {
      const filePath = path.join(targetDir, file);
      try {
        await fs.promises.unlink(filePath);
        console.log('🧹 Đã xóa:', file);
      } catch (err) {
        console.error('⚠️ Lỗi khi xóa', file, '-', err.message);
      }
    }

    console.log('✨ Hoàn tất dọn dẹp player-script.');
  } catch (err) {
    console.error('❌ Lỗi khi dọn dẹp player-script:', err.message);
  }
}

module.exports = cleanupPlayerScripts;
