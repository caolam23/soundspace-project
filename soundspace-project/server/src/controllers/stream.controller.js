// =====================================================================
// 🎵 STREAM CONTROLLER - FIXED & OPTIMIZED
// =====================================================================

const ytdl = require('@distube/ytdl-core');
const { exec } = require('child_process');
const util = require('util');
const axios = require('axios');
const { LRUCache } = require('lru-cache'); // ✅ đúng cú pháp version mới

const execPromise = util.promisify(exec);

// =====================================================================
// ⚙️ CẤU HÌNH CACHE
// =====================================================================
const metaCache = new LRUCache({
  max: 200,             // Tối đa 200 video
  ttl: 1000 * 60 * 10,  // TTL = 10 phút
});

// =====================================================================
// ⚡ PREFETCH AUDIO (TẢI SẴN LINK)
// =====================================================================
const prefetchAudio = async (url) => {
  try {
    const headRes = await axios.head(url, { timeout: 3000 });
    if (headRes.status === 200) console.log('✅ Prefetched audio:', url);
  } catch (err) {
    console.warn('⚠️ Prefetch failed:', err.message);
  }
};

// =====================================================================
// 🎧 STREAM NHẠC SIÊU NHANH
// =====================================================================
exports.streamTrack = async (req, res) => {
  try {
    const { videoId } = req.params;
    if (!videoId) return res.status(400).json({ msg: 'Thiếu videoId' });

    const url = `https://www.youtube.com/watch?v=${videoId}`;
    console.log('🎬 Bắt đầu stream:', url);

    // 🔍 Kiểm tra cache
    if (metaCache.has(videoId)) {
      const cached = metaCache.get(videoId);
      console.log('🧠 Dùng cache:', cached.title);

      if (req.query.meta === 'true') return res.json(cached);

      return proxyStream(cached.audioUrl, res);
    }

    // =============================================================
    // 🧩 Thử bằng ytdl-core trước
    // =============================================================
    try {
      if (!ytdl.validateURL(url)) throw new Error('URL không hợp lệ');
      const info = await ytdl.getInfo(url);
      const { videoDetails } = info;

      const audioFormats = ytdl.filterFormats(info.formats, 'audioonly');
      const bestAudio = audioFormats.find(f => f.audioBitrate >= 128) || audioFormats[0];

      const meta = {
        id: videoId,
        title: videoDetails.title,
        thumbnail: videoDetails.thumbnails?.at(-1)?.url,
        audioUrl: bestAudio.url,
        url: `/api/stream/${videoId}`,
        source: 'ytdl-core',
      };

      metaCache.set(videoId, meta);
      prefetchAudio(bestAudio.url);

      if (req.query.meta === 'true') return res.json(meta);

      // Stream audio
      res.setHeader('Content-Type', 'audio/mp4');
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Cache-Control', 'public, max-age=300');
      res.setHeader('Access-Control-Allow-Origin', '*');

      console.log(`🎵 Đang phát (ytdl): ${videoDetails.title}`);

      const stream = ytdl.downloadFromInfo(info, {
        filter: 'audioonly',
        quality: 'highestaudio',
        highWaterMark: 1 << 26, // buffer lớn hơn
        liveBuffer: 4000,
      });

      stream.on('error', (err) => {
        console.error('🔥 Lỗi stream ytdl-core:', err.message);
        if (!res.headersSent) fallbackWithYtDlp(url, res);
      });

      return stream.pipe(res);
    } catch (err) {
      console.warn('⚠️ Lỗi ytdl-core:', err.message);
      console.log('➡️ Chuyển sang yt-dlp...');
    }

    // =============================================================
    // 🧩 Fallback khi ytdl-core lỗi
    // =============================================================
    await fallbackWithYtDlp(url, res, req.query.meta === 'true');

  } catch (error) {
    console.error('🔥 Lỗi không mong muốn trong streamTrack:', error.message);
    if (!res.headersSent) {
      res.status(500).json({ msg: 'Lỗi máy chủ khi stream âm thanh.' });
    }
  }
};

// =====================================================================
// 🎧 Proxy Stream (tải lại từ link audio trực tiếp)
// =====================================================================
async function proxyStream(audioUrl, res) {
  const response = await axios({
    method: 'GET',
    url: audioUrl,
    responseType: 'stream',
    headers: { 'User-Agent': 'Mozilla/5.0' },
  });

  res.setHeader('Content-Type', response.headers['content-type'] || 'audio/mp4');
  if (response.headers['content-length'])
    res.setHeader('Content-Length', response.headers['content-length']);

  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.setHeader('Access-Control-Allow-Origin', '*');

  response.data.pipe(res);
}

// =====================================================================
// 🧩 Fallback sang yt-dlp khi ytdl-core lỗi
// =====================================================================
async function fallbackWithYtDlp(url, res, metaOnly = false) {
  console.log('🎧 Fallback yt-dlp cho:', url);

  try {
    const { stdout } = await execPromise(
      `yt-dlp -j -f "bestaudio/best" --no-playlist --no-warnings --extractor-args "youtube:player_client=android" "${url}"`
    );

    const info = JSON.parse(stdout);
    const audioUrl =
      info.url || (info.formats?.find(f => f.acodec && f.acodec !== 'none')?.url);

    if (!audioUrl) throw new Error('Không tìm thấy audio hợp lệ');

    const meta = {
      id: info.id,
      title: info.title,
      thumbnail: info.thumbnails?.at(-1)?.url,
      audioUrl,
      url: `/api/stream/${info.id}`,
      source: 'yt-dlp',
    };

    metaCache.set(info.id, meta);
    prefetchAudio(audioUrl);

    if (metaOnly) return res.json(meta);

    console.log(`✅ Proxy từ yt-dlp: ${meta.title}`);
    return await proxyStream(audioUrl, res);

  } catch (err) {
    console.error('🔥 Lỗi fallback yt-dlp:', err.message);

    // Debug khi lỗi format
    if (err.message.includes('Requested format is not available')) {
      console.log('📋 Gợi ý format có sẵn:');
      try {
        const { stdout: list } = await execPromise(`yt-dlp -F "${url}"`);
        console.log(list);
      } catch (_) {}
    }

    if (!res.headersSent) {
      res.status(500).json({
        msg: 'Không thể stream bằng yt-dlp (đã thử fallback).',
        error: err.message,
      });
    }
  }
}
