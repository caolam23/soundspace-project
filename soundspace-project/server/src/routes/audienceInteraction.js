/**
 * ✅ FEATURE: Audience Interaction Routes
 * API endpoints for like and gift interactions
 * Implementation Date: April 2026
 */

const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const audienceInteractionController = require('../controllers/audienceInteractionController');

// POST /api/audience-interactions/:roomId/like
router.post('/:roomId/like', verifyToken, audienceInteractionController.sendLike);

// POST /api/audience-interactions/:roomId/gift
router.post('/:roomId/gift', verifyToken, audienceInteractionController.sendGift);

// GET /api/audience-interactions/:roomId/stats
router.get('/:roomId/stats', verifyToken, audienceInteractionController.getInteractionStats);

module.exports = router;
