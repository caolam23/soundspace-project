// server/src/controllers/stageController.js
const Room = require("../models/room");
const User = require("../models/User");

/**
 * ========================================
 * INVITE USER LÊN STAGE (HOST MỜI)
 * ========================================
 * POST /api/stage/invite
 * Body: { roomId, userId }
 */
exports.inviteToStage = async (req, res) => {
  try {
    const { roomId, userId } = req.body;
    const hostId = req.user.id;

    // Validation
    if (!roomId || !userId) {
      return res.status(400).json({
        success: false,
        message: "roomId và userId là bắt buộc",
      });
    }

    // 1. Check room exists & caller is owner
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Phòng không tồn tại",
      });
    }

    if (room.owner.toString() !== hostId) {
      return res.status(403).json({
        success: false,
        message: "Chỉ Host mới có quyền mời người lên sân khấu",
      });
    }

    // 2. Check user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Người dùng không tồn tại",
      });
    }

    // 3. Check if user already in coHosts
    const alreadyCoHost = room.coHosts.find(
      (ch) => ch.userId.toString() === userId
    );
    if (alreadyCoHost) {
      return res.status(400).json({
        success: false,
        message: "Người dùng đã được mời lên sân khấu",
      });
    }

    // 4. Add to coHosts with status "pending"
    room.coHosts.push({
      userId: user._id,
      username: user.username,
      avatar: user.avatar || "",
      micEnabled: true,
      cameraEnabled: true,
      status: "pending",
    });

    await room.save();

    return res.status(201).json({
      success: true,
      message: "Đã gửi lời mời",
      data: {
        coHosts: room.coHosts,
      },
    });
  } catch (error) {
    console.error("❌ [inviteToStage] Error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message,
    });
  }
};

/**
 * ========================================
 * ACCEPT INVITE - USER CHẤP NHẬN LỜI MỜI
 * ========================================
 * PUT /api/stage/:roomId/accept
 */
exports.acceptStageInvite = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;

    // 1. Check room exists
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Phòng không tồn tại",
      });
    }

    // 2. Find coHost with status "pending"
    const coHost = room.coHosts.find(
      (ch) => ch.userId.toString() === userId && ch.status === "pending"
    );
    if (!coHost) {
      return res.status(400).json({
        success: false,
        message: "Bạn không có lời mời chờ xử lý",
      });
    }

    // 3. Update status to "active"
    coHost.status = "active";
    coHost.joinedAt = new Date();

    await room.save();

    return res.status(200).json({
      success: true,
      message: "Đã chấp nhận lời mời",
      data: {
        coHost: coHost,
        coHosts: room.coHosts,
      },
    });
  } catch (error) {
    console.error("❌ [acceptStageInvite] Error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message,
    });
  }
};

/**
 * ========================================
 * USER RỜI KHỎI STAGE
 * ========================================
 * DELETE /api/stage/:roomId/leave
 */
exports.leaveStage = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;

    // 1. Check room exists
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Phòng không tồn tại",
      });
    }

    // 2. Find & remove coHost
    const coHostIndex = room.coHosts.findIndex(
      (ch) => ch.userId.toString() === userId
    );
    if (coHostIndex === -1) {
      return res.status(400).json({
        success: false,
        message: "Bạn không phải là Co-host",
      });
    }

    room.coHosts[coHostIndex].status = "inactive";
    room.coHosts[coHostIndex].leftAt = new Date();

    // Option: Remove từ array luôn
    // room.coHosts.splice(coHostIndex, 1);

    await room.save();

    return res.status(200).json({
      success: true,
      message: "Bạn đã rời khỏi sân khấu",
      data: {
        coHosts: room.coHosts,
      },
    });
  } catch (error) {
    console.error("❌ [leaveStage] Error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message,
    });
  }
};

/**
 * ========================================
 * HOST KICK USER KHỎI STAGE
 * ========================================
 * DELETE /api/stage/:roomId/remove
 * Body: { coHostId } - userId cần remove
 */
exports.removeFromStage = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { coHostId } = req.body;
    const hostId = req.user.id;

    // 1. Check room & caller is owner
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Phòng không tồn tại",
      });
    }

    if (room.owner.toString() !== hostId) {
      return res.status(403).json({
        success: false,
        message: "Chỉ Host mới có quyền xóa Co-host",
      });
    }

    // 2. Find & remove coHost
    const coHostIndex = room.coHosts.findIndex(
      (ch) => ch.userId.toString() === coHostId
    );
    if (coHostIndex === -1) {
      return res.status(400).json({
        success: false,
        message: "Co-host không tồn tại",
      });
    }

    const removedCoHost = room.coHosts.splice(coHostIndex, 1);

    await room.save();

    return res.status(200).json({
      success: true,
      message: "Đã xóa Co-host khỏi sân khấu",
      data: {
        removed: removedCoHost[0],
        coHosts: room.coHosts,
      },
    });
  } catch (error) {
    console.error("❌ [removeFromStage] Error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message,
    });
  }
};

/**
 * ========================================
 * GET STAGE INFO
 * ========================================
 * GET /api/stage/:roomId
 */
exports.getStageInfo = async (req, res) => {
  try {
    const { roomId } = req.params;

    const room = await Room.findById(roomId).populate("coHosts.userId", "username avatar");
    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Phòng không tồn tại",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        isLive: room.isLive,
        coHosts: room.coHosts,
      },
    });
  } catch (error) {
    console.error("❌ [getStageInfo] Error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message,
    });
  }
};
