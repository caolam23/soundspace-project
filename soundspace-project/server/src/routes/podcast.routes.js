const express = require('express');
const multer = require('multer');
const router = express.Router();
const podcastController = require('../controllers/podcast.controller');

// Use memory storage so we can convert buffer -> base64 -> Cloudinary upload without needing to save to disk first. Multer will handle the multipart/form-data parsing and give us the file buffer in req.file.
const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 100 * 1024 * 1024 } });

// POST /api/podcasts/upload
// form-data fields: file (binary), roomId, hostId, title (optional), duration (seconds optional) 
router.post('/upload', upload.single('file'), podcastController.uploadRecording);

module.exports = router;
