// server/src/controllers/stageHandler.js
const Room = require("../models/room");
const User = require("../models/User");

/**
 * ========================================
 * REGISTER STAGE SOCKET HANDLERS
 * ========================================
 * Xử lý real-time stage events via Socket.IO
 * Namespace: room namespaces (e.g., /room/roomId)
 */

const registerStageHandlers = (io, socket, userSockets) => {
  /**
   * ========================================
   * EVENT 1: stage:invite
   * Host mời user lên stage
   * ========================================
   */
  const handleStageInvite = async (payload) => {
    try {
      const { roomId, userId } = payload;
      const hostId = socket.userId;

      console.log(
        `[STAGE:INVITE] Host ${hostId} inviting user ${userId} to room ${roomId}`
      );

      // 1. Validate
      if (!roomId || !userId) {
        socket.emit("stage-error", {
          message: "roomId và userId là bắt buộc",
        });
        return;
      }

      // 2. Check room exists
      const room = await Room.findById(roomId);
      if (!room) {
        socket.emit("stage-error", {
          message: "Phòng không tồn tại",
        });
        return;
      }

      // 3. Check caller is owner
      if (room.owner.toString() !== hostId) {
        socket.emit("stage-error", {
          message: "Chỉ Host mới có quyền mời người lên sân khấu",
        });
        return;
      }

      // 4. Check user exists
      const user = await User.findById(userId);
      if (!user) {
        socket.emit("stage-error", {
          message: "Người dùng không tồn tại",
        });
        return;
      }

      // 5. Check if user already in coHosts
      const alreadyCoHost = room.coHosts.find(
        (ch) => ch.userId.toString() === userId
      );
      if (alreadyCoHost) {
        socket.emit("stage-error", {
          message: "Người dùng đã được mời lên sân khấu",
        });
        return;
      }

      // 6. Add to coHosts
      room.coHosts.push({
        userId: user._id,
        username: user.username,
        avatar: user.avatar || "",
        micEnabled: true,
        cameraEnabled: true,
        status: "pending",
      });

      await room.save();

      // 7. Broadcast updated coHosts to all in room
      io.to(roomId).emit("stage:coHosts-updated", {
        roomId: roomId,
        coHosts: room.coHosts,
        action: "invite",
        invitedUser: {
          userId: user._id,
          username: user.username,
          avatar: user.avatar,
        },
      });

      // 8. Send invitation notification to invited user (if online)
      const invitedUserSocketIds = userSockets.get(String(userId));
      if (invitedUserSocketIds && invitedUserSocketIds.size > 0) {
        // Get first socket ID of the invited user (user might have multiple connections)
        const invitedUserSocketId = Array.from(invitedUserSocketIds)[0];
        const invitedUserSocket = io.of("/").sockets.sockets.get(invitedUserSocketId);
        if (invitedUserSocket) {
          const host = await User.findById(hostId);
          console.log(`[STAGE:INVITE] 📢 Sending invitation to guest ${userId} via socket ${invitedUserSocketId}`);
          invitedUserSocket.emit("stage:invitation", {
            roomId: roomId,
            inviterUsername: host?.username || "Host",
            invitedUsername: user.username,
          });
        }
      } else {
        console.log(`[STAGE:INVITE] ⚠️ Guest ${userId} is offline - invitation not sent`);
      }

      console.log(`[STAGE:INVITE] ✅ User ${userId} invited to room ${roomId}`);
    } catch (error) {
      console.error("[STAGE:INVITE] Error:", error);
      socket.emit("stage-error", {
        message: "Lỗi khi mời người lên sân khấu",
        error: error.message,
      });
    }
  };

  /**
   * ========================================
   * EVENT 2: stage:accept
   * User chấp nhận lời mời
   * ========================================
   */
  const handleStageAccept = async (payload) => {
    try {
      const { roomId } = payload;
      const userId = socket.userId;

      console.log(
        `[STAGE:ACCEPT] User ${userId} accepting invite for room ${roomId}`
      );

      // 1. Check room exists
      const room = await Room.findById(roomId);
      if (!room) {
        socket.emit("stage-error", {
          message: "Phòng không tồn tại",
        });
        return;
      }

      // 2. Find coHost with status pending
      const coHost = room.coHosts.find(
        (ch) => ch.userId.toString() === userId && ch.status === "pending"
      );
      if (!coHost) {
        socket.emit("stage-error", {
          message: "Bạn không có lời mời chờ xử lý",
        });
        return;
      }

      // 3. Update status to active
      coHost.status = "active";
      coHost.joinedAt = new Date();

      await room.save();

      // 4. Broadcast to room
      io.to(roomId).emit("stage:coHosts-updated", {
        roomId: roomId,
        coHosts: room.coHosts,
        action: "accept",
        acceptedUser: {
          userId: coHost.userId,
          username: coHost.username,
          status: "active",
        },
      });

      console.log(`[STAGE:ACCEPT] ✅ User ${userId} accepted invite`);
    } catch (error) {
      console.error("[STAGE:ACCEPT] Error:", error);
      socket.emit("stage-error", {
        message: "Lỗi khi chấp nhận lời mời",
        error: error.message,
      });
    }
  };

  /**
   * ========================================
   * EVENT 3: stage:leave
   * User rời khỏi stage
   * ========================================
   */
  const handleStageLeave = async (payload) => {
    try {
      const { roomId } = payload;
      const userId = socket.userId;

      console.log(
        `[STAGE:LEAVE] User ${userId} leaving stage in room ${roomId}`
      );

      // 1. Check room exists
      const room = await Room.findById(roomId);
      if (!room) {
        socket.emit("stage-error", {
          message: "Phòng không tồn tại",
        });
        return;
      }

      // 2. Find coHost
      const coHostIndex = room.coHosts.findIndex(
        (ch) => ch.userId.toString() === userId
      );
      if (coHostIndex === -1) {
        socket.emit("stage-error", {
          message: "Bạn không phải là Co-host",
        });
        return;
      }

      // 3. Mark as inactive & set leftAt
      room.coHosts[coHostIndex].status = "inactive";
      room.coHosts[coHostIndex].leftAt = new Date();

      await room.save();

      // 4. Broadcast to room
      io.to(roomId).emit("stage:coHosts-updated", {
        roomId: roomId,
        coHosts: room.coHosts,
        action: "leave",
        leftUser: {
          userId: room.coHosts[coHostIndex].userId,
          username: room.coHosts[coHostIndex].username,
          status: "inactive",
        },
      });

      console.log(`[STAGE:LEAVE] ✅ User ${userId} left stage`);
    } catch (error) {
      console.error("[STAGE:LEAVE] Error:", error);
      socket.emit("stage-error", {
        message: "Lỗi khi rời khỏi sân khấu",
        error: error.message,
      });
    }
  };

  /**
   * ========================================
   * EVENT 4: stage:remove
   * Host removes Co-host từ stage
   * ========================================
   */
  const handleRemoveFromStage = async (payload) => {
    try {
      const { roomId, userId } = payload;
      const hostId = socket.userId;

      console.log(
        `[STAGE:REMOVE] Host ${hostId} removing user ${userId} from room ${roomId}`
      );

      // 1. Check room exists
      const room = await Room.findById(roomId);
      if (!room) {
        socket.emit("stage-error", {
          message: "Phòng không tồn tại",
        });
        return;
      }

      // 2. Check caller is host
      if (room.owner.toString() !== hostId) {
        socket.emit("stage-error", {
          message: "Chỉ Host mới có quyền xóa Co-host",
        });
        return;
      }

      // 3. Remove co-host
      const coHostIndex = room.coHosts.findIndex(
        (ch) => ch.userId.toString() === userId
      );
      if (coHostIndex === -1) {
        socket.emit("stage-error", {
          message: "Người dùng không phải là Co-host",
        });
        return;
      }

      const removedCoHost = room.coHosts[coHostIndex];
      room.coHosts.splice(coHostIndex, 1);
      await room.save();

      // 4. Broadcast to room
      io.to(roomId).emit("stage:coHosts-updated", {
        roomId: roomId,
        coHosts: room.coHosts,
        action: "remove",
        removedUser: {
          userId: removedCoHost.userId,
          username: removedCoHost.username,
        },
      });

      // 5. Notify removed user
      const removedUserSocketIds = userSockets.get(String(userId));
      if (removedUserSocketIds && removedUserSocketIds.size > 0) {
        const removedUserSocketId = Array.from(removedUserSocketIds)[0];
        const removedUserSocket = io.of("/").sockets.sockets.get(removedUserSocketId);
        if (removedUserSocket) {
          removedUserSocket.emit("stage:removed", {
            roomId: roomId,
            message: `Host đã xóa bạn khỏi sân khấu`,
          });
        }
      }

      console.log(`[STAGE:REMOVE] ✅ User ${userId} removed from stage`);
    } catch (error) {
      console.error("[STAGE:REMOVE] Error:", error);
      socket.emit("stage-error", {
        message: "Lỗi khi xóa Co-host",
        error: error.message,
      });
    }
  };

  /**
   * ========================================
   * EVENT 5: stage:toggle-media
   * Toggle Mic/Camera của Co-host
   * ========================================
   */
  const handleToggleMedia = async (payload) => {
    try {
      const { roomId, mediaType, enabled } = payload; // mediaType: 'mic' or 'camera'
      const userId = socket.userId;

      console.log(
        `[STAGE:TOGGLE-MEDIA] User ${userId} toggling ${mediaType} (${enabled}) in room ${roomId}`
      );

      // 1. Validate
      if (!["mic", "camera"].includes(mediaType)) {
        socket.emit("stage-error", {
          message: 'mediaType phải là "mic" hoặc "camera"',
        });
        return;
      }

      // 2. Check room exists
      const room = await Room.findById(roomId);
      if (!room) {
        socket.emit("stage-error", {
          message: "Phòng không tồn tại",
        });
        return;
      }

      // 3. Find coHost
      const coHost = room.coHosts.find(
        (ch) => ch.userId.toString() === userId && ch.status === "active"
      );
      if (!coHost) {
        socket.emit("stage-error", {
          message: "Bạn không phải là Co-host hoạt động",
        });
        return;
      }

      // 4. Update media state
      if (mediaType === "mic") {
        coHost.micEnabled = enabled;
      } else if (mediaType === "camera") {
        coHost.cameraEnabled = enabled;
      }

      await room.save();

      // 5. Broadcast to room
      io.to(roomId).emit("stage:media-toggled", {
        roomId: roomId,
        userId: userId,
        username: coHost.username,
        mediaType: mediaType,
        enabled: enabled,
        coHosts: room.coHosts,
      });

      console.log(
        `[STAGE:TOGGLE-MEDIA] ✅ Updated ${mediaType} status for user ${userId}`
      );
    } catch (error) {
      console.error("[STAGE:TOGGLE-MEDIA] Error:", error);
      socket.emit("stage-error", {
        message: "Lỗi khi cập nhật trạng thái media",
        error: error.message,
      });
    }
  };

  /**
   * ========================================
   * EVENT 5: stage:member-disconnected
   * User disconnect - cleanup stage
   * ========================================
   */
  const handleMemberDisconnect = async (roomId) => {
    try {
      const userId = socket.userId;

      console.log(
        `[STAGE:DISCONNECT] User ${userId} disconnected from room ${roomId}`
      );

      // 1. Check room exists
      const room = await Room.findById(roomId);
      if (!room) return;

      // 2. Find coHost
      const coHostIndex = room.coHosts.findIndex(
        (ch) => ch.userId.toString() === userId
      );
      if (coHostIndex === -1) return;

      // 3. Mark as inactive
      room.coHosts[coHostIndex].status = "inactive";
      room.coHosts[coHostIndex].leftAt = new Date();

      await room.save();

      // 4. Broadcast to room
      io.to(roomId).emit("stage:coHosts-updated", {
        roomId: roomId,
        coHosts: room.coHosts,
        action: "disconnect",
        disconnectedUser: {
          userId: room.coHosts[coHostIndex].userId,
          username: room.coHosts[coHostIndex].username,
        },
      });

      console.log(`[STAGE:DISCONNECT] ✅ Cleaned up user ${userId}`);
    } catch (error) {
      console.error("[STAGE:DISCONNECT] Error:", error);
    }
  };

  // Register socket event listeners
  socket.on("stage:invite", handleStageInvite);
  socket.on("stage:accept", handleStageAccept);
  socket.on("stage:leave", handleStageLeave);
  socket.on("stage:remove", handleRemoveFromStage);
  socket.on("stage:toggle-media", handleToggleMedia);

  // Handle disconnect
  socket.on("disconnect", () => {
    // Get all rooms this socket is in
    const rooms = Array.from(socket.rooms).filter((r) => r !== socket.id);
    rooms.forEach((roomId) => {
      if (roomId) {
        handleMemberDisconnect(roomId);
      }
    });
  });
};

module.exports = registerStageHandlers;
