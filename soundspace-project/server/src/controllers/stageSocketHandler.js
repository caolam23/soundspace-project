// server/src/controllers/stageSocketHandler.js
// =============================================
// Stage Socket Events
// stage:join, stage:leave, stage:toggle-media, stage:update-layout
// =============================================
const Room = require('../models/room');

const toId = (v) => (v == null ? null : String(v));

function registerStageHandlers(io, socket) {
  // ------------------------------------------
  // stage:join — user signals they are on stage
  // ------------------------------------------
  socket.on('stage:join', async ({ roomId }) => {
    try {
      const uid = socket.userId;
      if (!uid || !roomId) return;

      const room = await Room.findById(roomId).select('coHosts isLive');
      if (!room) return;

      // Check membership on stage (co-host)
      const coHost = room.coHosts.find(c => toId(c.userId) === uid);
      if (!coHost) return; // Must have been accepted first via REST

      socket.join(`stage:${roomId}`);
      console.log(`[STAGE] Socket ${socket.id} (user ${uid}) joined stage of room ${roomId}`);

      // Broadcast updated stage state to room
      io.to(roomId).emit('stage:state-update', { coHosts: room.coHosts, isLive: room.isLive });
    } catch (err) {
      console.error('[stageSocketHandler] stage:join error:', err);
    }
  });

  // ------------------------------------------
  // stage:leave — user leaves stage voluntarily
  // ------------------------------------------
  socket.on('stage:leave', async ({ roomId }) => {
    try {
      const uid = socket.userId;
      if (!uid || !roomId) return;

      const room = await Room.findById(roomId);
      if (!room) return;

      room.coHosts = room.coHosts.filter(c => toId(c.userId) !== uid);
      if (room.coHosts.length === 0) room.isLive = false;
      await room.save();

      socket.leave(`stage:${roomId}`);

      io.to(roomId).emit('stage:user-left', { userId: uid });
      io.to(roomId).emit('stage:state-update', { coHosts: room.coHosts, isLive: room.isLive });
      console.log(`[STAGE] User ${uid} left stage of room ${roomId}`);
    } catch (err) {
      console.error('[stageSocketHandler] stage:leave error:', err);
    }
  });

  // ------------------------------------------
  // stage:toggle-media — user mutes/unmutes mic or camera
  // ------------------------------------------
  socket.on('stage:toggle-media', async ({ roomId, micEnabled, camEnabled }) => {
    try {
      const uid = socket.userId;
      if (!uid || !roomId) return;

      const room = await Room.findById(roomId);
      if (!room) return;

      const coHostIdx = room.coHosts.findIndex(c => toId(c.userId) === uid);
      if (coHostIdx === -1) return; // Not on stage

      if (typeof micEnabled === 'boolean') room.coHosts[coHostIdx].micEnabled = micEnabled;
      if (typeof camEnabled === 'boolean') room.coHosts[coHostIdx].camEnabled = camEnabled;
      room.markModified('coHosts');
      await room.save();

      // Broadcast to entire room so all can update tile icon
      io.to(roomId).emit('stage:media-update', {
        userId: uid,
        micEnabled: room.coHosts[coHostIdx].micEnabled,
        camEnabled: room.coHosts[coHostIdx].camEnabled,
      });
    } catch (err) {
      console.error('[stageSocketHandler] stage:toggle-media error:', err);
    }
  });

  // ------------------------------------------
  // stage:update-layout — host changes grid layout preference
  // ------------------------------------------
  socket.on('stage:update-layout', ({ roomId, layout }) => {
    try {
      if (!roomId || !layout) return;
      // Just broadcast — layout is presentational, no DB persistence needed
      io.to(roomId).emit('stage:layout-changed', { layout });
    } catch (err) {
      console.error('[stageSocketHandler] stage:update-layout error:', err);
    }
  });
}

module.exports = registerStageHandlers;
