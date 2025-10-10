const express = require('express');
const router = express.Router();
const { streamTrack } = require('../controllers/stream.controller');

router.get('/:videoId', streamTrack);

module.exports = router;
