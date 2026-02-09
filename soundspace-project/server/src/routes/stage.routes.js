// server/src/routes/stage.routes.js
const express = require("express");
const router = express.Router();
const stageController = require("../controllers/stageController");
const { verifyToken } = require("../middleware/auth");

/**
 * ========================================
 * STAGE ROUTES
 * ========================================
 */

// POST /api/stage/invite - Host mời user lên stage
router.post("/invite", verifyToken, stageController.inviteToStage);

// PUT /api/stage/:roomId/accept - User chấp nhận lời mời
router.put("/:roomId/accept", verifyToken, stageController.acceptStageInvite);

// DELETE /api/stage/:roomId/leave - User rời khỏi stage
router.delete("/:roomId/leave", verifyToken, stageController.leaveStage);

// DELETE /api/stage/:roomId/remove - Host kick user khỏi stage
router.delete("/:roomId/remove", verifyToken, stageController.removeFromStage);

// GET /api/stage/:roomId - Lấy thông tin stage
router.get("/:roomId", stageController.getStageInfo);

module.exports = router;
