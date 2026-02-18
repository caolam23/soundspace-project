// server/src/routes/stage.routes.js
const express = require('express');
const router = express.Router();
const stageController = require('../controllers/stageController');
const { verifyToken } = require('../middleware/auth');

/**
 * ========================================
 * STAGE ROUTES - Live Co-host Management
 * ========================================
 */

// POST /api/stage/invite
// Host mời người lên sân khấu
router.post(
  '/invite',
  verifyToken,
  stageController.inviteToStage
);

// PUT /api/stage/:roomId/accept
// Guest chấp nhận lời mời lên sân khấu
router.put(
  '/:roomId/accept',
  verifyToken,
  stageController.acceptStageInvite
);

// DELETE /api/stage/:roomId/leave
// Co-host rời khỏi sân khấu
router.delete(
  '/:roomId/leave',
  verifyToken,
  stageController.leaveStage
);

// DELETE /api/stage/:roomId/remove
// Host xóa co-host khỏi sân khấu
router.delete(
  '/:roomId/remove',
  verifyToken,
  stageController.removeFromStage
);

// GET /api/stage/:roomId
// Lấy thông tin sân khấu của phòng
router.get(
  '/:roomId',
  stageController.getStageInfo
);

module.exports = router;
