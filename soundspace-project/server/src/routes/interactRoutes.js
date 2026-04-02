// server/src/routes/interactRoutes.js
const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const interactController = require('../controllers/interactController');

// GET  /api/interact/gifts                 — gift catalog
router.get('/gifts', interactController.getGiftCatalog);

// POST /api/interact/:roomId/reaction      — send a reaction
router.post('/:roomId/reaction', verifyToken, interactController.sendReaction);

// POST /api/interact/:roomId/gift          — send a gift
router.post('/:roomId/gift', verifyToken, interactController.sendGift);

module.exports = router;
