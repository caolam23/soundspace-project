const express = require('express');
const router = express.Router();

const playlistController = require('../controllers/playlist.controller');
const { auth } = require('../middleware/auth'); // ✅ chỉ lấy hàm 'auth' ra

router.post('/:roomId/playlist', auth, playlistController.addTrack);

module.exports = router;
