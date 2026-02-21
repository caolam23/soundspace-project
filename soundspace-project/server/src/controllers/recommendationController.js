const Room = require('../models/room');
const Notification = require('../models/Notification');

// ========================================
// GET TRENDING TRACKS
// ========================================
// ========================================
// GET TRENDING TRACKS (WITH AI CONTEXT)
// ========================================
const getTrendingTracks = async (req, res) => {
    try {
        const { limit = 20, roomId } = req.query;

        console.log(`[RECOMMENDATION] Fetching tracks... Context Room: ${roomId || 'None'}`);

        let preferredTags = [];
        let preferredMoods = [];
        let existingTrackIds = new Set();

        // 1. ANALYZE CONTEXT (If roomId provided)
        if (roomId) {
            const room = await Room.findById(roomId).select('playlist');
            if (room && room.playlist && room.playlist.length > 0) {
                const tagCounts = {};
                const moodCounts = {};

                // Analyze last 20 tracks for relevance
                const recentTracks = room.playlist.slice(-20);

                // Build set of existing track IDs to filter duplicates
                room.playlist.forEach(t => {
                    if (t.sourceId) existingTrackIds.add(t.sourceId);
                    if (t.url) existingTrackIds.add(t.url);
                });

                recentTracks.forEach(t => {
                    if (t.tags) t.tags.forEach(tag => tagCounts[tag] = (tagCounts[tag] || 0) + 1);
                    if (t.mood) t.mood.forEach(m => moodCounts[m] = (moodCounts[m] || 0) + 1);
                });

                // Get Top 3 Tags
                preferredTags = Object.entries(tagCounts)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 3)
                    .map(e => e[0]);

                // Get Top 2 Moods
                preferredMoods = Object.entries(moodCounts)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 2)
                    .map(e => e[0]);

                console.log('[AI] Context Derived:', { preferredTags, preferredMoods });
                console.log(`[AI] Existing tracks in playlist: ${existingTrackIds.size}`);
            }
        }

        // 2. AGGREGATE (Fetch more to deduplicate later)
        const rawTrending = await Room.aggregate([
            { $unwind: '$playlist' },
            {
                $match: {
                    'playlist.source': { $in: ['youtube', 'upload'] },
                    'playlist.title': { $exists: true }
                }
            },
            // Initial Grouping (Weak check)
            {
                $group: {
                    _id: { $ifNull: ['$playlist.sourceId', '$playlist.url'] },
                    count: { $sum: 1 },
                    avgVotes: { $avg: { $ifNull: ['$playlist.requestVotes', 0] } },
                    track: { $first: '$playlist' },
                    // Collect all tags/moods to merge later
                    allTags: { $push: '$playlist.tags' },
                    allMoods: { $push: '$playlist.mood' }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 100 } // Fetch more candidates
        ]);

        console.log(`[RECOMMENDATION] Raw candidates: ${rawTrending.length}`);

        // 3. ROBUST DEDUPLICATION (JavaScript)
        const uniqueMap = new Map();

        rawTrending.forEach(item => {
            const t = item.track;
            // Robust ID Extraction
            let uniqueId = t.sourceId;
            if (!uniqueId) {
                // Try to extract from URL if sourceId missing
                try {
                    if (t.url.includes('youtu')) {
                        const match = t.url.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/);
                        if (match && match[2].length === 11) uniqueId = match[2];
                    }
                } catch (e) { }
            }
            if (!uniqueId) uniqueId = t.url; // Fallback to URL

            // Merge if exists
            if (uniqueMap.has(uniqueId)) {
                const existing = uniqueMap.get(uniqueId);
                existing.count += item.count;
                // Merge scores/votes logic if needed
            } else {
                uniqueMap.set(uniqueId, {
                    ...item,
                    realId: uniqueId
                });
            }
        });

        const mergedTrending = Array.from(uniqueMap.values());

        // 4. SCORING & SORTING
        const scoredTrending = mergedTrending.map(t => {
            // Calculate Intersection checks (JS version)
            const tTags = t.track.tags || [];
            const tMood = t.track.mood || [];

            const tagMatch = tTags.filter(tag => preferredTags.includes(tag)).length;
            const moodMatch = tMood.filter(m => preferredMoods.includes(m)).length;

            // 4. SCORE (Feature Coverage Model)
            // Max 40 points = 100% Match
            // - Tags: Max 30 pts (3 matches * 10)
            // - Mood: Max 10 pts (2 matches * 5)
            // - Popularity: Bonus (Max 5 pts)
            // - Votes: Bonus (Max 5 pts)

            // Cap popularity at 5 (to prevent inflation from viral tracks)
            const popularityScore = Math.min(t.count, 5);

            // Cap votes at 5
            const avgVotes = t.avgVotes || 0;
            const voteScore = Math.min(avgVotes, 5);

            const rawScore = (tagMatch * 10) + (moodMatch * 5) + (popularityScore * 1) + (voteScore * 1);

            // Calculate Percentage: (Score / 40) * 100
            // Example: 30 (tags) + 5 (mood) + 2 (pop) = 37/40 = 92.5%
            // Example (No match): 0 (tags) + 0 (mood) + 5 (pop) = 5/40 = 12.5%
            const matchScore = Math.min(100, Math.ceil((rawScore / 40) * 100));

            return {
                ...t.track,
                matchScore,
                reason: tagMatch > 0
                    ? `🎯 Matches ${tTags.filter(tag => preferredTags.includes(tag)).join(', ')}`
                    : moodMatch > 0
                        ? `😊 Mood: ${tMood.filter(m => preferredMoods.includes(m)).join(', ')}`
                        : `🔥 Popular in ${t.count || 1} rooms`,
                source: 'trending',
                popularity: t.count,
                contextScore: rawScore // Use raw score for sorting
            };
        })
            .filter(t => t.matchScore > 0);
        scoredTrending.sort((a, b) => b.contextScore - a.contextScore);

        // Filter out tracks already in playlist
        const filteredRecommendations = scoredTrending.filter(track => {
            const isDuplicate = existingTrackIds.has(track.sourceId) || existingTrackIds.has(track.url);
            return !isDuplicate;
        });

        console.log(`[AI] Filtered: ${scoredTrending.length} → ${filteredRecommendations.length} (removed ${scoredTrending.length - filteredRecommendations.length} duplicates)`);

        // Final Limit
        const finalRecommendations = filteredRecommendations.slice(0, parseInt(limit));

        return res.json({
            recommendations: finalRecommendations,
            total: finalRecommendations.length,
            totalAnalyzed: mergedTrending.length,
            filtered: scoredTrending.length - filteredRecommendations.length,
            context: { preferredTags, preferredMoods }
        });

    } catch (error) {
        console.error('[RECOMMENDATION] Error:', error);
        return res.status(500).json({ msg: 'Lỗi tải gợi ý' });
    }
};

// ========================================
// GET HOST PROFILE
// ========================================
const getHostProfile = async (req, res) => {
    try {
        const userId = req.user?.id || req.user?._id;

        console.log('[HOST_PROFILE] Building profile for user:', userId);

        // Find all rooms owned by this host
        const rooms = await Room.find({ owner: userId })
            .select('playlist name')
            .lean();

        if (!rooms || rooms.length === 0) {
            console.log('[HOST_PROFILE] No rooms found for host');
            return res.json({
                totalRooms: 0,
                totalTracks: 0,
                topGenres: [],
                topMoods: [],
                genreVector: {},
                moodVector: {}
            });
        }

        // Aggregate genres and moods
        const genreCounts = {};
        const moodCounts = {};
        let totalTracks = 0;

        rooms.forEach(room => {
            if (!room.playlist) return;

            room.playlist.forEach(track => {
                totalTracks++;

                // Count genres (tags)
                if (track.tags && Array.isArray(track.tags)) {
                    track.tags.forEach(tag => {
                        genreCounts[tag] = (genreCounts[tag] || 0) + 1;
                    });
                }

                // Count moods
                if (track.mood && Array.isArray(track.mood)) {
                    track.mood.forEach(m => {
                        moodCounts[m] = (moodCounts[m] || 0) + 1;
                    });
                }
            });
        });

        // Calculate top 3 genres
        const topGenres = Object.entries(genreCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([tag, count]) => ({
                tag,
                count,
                percentage: Math.round((count / totalTracks) * 100)
            }));

        // Calculate top 2 moods
        const topMoods = Object.entries(moodCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 2)
            .map(([mood, count]) => ({
                mood,
                count,
                percentage: Math.round((count / totalTracks) * 100)
            }));

        console.log('[HOST_PROFILE] Profile built:', {
            totalRooms: rooms.length,
            totalTracks,
            topGenres: topGenres.map(g => g.tag)
        });

        return res.json({
            totalRooms: rooms.length,
            totalTracks,
            topGenres,
            topMoods,
            genreVector: genreCounts,  // For Phase 2
            moodVector: moodCounts
        });

    } catch (error) {
        console.error('[HOST_PROFILE] Error building profile:', error);
        return res.status(500).json({ msg: 'Lỗi khi tải profile' });
    }
};

module.exports = {
    getTrendingTracks,
    getHostProfile
};
