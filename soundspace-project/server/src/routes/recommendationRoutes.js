const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const {
    getTrendingTracks,
    getHostProfile
} = require('../controllers/recommendationController');

// GET /api/recommendations/trending
// Get trending tracks across all rooms
router.get('/trending', auth, getTrendingTracks);

// GET /api/recommendations/profile
// Get host's music preference profile
router.get('/profile', auth, getHostProfile);

module.exports = router;
