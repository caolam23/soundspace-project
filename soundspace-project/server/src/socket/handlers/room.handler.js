/**
 * Room Socket Event Handlers
 * 
 * Handles all room-related events:
 * - join-room: Regular user joins room
 * - request-to-join: User requests to join private room (approval-based)
 * - respond-to-request: Host approves/denies join request
 * - join-room-ghost: Admin joins room without affecting statistics
 * - leave-room-ghost: Admin leaves room ghostly
 * - leave-room: User leaves room
 * 
 * Manages room member lists, statistics (peakMembers, totalJoins), and approval cache
 */

const Room = require('../../models/room');
const User = require('../../models/User');
const { userSockets, joinApprovals, APPROVAL_TTL, toId } = require('../store');

/**
 * Helper: Sort members with room owner first
 */
const sortMembersWithOwnerFirst = (room) => {
  const ownerId = String(room.owner._id);
  const ownerMember = room.members.find(m => String(m._id) === ownerId);
  const otherMembers = room.members.filter(m => String(m._id) !== ownerId);
  return ownerMember ? [ownerMember, ...otherMembers] : room.members;
};

/**
 * Helper: Handle approval of join request
 * Updates DB, emits notifications, and manages statistics
 */
const handleApproveRequest = async (io, roomId, requester, room) => {
  try {
    const reqIdStr = toId(requester._id);
    const requesterSockets = userSockets.get(reqIdStr);

    // Add to room members if not already there
    if (!room.members.some(m => String(m) === reqIdStr)) {
      room.members.push(reqIdStr);
      await room.save();
    }

    // Mark approval in cache (within APPROVAL_TTL, next request will auto-approve)
    joinApprovals.set(`${roomId}-${reqIdStr}`, Date.now());

    // Fetch updated room with populated fields
    const populatedRoom = await Room.findById(roomId)
      .populate('owner', 'username avatar')
      .populate('members', 'username avatar');

    const sortedMembers = sortMembersWithOwnerFirst(populatedRoom);

    // Notify requester that join was accepted
    if (requesterSockets) {
      requesterSockets.forEach(sid => {
        io.to(sid).emit('join-request-accepted', { roomId, room: populatedRoom });
      });
    }

    // Update member list for all clients in room
    io.to(roomId).emit('update-members', sortedMembers);

    // Emit user-joined notification
    try {
      const joinedMember = sortedMembers.find(m => String(m._id) === reqIdStr);
      if (joinedMember) {
        io.to(roomId).emit('user-joined-notification', {
          username: joinedMember.username,
          avatar: joinedMember.avatar,
        });
      }
    } catch (e) {
      console.warn('[APPROVE-REQ] Could not emit user-joined-notification:', e.message);
    }

    // Update room statistics
    try {
      const roomDoc = await Room.findById(roomId);
      if (roomDoc && roomDoc.status !== 'ended') {
        roomDoc.statistics = roomDoc.statistics || {};
        if (reqIdStr && !roomDoc.uniqueJoiners.some(u => String(u) === reqIdStr)) {
          roomDoc.uniqueJoiners.push(reqIdStr);
          roomDoc.statistics.totalJoins = (roomDoc.statistics.totalJoins || 0) + 1;
        }
        roomDoc.statistics.peakMembers = Math.max(
          roomDoc.statistics.peakMembers || 0,
          sortedMembers.length
        );
        await roomDoc.save();

        // Broadcast updated statistics to admin dashboard
        const payload = {
          roomId: String(roomId),
          membersCount: sortedMembers.length,
          totalJoins: roomDoc.statistics.totalJoins,
          peakMembers: roomDoc.statistics.peakMembers,
        };
        io.emit('room-members-changed', payload);
        console.log('[APPROVE-REQ] Emitted room-members-changed', payload);
      }
    } catch (e) {
      console.warn('[APPROVE-REQ] Could not update stats:', e.message);
    }
  } catch (err) {
    console.error('[APPROVE-REQ] Error:', err);
  }
};

const registerRoomHandlers = (io, socket) => {
  /**
   * Join room (regular join)
   * Auto-registers user as member and updates statistics
   * Skips if socket is in ghost mode (admin observation mode)
   */
  socket.on('join-room', async (roomId) => {
    try {
      // Skip if socket is in ghost mode (admin observation)
      if (socket.isGhostMode) {
        console.log(
          `⚠️ [JOIN-ROOM] Socket ${socket.id} is in ghost mode, ignoring join-room event`
        );
        return;
      }

      socket.join(roomId);
      console.log(
        `[JOIN-ROOM] Socket ${socket.id} (userId: ${socket.userId}) joined room ${roomId}`
      );

      const room = await Room.findById(roomId)
        .populate('owner', 'username avatar')
        .populate('members', 'username avatar');

      if (!room) {
        console.log(`[JOIN-ROOM] Room not found: ${roomId}`);
        return;
      }

      // Auto-add authenticated member to DB (if not already member and room not ended)
      try {
        const uid = socket.userId || null;
        if (
          uid &&
          !room.members.some(m => String(m._id || m) === String(uid)) &&
          room.status !== 'ended'
        ) {
          await Room.findByIdAndUpdate(roomId, {
            $push: { members: uid },
            $inc: { 'statistics.totalJoins': 1 },
          });

          // Update peakMembers if current member count exceeds it
          try {
            const fresh = await Room.findById(roomId)
              .select('statistics members')
              .lean();
            if (fresh) {
              const peak = Math.max(
                fresh.statistics?.peakMembers || 0,
                (fresh.members || []).length
              );
              await Room.findByIdAndUpdate(roomId, { 'statistics.peakMembers': peak });
            }
          } catch (e) {
            console.warn('[JOIN-ROOM] Could not update peakMembers:', e.message);
          }
        }
      } catch (e) {
        console.warn('[JOIN-ROOM] Auto-join stats update failed:', e.message);
      }

      // Send initial playback state to new socket
      const currentPlaybackState = {
        playlist: room.playlist,
        currentTrackIndex: room.currentTrackIndex,
        isPlaying: room.isPlaying,
        playbackStartTime: room.playbackStartTime,
      };
      socket.emit('playback-state-changed', currentPlaybackState);
      console.log(`[JOIN-ROOM] Sent initial playback state to socket ${socket.id}`);

      // Broadcast updated member list
      const sortedMembers = sortMembersWithOwnerFirst(room);
      io.to(roomId).emit('update-members', sortedMembers);

      // Emit room-members-changed for admin dashboard
      try {
        const roomObj = await Room.findById(roomId)
          .select('statistics members')
          .lean();
        if (roomObj) {
          const payload = {
            roomId: String(roomId),
            membersCount: roomObj.members?.length || 0,
            totalJoins: roomObj.statistics?.totalJoins || 0,
            peakMembers: roomObj.statistics?.peakMembers || 0,
          };
          io.emit('room-members-changed', payload);
          console.log('[JOIN-ROOM] Emitted room-members-changed', payload);
        }
      } catch (e) {
        console.warn('[JOIN-ROOM] Could not emit room-members-changed:', e.message);
      }
    } catch (err) {
      console.error('[JOIN-ROOM] Error:', err);
    }
  });

  /**
   * Request to join a private room
   * If already approved within APPROVAL_TTL, auto-approve
   * Otherwise, notify host for manual approval
   */
  socket.on('request-to-join', async ({ roomId, requester }) => {
    try {
      console.log(
        `[REQUEST-JOIN] User ${requester._id} requesting to join room ${roomId}`
      );
      const room = await Room.findById(roomId);
      if (!room) {
        console.log(`[REQUEST-JOIN] Room not found: ${roomId}`);
        return;
      }

      const key = `${roomId}-${toId(requester._id)}`;
      const now = Date.now();

      // Check if already approved (within TTL)
      if (
        joinApprovals.has(key) &&
        now - joinApprovals.get(key) < APPROVAL_TTL
      ) {
        console.log(`[REQUEST-JOIN] Auto-approve for user ${requester._id}`);
        await handleApproveRequest(io, roomId, requester, room);
        return;
      }

      // Send to host for approval
      const hostSockets = userSockets.get(toId(room.owner));
      if (hostSockets && hostSockets.size > 0) {
        const firstSocketId = hostSockets.values().next().value;
        io.to(firstSocketId).emit('new-join-request', { requester, roomId });
      } else {
        console.log(`[REQUEST-JOIN] Host sockets not found for user ${room.owner}`);
      }
    } catch (err) {
      console.error('[REQUEST-JOIN] Error:', err);
    }
  });

  /**
   * Host responds to join request
   * Approved: Add user to members, set approval cache
   * Denied: Send rejection notification
   */
  socket.on('respond-to-request', async ({ requesterId, roomId, accepted }) => {
    try {
      console.log(
        `[RESPOND] Host responding: roomId=${roomId}, requesterId=${requesterId}, accepted=${accepted}`
      );
      let room = await Room.findById(roomId);
      if (!room) return;

      const reqIdStr = toId(requesterId);
      const requesterSockets = userSockets.get(reqIdStr);

      if (accepted) {
        await handleApproveRequest(io, roomId, { _id: reqIdStr }, room);
      } else {
        // Deny request
        if (requesterSockets) {
          requesterSockets.forEach(sid => {
            io.to(sid).emit('join-request-denied', {
              message: 'Yêu cầu tham gia đã bị từ chối.',
            });
          });
        }
      }
    } catch (err) {
      console.error('[RESPOND] Error:', err);
    }
  });

  /**
   * Admin joins room in ghost mode
   * Ghost mode: socket is invisible to statistics, receives member list but doesn't broadcast
   * Prevents admin from affecting room metrics
   */
  socket.on('join-room-ghost', async ({ roomId, isAdmin }) => {
    try {
      if (!isAdmin) {
        console.warn(`[JOIN-ROOM-GHOST] Non-admin tried to join as ghost`);
        return;
      }

      socket.isGhostMode = true;
      console.log(
        `✅ [JOIN-ROOM-GHOST] Marked socket ${socket.id} as ghost mode`
      );

      socket.join(roomId);
      console.log(
        `👻 [JOIN-ROOM-GHOST] Admin socket ${socket.id} joined room ${roomId} as ghost`
      );

      const room = await Room.findById(roomId)
        .populate('owner', 'username avatar')
        .populate('members', 'username avatar');

      if (!room) {
        console.log(`[JOIN-ROOM-GHOST] Room not found: ${roomId}`);
        return;
      }

      // Send playback state to admin
      const currentPlaybackState = {
        playlist: room.playlist,
        currentTrackIndex: room.currentTrackIndex,
        isPlaying: room.isPlaying,
        playbackStartTime: room.playbackStartTime,
      };
      socket.emit('playback-state-changed', currentPlaybackState);
      console.log(
        `👻 [JOIN-ROOM-GHOST] Sent playback state to admin`
      );

      // Send members ONLY to admin socket (NOT broadcasted)
      const sortedMembers = sortMembersWithOwnerFirst(room);
      socket.emit('update-members', sortedMembers);
      console.log(
        `👻 [JOIN-ROOM-GHOST] Sent ${sortedMembers.length} members ONLY to admin socket (NOT broadcasted)`
      );
    } catch (err) {
      console.error('[JOIN-ROOM-GHOST] Error:', err);
    }
  });

  /**
   * Admin leaves room (exit ghost mode)
   * Updates non-ghost clients with current member list
   */
  socket.on('leave-room-ghost', async ({ roomId }) => {
    try {
      socket.isGhostMode = false;
      console.log(
        `✅ [LEAVE-ROOM-GHOST] Removed ghost mode flag from socket ${socket.id}`
      );

      socket.leave(roomId);
      console.log(
        `👻 [LEAVE-ROOM-GHOST] Admin socket ${socket.id} left room ${roomId}`
      );

      const room = await Room.findById(roomId)
        .populate('owner', 'username avatar')
        .populate('members', 'username avatar');

      if (room) {
        const sortedMembers = sortMembersWithOwnerFirst(room);

        // Broadcast update-members to non-ghost clients only
        const socketsInRoom = await io.in(roomId).fetchSockets();
        for (const s of socketsInRoom) {
          if (!s.isGhostMode) {
            s.emit('update-members', sortedMembers);
          }
        }
        console.log(
          `👻 [LEAVE-ROOM-GHOST] Sent update-members to ${socketsInRoom.filter(s => !s.isGhostMode).length} non-ghost clients`
        );

        // Emit room-members-changed for admin dashboard
        try {
          const payload = {
            roomId: String(roomId),
            membersCount: sortedMembers.length,
            totalJoins: room.statistics?.totalJoins || 0,
            peakMembers: room.statistics?.peakMembers || 0,
          };
          io.emit('room-members-changed', payload);
          console.log('[LEAVE-ROOM-GHOST] Emitted room-members-changed', payload);
        } catch (e) {
          console.warn(
            '[LEAVE-ROOM-GHOST] Could not emit room-members-changed:',
            e.message
          );
        }
      }
    } catch (err) {
      console.error('[LEAVE-ROOM-GHOST] Error:', err);
    }
  });

  /**
   * Leave room
   * Removes user from room members, emits notifications
   */
  socket.on('leave-room', async ({ roomId, userId }) => {
    socket.leave(roomId);
    try {
      const leavingUser = await User.findById(userId).select('username avatar');
      await Room.findByIdAndUpdate(roomId, { $pull: { members: userId } });

      if (leavingUser) {
        io.to(roomId).emit('user-left-notification', {
          userId: userId,
          username: leavingUser.username,
          avatar: leavingUser.avatar,
        });
        console.log(
          `[LEAVE-ROOM] Emitted user-left-notification for ${leavingUser.username}`
        );
      }

      const populatedRoom = await Room.findById(roomId)
        .populate('owner', 'username avatar')
        .populate('members', 'username avatar');

      if (populatedRoom) {
        const sortedMembers = sortMembersWithOwnerFirst(populatedRoom);
        io.to(roomId).emit('update-members', sortedMembers);

        try {
          const roomObj = await Room.findById(roomId)
            .select('statistics members')
            .lean();
          if (roomObj) {
            const payload = {
              roomId: String(roomId),
              membersCount: sortedMembers.length,
              totalJoins: roomObj.statistics?.totalJoins || 0,
              peakMembers: roomObj.statistics?.peakMembers || sortedMembers.length,
            };
            io.emit('room-members-changed', payload);
            console.log('[LEAVE-ROOM] Emitted room-members-changed', payload);
          }
        } catch (e) {
          console.warn(
            '[LEAVE-ROOM] Could not emit room-members-changed:',
            e.message
          );
        }
      }
    } catch (err) {
      console.error('[LEAVE-ROOM] Error:', err);
    }
  });
};

module.exports = registerRoomHandlers;
