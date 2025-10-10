const ytdl = require('ytdl-core');
const { exec } = require('child_process');
const util = require('util');
const axios = require('axios');
const execPromise = util.promisify(exec);

/**
 * 🎧 Stream nhạc an toàn — thử ytdl-core trước, nếu lỗi fallback sang yt-dlp
 */
exports.streamTrack = async (req, res) => {
  try {
    const { videoId } = req.params;
    if (!videoId) return res.status(400).json({ msg: 'Thiếu videoId' });

    const url = `https://www.youtube.com/watch?v=${videoId}`;
    console.log('🎬 Chuẩn bị stream nhạc từ:', url);

    // ✅ Ưu tiên ytdl-core
    try {
      const isValid = ytdl.validateURL(url);
      if (!isValid) throw new Error('URL không hợp lệ');

      const info = await ytdl.getInfo(url);
      const title = info.videoDetails.title;

      // 👉 Lấy thumbnail lớn nhất
      const thumbnails = info.videoDetails.thumbnails || [];
      const thumbnail = thumbnails.length > 0 ? thumbnails[thumbnails.length - 1].url : null;

      console.log(`🎵 Đang phát: ${title}`);

      // Nếu chỉ muốn gửi metadata (title, thumbnail) trước khi stream
      if (req.query.meta === "true") {
        return res.json({
          title,
          thumbnail,
          url: `/api/stream/${videoId}` // đường dẫn để frontend phát nhạc
        });
      }

      // Set headers cho audio
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Access-Control-Allow-Origin', '*');

      const audioStream = ytdl(url, {
        filter: 'audioonly',
        quality: 'highestaudio',
        highWaterMark: 1 << 25,
      });

      audioStream.on('error', (err) => {
        console.error('🔥 Lỗi trong quá trình stream (ytdl-core):', err);
        if (!res.headersSent) {
          res.status(500).end('Lỗi khi stream âm thanh từ YouTube (ytdl-core).');
        }
      });

      return audioStream.pipe(res);
    } catch (err) {
      console.warn('⚠️ Không thể lấy info bằng ytdl-core:', err.message);
      console.log('⚙️ Chuyển sang yt-dlp...');
    }

    // ✅ Fallback sang yt-dlp
    await fallbackWithYtDlp(url, res, req.query.meta === "true");

  } catch (error) {
    console.error('🔥 Lỗi không mong muốn trong streamTrack:', error);
    if (!res.headersSent) {
      res.status(500).json({ msg: 'Lỗi máy chủ khi stream âm thanh', error: error.message });
    }
  }
};

/**
 * 🎧 Fallback khi ytdl-core không chạy
 */
async function fallbackWithYtDlp(url, res, metaOnly = false) {
  console.log('🎧 Fallback yt-dlp cho:', url);

  try {
    const { stdout } = await execPromise(`yt-dlp -j -f "bestaudio" "${url}"`);
    const info = JSON.parse(stdout);

    const audioUrl =
      info.url ||
      (info.formats &&
        info.formats.find(f => f.acodec && f.acodec !== 'none' && f.url)?.url);

    if (!audioUrl) throw new Error('Không tìm thấy luồng âm thanh hợp lệ.');

    // 👉 Lấy thumbnail lớn nhất từ yt-dlp
    const thumbnails = info.thumbnails || [];
    const thumbnail = thumbnails.length > 0 ? thumbnails[thumbnails.length - 1].url : null;

    if (metaOnly) {
      return res.json({
        title: info.title,
        thumbnail,
        url: `/api/stream/${info.id}`
      });
    }

    console.log('✅ Proxy stream từ:', audioUrl);

    const response = await axios({
      method: 'GET',
      url: audioUrl,
      responseType: 'stream',
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    });

    res.setHeader('Content-Type', response.headers['content-type'] || 'audio/mp4');
    if (response.headers['content-length']) {
      res.setHeader('Content-Length', response.headers['content-length']);
    }
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Access-Control-Allow-Origin', '*');

    response.data.pipe(res);

  } catch (err) {
    console.error('🔥 Lỗi khi fallback yt-dlp:', err.message);
    if (!res.headersSent) {
      res.status(500).json({
        msg: 'Lỗi khi stream bằng yt-dlp',
        error: 'Không tìm thấy luồng âm thanh hợp lệ.',
      });
    }
  }
}