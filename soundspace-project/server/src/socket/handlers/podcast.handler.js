/**
 * podcast.handler.js
 * Responsibilities:
 * - Handle WebRTC Signalling & Socket-based audio relay
 * - Cache WebM Header (Init Segment) for late joiners
 * - Sync active state & Mute state
 * - STRICT SERVER-SIDE VALIDATION: Query DB for duration, ignore client payload
 */

const Room = require('../../models/room');

const podcastTimers = new Map();
const podcastHeaders = new Map(); 
const activePodcasts = new Map();

module.exports = function registerPodcastHandlers(io, socket) {
  socket.on('podcast:join', ({ roomId, role }) => {
    if (!roomId) return;
    const roomName = `podcast:${roomId}`;
    socket.join(roomName);
    socket.role = role || 'listener';
    socket.podcastRoom = roomId;
    
    const roomSize = io.sockets.adapter.rooms.get(roomName)?.size || 0;
    console.log(`🎙️ [PODCAST] ${role || 'listener'} joined room: ${roomName} (total: ${roomSize} users)`);
    
    if (activePodcasts.has(roomId)) {
      const podcastData = activePodcasts.get(roomId);
      socket.emit('podcast:started', { 
        roomId, 
        meta: podcastData.meta,
        isMuted: podcastData.isMuted 
      });
      
      if (podcastHeaders.has(roomId)) {
        socket.emit('podcast:audio-chunk', {
          from: 'server-cache',
          chunk: podcastHeaders.get(roomId),
          seq: 0
        });
      }
    }
  });

  socket.on('podcast:leave', ({ roomId }) => {
    const roomName = `podcast:${roomId || socket.podcastRoom}`;
    if (roomName) {
      socket.leave(roomName);
      delete socket.podcastRoom;
    }
  });

  socket.on('podcast:signal', (payload) => {
    if (!payload || !payload.roomId) return;
    // ✅ BẢO MẬT: Chặn tín hiệu nếu phòng không Live
    if (!activePodcasts.has(payload.roomId)) return; 

    const roomName = `podcast:${payload.roomId}`;
    if (payload.to) {
      io.to(payload.to).emit('podcast:signal', Object.assign({}, payload, { from: socket.id }));
      return;
    }
    socket.to(roomName).emit('podcast:signal', Object.assign({}, payload, { from: socket.id }));
  });

  socket.on('podcast:audio-chunk', ({ roomId, chunk, seq }) => {
    if (!roomId || !chunk) return;
    // ✅ BẢO MẬT: Từ chối gói âm thanh nếu thời lượng live đã hết
    if (!activePodcasts.has(roomId)) return; 

    const roomName = `podcast:${roomId}`;
    
    if (seq === 0) podcastHeaders.set(roomId, chunk);
    socket.to(roomName).emit('podcast:audio-chunk', { from: socket.id, chunk, seq });
  });

  socket.on('podcast:host-mute', ({ roomId, muted }) => {
    if (!roomId) return;
    const roomName = `podcast:${roomId}`;
    
    if (activePodcasts.has(roomId)) {
      const currentData = activePodcasts.get(roomId);
      currentData.isMuted = muted;
      activePodcasts.set(roomId, currentData);
    }
    socket.to(roomName).emit('podcast:host-mute', { muted });
  });

  socket.on('podcast:host-start', async ({ roomId, meta }) => {
    if (!roomId) return;
    const roomName = `podcast:${roomId}`;
    
    let durationSec = 15 * 60; 

    try {
      const roomDoc = await Room.findById(roomId);
      if (roomDoc && roomDoc.podcastDuration) {
        durationSec = Number(roomDoc.podcastDuration);
      }
      
      await Room.findByIdAndUpdate(roomId, { $set: { podcastActive: true } });
    } catch (err) {
      console.error('[Podcast] Error fetching room duration:', err);
    }

    meta = meta || {};
    meta.duration = durationSec;

    activePodcasts.set(roomId, { meta, startTime: Date.now(), isMuted: false });
    podcastHeaders.delete(roomId);

    io.to(roomName).emit('podcast:started', { roomId, meta, isMuted: false });

    if (durationSec > 0) {
      if (podcastTimers.has(roomId)) clearTimeout(podcastTimers.get(roomId));
      
      const t = setTimeout(() => {
        io.to(roomName).emit('podcast:force-stop', { roomId, reason: 'timeup' });
        Room.findByIdAndUpdate(roomId, { $set: { podcastActive: false } }).catch(() => {});
        
        // Hết thời gian, Server xóa trạng thái Live, ngăn mọi gói dữ liệu mới lọt qua
        activePodcasts.delete(roomId);
        podcastHeaders.delete(roomId);
        podcastTimers.delete(roomId);
      }, durationSec * 1000);
      
      podcastTimers.set(roomId, t);
    }
  });

  socket.on('podcast:host-stop', async ({ roomId, recordingUrl }) => {
    if (!roomId) return;
    const roomName = `podcast:${roomId}`;
    
    activePodcasts.delete(roomId);
    podcastHeaders.delete(roomId);

    io.to(roomName).emit('podcast:stopped', { roomId, recordingUrl });

    try {
      await Room.findByIdAndUpdate(roomId, { $set: { podcastActive: false } });
    } catch (err) {}

    if (podcastTimers.has(roomId)) {
      clearTimeout(podcastTimers.get(roomId));
      podcastTimers.delete(roomId);
    }
  });

  socket.on('disconnect', () => {
    if (socket.podcastRoom) {
      socket.leave(`podcast:${socket.podcastRoom}`);
    }
  });
};