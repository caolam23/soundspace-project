// server/src/controllers/interactSocketHandler.js
// =============================================
// Audience Interaction Socket Events
// interact:reaction (batched), interact:gift
// =============================================

// Per-user throttle: max 3 reactions per second
const userReactionTimestamps = new Map(); // userId -> [timestamps]
const REACTION_WINDOW_MS = 1000;
const MAX_REACTIONS_PER_WINDOW = 3;

function isThrottled(userId) {
  const now = Date.now();
  const timestamps = (userReactionTimestamps.get(userId) || []).filter(t => now - t < REACTION_WINDOW_MS);
  if (timestamps.length >= MAX_REACTIONS_PER_WINDOW) return true;
  timestamps.push(now);
  userReactionTimestamps.set(userId, timestamps);
  return false;
}

// Clean up old throttle data every 30s
setInterval(() => {
  const now = Date.now();
  for (const [uid, timestamps] of userReactionTimestamps.entries()) {
    const fresh = timestamps.filter(t => now - t < REACTION_WINDOW_MS);
    if (fresh.length === 0) userReactionTimestamps.delete(uid);
    else userReactionTimestamps.set(uid, fresh);
  }
}, 30000);

function registerInteractHandlers(io, socket) {
  // ------------------------------------------
  // interact:reaction — audience sends emoji reaction
  // ------------------------------------------
  socket.on('interact:reaction', ({ roomId, type = 'heart' }) => {
    try {
      const uid = socket.userId || 'anon';
      if (!roomId) return;

      if (isThrottled(uid)) return; // silently drop if spam

      io.to(roomId).emit('interact:reaction-batch', { userId: uid, type, count: 1 });
    } catch (err) {
      console.error('[interactSocketHandler] interact:reaction error:', err);
    }
  });

  // ------------------------------------------
  // interact:gift — audience sends a gift (socket path, optional)
  // The REST endpoint is preferred; this is for direct socket path
  // ------------------------------------------
  socket.on('interact:gift', ({ roomId, gift, senderInfo }) => {
    try {
      if (!roomId || !gift) return;
      io.to(roomId).emit('interact:gift-received', {
        sender: senderInfo,
        gift,
        sentAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error('[interactSocketHandler] interact:gift error:', err);
    }
  });
}

module.exports = registerInteractHandlers;
