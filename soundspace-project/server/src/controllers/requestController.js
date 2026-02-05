const Room = require('../models/room');
const User = require('../models/User');
const ytdl = require('@distube/ytdl-core');
const { cloudinary } = require('../config/uploadConfig');
const { getAudioDurationInSeconds } = require('get-audio-duration');

// ========================================
// 📺 THÊM ĐỀ XUẤT TỪ YOUTUBE
// ========================================
const addRequestFromYouTube = async (req, res) => {
    try {
        const { roomId } = req.params;
        const { url, tags, mood, message } = req.body;
        const userId = req.user?.id || req.user?._id;

        console.log('[REQUEST_YT] Request received:', { roomId, userId, url, tags });

        // 1. Validate tags
        if (!tags || tags.length === 0) {
            return res.status(400).json({ msg: 'Vui lòng chọn ít nhất 1 thể loại' });
        }
        if (tags.length > 3) {
            return res.status(400).json({ msg: 'Chỉ được chọn tối đa 3 thể loại' });
        }

        // 2. Validate YouTube URL
        if (!ytdl.validateURL(url)) {
            return res.status(400).json({ msg: 'URL YouTube không hợp lệ' });
        }

        // 3. Find room
        const room = await Room.findById(roomId);
        if (!room) {
            return res.status(404).json({ msg: 'Không tìm thấy phòng' });
        }

        // 4. Check member is in room
        const isMember = room.members.some(m => m.toString() === userId.toString());
        if (!isMember && room.owner.toString() !== userId.toString()) {
            return res.status(403).json({ msg: 'Bạn phải là thành viên của phòng' });
        }

        // 5. Check pending requests limit
        const userPendingRequests = room.songRequests.filter(
            r => r.requestedBy.toString() === userId.toString() && r.status === 'pending'
        );

        if (userPendingRequests.length >= 3) {
            return res.status(400).json({
                msg: 'Bạn đã có 3 đề xuất đang chờ. Vui lòng đợi Host duyệt!'
            });
        }

        // 6. Fetch YouTube info
        console.log('[REQUEST_YT] Fetching YouTube info...');
        const info = await ytdl.getInfo(url).catch(err => {
            console.error('[REQUEST_YT] Error fetching info:', err.message);
            return null;
        });

        if (!info) {
            return res.status(400).json({
                msg: 'Không thể lấy thông tin video. Vui lòng thử lại!'
            });
        }

        const details = info.videoDetails;

        // 7. Check duplicate
        const isDuplicate = room.songRequests.some(
            r => r.youtube_id === details.videoId && r.status === 'pending'
        );

        if (isDuplicate) {
            return res.status(409).json({
                msg: 'Bài hát này đã được đề xuất rồi!'
            });
        }

        // 8. Create request
        const newRequest = {
            title: details.title.substring(0, 100),
            artist: details.ownerChannelName.replace(/VEVO|Official/gi, '').trim(),
            thumbnail: details.thumbnails?.at(-1)?.url || '',
            duration: parseInt(details.lengthSeconds),
            source: 'youtube',
            youtube_id: details.videoId,
            url: url,
            tags: tags,
            mood: mood || [],
            requestedBy: userId,
            message: message || '',
            votes: [],
            status: 'pending'
        };

        room.songRequests.push(newRequest);
        await room.save();

        // 9. Update user stats
        await User.updateOne(
            { _id: userId },
            {
                $inc: {
                    contributionPoints: 5,
                    totalSongRequests: 1
                }
            }
        );

        console.log('[REQUEST_YT] ✅ Request created successfully');

        // 10. Emit socket event
        const io = req.app.get('io');
        if (io) {
            io.to(roomId).emit('new-song-request', {
                request: newRequest,
                roomId: roomId
            });
        }

        return res.status(201).json({
            msg: 'Đã gửi đề xuất cho Host!',
            request: newRequest,
            points: 5
        });

    } catch (error) {
        console.error('[REQUEST_YT] Error:', error);
        return res.status(500).json({ msg: 'Lỗi máy chủ', error: error.message });
    }
};

// ========================================
// 📁 THÊM ĐỀ XUẤT TỪ UPLOAD
// ========================================
const addRequestFromUpload = async (req, res) => {
    try {
        const { roomId } = req.params;
        const { title, artist, tags, mood, message } = req.body;
        const userId = req.user?.id || req.user?._id;

        console.log('[REQUEST_UPLOAD] Request received:', { roomId, userId, title });

        // Parse tags
        const parsedTags = typeof tags === 'string' ? JSON.parse(tags) : tags;
        const parsedMood = typeof mood === 'string' ? JSON.parse(mood) : (mood || []);

        // 1. Validate files
        if (!req.files || !req.files.audio) {
            return res.status(400).json({ msg: 'Thiếu file nhạc' });
        }

        // 2. Validate tags
        if (!parsedTags || parsedTags.length === 0) {
            return res.status(400).json({ msg: 'Vui lòng chọn ít nhất 1 thể loại' });
        }

        // 3. Find room
        const room = await Room.findById(roomId);
        if (!room) {
            return res.status(404).json({ msg: 'Không tìm thấy phòng' });
        }

        // 4. Check member
        const isMember = room.members.some(m => m.toString() === userId.toString());
        if (!isMember && room.owner.toString() !== userId.toString()) {
            return res.status(403).json({ msg: 'Bạn phải là thành viên của phòng' });
        }

        // 5. Check limits
        const userPendingRequests = room.songRequests.filter(
            r => r.requestedBy.toString() === userId.toString() && r.status === 'pending'
        );

        if (userPendingRequests.length >= 3) {
            return res.status(400).json({
                msg: 'Bạn đã có 3 đề xuất đang chờ. Vui lòng đợi Host duyệt!'
            });
        }

        // 6. Upload to Cloudinary
        console.log('[REQUEST_UPLOAD] Uploading to Cloudinary...');

        const thumbnailUpload = req.files.thumbnail
            ? await cloudinary.uploader.upload(req.files.thumbnail[0].path, {
                folder: 'soundspace-requests'
            })
            : { secure_url: '/images/default-cover.png' };

        const audioUpload = await cloudinary.uploader.upload(
            req.files.audio[0].path,
            {
                resource_type: 'video',
                folder: 'soundspace-requests'
            }
        );

        // 7. Get duration
        const duration = await getAudioDurationInSeconds(audioUpload.secure_url)
            .catch(() => 0);

        // 8. Create request
        const newRequest = {
            title: title || req.files.audio[0].originalname.replace(/\.[^/.]+$/, ''),
            artist: artist || req.user.username || 'Unknown',
            thumbnail: thumbnailUpload.secure_url,
            duration: Math.round(duration),
            source: 'upload',
            cloudinary_url: audioUpload.secure_url,
            cloudinary_public_id: audioUpload.public_id,
            fileSize: req.files.audio[0].size,
            tags: parsedTags,
            mood: parsedMood,
            requestedBy: userId,
            message: message || '',
            votes: [],
            status: 'pending'
        };

        room.songRequests.push(newRequest);
        await room.save();

        // 9. Update user stats
        await User.updateOne(
            { _id: userId },
            {
                $inc: {
                    contributionPoints: 7,
                    totalSongRequests: 1
                }
            }
        );

        console.log('[REQUEST_UPLOAD] ✅ Request created successfully');

        // 10. Emit socket event
        const io = req.app.get('io');
        if (io) {
            io.to(roomId).emit('new-song-request', {
                request: newRequest,
                roomId: roomId
            });
        }

        return res.status(201).json({
            msg: 'Đã gửi đề xuất cho Host!',
            request: newRequest,
            points: 7
        });

    } catch (error) {
        console.error('[REQUEST_UPLOAD] Error:', error);
        return res.status(500).json({ msg: 'Lỗi máy chủ', error: error.message });
    }
};

// ========================================
// 👍 VOTE CHO ĐỀ XUẤT
// ========================================
const voteRequest = async (req, res) => {
    try {
        const { roomId, requestId } = req.params;
        const userId = req.user?.id || req.user?._id;

        const room = await Room.findById(roomId);
        if (!room) {
            return res.status(404).json({ msg: 'Không tìm thấy phòng' });
        }

        const request = room.songRequests.id(requestId);
        if (!request) {
            return res.status(404).json({ msg: 'Không tìm thấy đề xuất' });
        }

        if (request.status !== 'pending') {
            return res.status(400).json({ msg: 'Đề xuất này đã được duyệt/từ chối' });
        }

        // Toggle vote
        const voteIndex = request.votes.findIndex(
            v => v.toString() === userId.toString()
        );

        if (voteIndex > -1) {
            request.votes.splice(voteIndex, 1);
        } else {
            request.votes.push(userId);
            await User.updateOne(
                { _id: request.requestedBy },
                { $inc: { contributionPoints: 1 } }
            );
        }

        await room.save();

        const io = req.app.get('io');
        if (io) {
            io.to(roomId).emit('request-vote-updated', {
                requestId: requestId,
                votes: request.votes.length
            });
        }

        return res.status(200).json({
            msg: voteIndex > -1 ? 'Đã bỏ vote' : 'Đã vote',
            votes: request.votes.length
        });

    } catch (error) {
        console.error('[VOTE_REQUEST] Error:', error);
        return res.status(500).json({ msg: 'Lỗi máy chủ' });
    }
};

// ========================================
// ✅ HOST CHẤP NHẬN ĐỀ XUẤT
// ========================================
const approveRequest = async (req, res) => {
    try {
        const { roomId, requestId } = req.params;
        const userId = req.user?.id || req.user?._id;

        const room = await Room.findById(roomId);
        if (!room) {
            return res.status(404).json({ msg: 'Không tìm thấy phòng' });
        }

        if (room.owner.toString() !== userId.toString()) {
            return res.status(403).json({ msg: 'Chỉ Host mới được duyệt đề xuất' });
        }

        const request = room.songRequests.id(requestId);
        if (!request) {
            return res.status(404).json({ msg: 'Không tìm thấy đề xuất' });
        }

        if (request.status !== 'pending') {
            return res.status(400).json({ msg: 'Đề xuất này đã được duyệt/từ chối' });
        }

        // Create track from request
        const newTrack = {
            title: request.title,
            artist: request.artist,
            thumbnail: request.thumbnail,
            duration: request.duration,
            source: request.source,
            ...(request.source === 'youtube' && {
                url: request.url,
                sourceId: request.youtube_id
            }),
            ...(request.source === 'upload' && {
                url: request.cloudinary_url,
                sourceId: request.cloudinary_public_id
            }),
            tags: request.tags,
            mood: request.mood,
            addedBy: request.requestedBy,
            addedVia: 'request',
            requestVotes: request.votes.length
        };

        room.playlist.push(newTrack);
        request.status = 'approved';
        request.reviewedAt = new Date();
        request.reviewedBy = userId;

        await room.save();

        await User.updateOne(
            { _id: request.requestedBy },
            {
                $inc: {
                    contributionPoints: 10,
                    approvedRequests: 1
                }
            }
        );

        console.log('[APPROVE_REQUEST] ✅ Request approved');

        const io = req.app.get('io');
        if (io) {
            io.to(roomId).emit('request-approved', {
                requestId: requestId,
                track: newTrack
            });

            io.to(roomId).emit('playback-state-changed', {
                playlist: room.playlist,
                currentTrackIndex: room.currentTrackIndex,
                isPlaying: room.isPlaying
            });
        }

        return res.status(200).json({
            msg: 'Đã thêm bài hát vào playlist!',
            track: newTrack
        });

    } catch (error) {
        console.error('[APPROVE_REQUEST] Error:', error);
        return res.status(500).json({ msg: 'Lỗi máy chủ' });
    }
};

// ========================================
// ❌ HOST TỪ CHỐI ĐỀ XUẤT
// ========================================
const rejectRequest = async (req, res) => {
    try {
        const { roomId, requestId } = req.params;
        const { reason } = req.body;
        const userId = req.user?.id || req.user?._id;

        const room = await Room.findById(roomId);
        if (!room) {
            return res.status(404).json({ msg: 'Không tìm thấy phòng' });
        }

        if (room.owner.toString() !== userId.toString()) {
            return res.status(403).json({ msg: 'Chỉ Host mới được từ chối đề xuất' });
        }

        const request = room.songRequests.id(requestId);
        if (!request) {
            return res.status(404).json({ msg: 'Không tìm thấy đề xuất' });
        }

        if (request.source === 'upload' && request.cloudinary_public_id) {
            try {
                await cloudinary.uploader.destroy(
                    request.cloudinary_public_id,
                    { resource_type: 'video' }
                );
                console.log('[REJECT_REQUEST] Deleted Cloudinary file');
            } catch (err) {
                console.warn('[REJECT_REQUEST] Failed to delete Cloudinary file:', err.message);
            }
        }

        request.status = 'rejected';
        request.reviewedAt = new Date();
        request.reviewedBy = userId;

        await room.save();

        console.log('[REJECT_REQUEST] ✅ Request rejected');

        const io = req.app.get('io');
        if (io) {
            io.to(roomId).emit('request-rejected', {
                requestId: requestId,
                title: request.title,
                reason: reason || 'Không phù hợp với phòng lúc này'
            });
        }

        return res.status(200).json({
            msg: 'Đã từ chối đề xuất'
        });

    } catch (error) {
        console.error('[REJECT_REQUEST] Error:', error);
        return res.status(500).json({ msg: 'Lỗi máy chủ' });
    }
};

// ========================================
// 📋 LẤY DANH SÁCH ĐỀ XUẤT
// ========================================
const getRequests = async (req, res) => {
    try {
        const { roomId } = req.params;
        const { status, sortBy } = req.query;

        const room = await Room.findById(roomId)
            .populate('songRequests.requestedBy', 'username avatar')
            .populate('songRequests.votes', 'username');

        if (!room) {
            return res.status(404).json({ msg: 'Không tìm thấy phòng' });
        }

        let requests = room.songRequests;

        if (status) {
            requests = requests.filter(r => r.status === status);
        }

        if (sortBy === 'hot') {
            requests.sort((a, b) => b.votes.length - a.votes.length);
        } else if (sortBy === 'newest') {
            requests.sort((a, b) => b.createdAt - a.createdAt);
        }

        const requestsWithStats = requests.map(r => ({
            ...r.toObject(),
            votePercentage: Math.round((r.votes.length / room.members.length) * 100)
        }));

        return res.status(200).json({
            requests: requestsWithStats,
            total: requests.length
        });

    } catch (error) {
        console.error('[GET_REQUESTS] Error:', error);
        return res.status(500).json({ msg: 'Lỗi máy chủ' });
    }
};

// Debug logging
console.log('[REQUEST_CONTROLLER] Exporting functions:', {
    addRequestFromYouTube: typeof addRequestFromYouTube,
    addRequestFromUpload: typeof addRequestFromUpload,
    voteRequest: typeof voteRequest,
    approveRequest: typeof approveRequest,
    rejectRequest: typeof rejectRequest,
    getRequests: typeof getRequests
});

module.exports = {
    addRequestFromYouTube,
    addRequestFromUpload,
    voteRequest,
    approveRequest,
    rejectRequest,
    getRequests
};
