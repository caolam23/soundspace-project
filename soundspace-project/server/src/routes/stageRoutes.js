// server/src/routes/stageRoutes.js
const express = require('express');
const router = express.Router({ mergeParams: true }); // mergeParams to access :roomId
const { verifyToken } = require('../middleware/auth');
const stageController = require('../controllers/stageController');

// GET  /api/rooms/:roomId/stage          — current stage state
router.get('/:roomId/stage', verifyToken, stageController.getStageState);

// POST /api/rooms/:roomId/stage/invite   — host invites member to stage
router.post('/:roomId/stage/invite', verifyToken, stageController.inviteToStage);

// PUT  /api/rooms/:roomId/stage/accept   — member accepts invite
router.put('/:roomId/stage/accept', verifyToken, stageController.acceptStageInvite);

// DELETE /api/rooms/:roomId/stage/kick/:targetUserId — host kicks or self-leave
router.delete('/:roomId/stage/kick/:targetUserId', verifyToken, stageController.kickFromStage);

module.exports = router;
