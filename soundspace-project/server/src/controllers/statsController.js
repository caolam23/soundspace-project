// server/src/controllers/statsController.js
const {
  getMusicSourcesStats,
  getTopContributors,
  getSongsAddedOverTime,
  getUserGrowth,
  getAllStats,
  getTotalVisitsStats
} = require('../services/statsService');

/**
 * GET /api/admin/stats/music-sources?range=7d
 * Lấy thống kê tỷ lệ nguồn nhạc
 */
const getMusicSources = async (req, res) => {
  try {
    const { range = '7d' } = req.query;
    const stats = await getMusicSourcesStats(range);
    res.json(stats);
  } catch (error) {
    console.error('Error in getMusicSources controller:', error);
    res.status(500).json({
      message: 'Không thể lấy thống kê nguồn nhạc',
      error: error.message
    });
  }
};

/**
 * GET /api/admin/stats/top-contributors?range=7d
 * Lấy top người dùng đóng góp nhiều bài hát nhất
 */
const getTopContributorsController = async (req, res) => {
  try {
    const { range = '7d' } = req.query;
    const contributors = await getTopContributors(range);
    res.json(contributors);
  } catch (error) {
    console.error('Error in getTopContributorsController:', error);
    res.status(500).json({
      message: 'Không thể lấy danh sách top contributors',
      error: error.message
    });
  }
};

/**
 * GET /api/admin/stats/songs-added?range=7d
 * Lấy thống kê bài hát được thêm theo thời gian
 */
const getSongsAdded = async (req, res) => {
  try {
    const { range = '7d' } = req.query;
    const stats = await getSongsAddedOverTime(range);
    res.json(stats);
  } catch (error) {
    console.error('Error in getSongsAdded controller:', error);
    res.status(500).json({
      message: 'Không thể lấy thống kê bài hát theo thời gian',
      error: error.message
    });
  }
};

/**
 * GET /api/admin/stats/user-growth?range=1m
 * Lấy thống kê tăng trưởng người dùng theo thời gian
 */
const getUserGrowthController = async (req, res) => {
  try {
    const { range = '1m' } = req.query;
    const stats = await getUserGrowth(range);
    res.json(stats);
  } catch (error) {
    console.error('Error in getUserGrowthController:', error);
    res.status(500).json({
      message: 'Không thể lấy thống kê tăng trưởng người dùng',
      error: error.message
    });
  }
};

/**
 * GET /api/admin/stats/overview?range=7d
 * Lấy tất cả thống kê cùng lúc (cho dashboard overview)
 */
const getStatsOverview = async (req, res) => {
  try {
    const { range = '7d' } = req.query;
    const stats = await getAllStats(range);
    res.json(stats);
  } catch (error) {
    console.error('Error in getStatsOverview controller:', error);
    res.status(500).json({
      message: 'Không thể lấy tổng quan thống kê',
      error: error.message
    });
  }
};

/**
 * GET /api/admin/stats/total-visits?range=all|1d|7d|1m
 * Lấy tổng số lượt truy cập theo range
 */
const getTotalVisitsController = async (req, res) => {
  try {
    const { range = 'all' } = req.query;
    const totalVisits = await getTotalVisitsStats(range);
    res.json({ totalVisits });
  } catch (error) {
    res.status(500).json({ message: 'Không thể lấy thống kê lượt truy cập', error: error.message });
  }
};

/**
 * Helper function để emit real-time updates
 * Được sử dụng bởi các controller khác khi có thay đổi dữ liệu
 */
const emitStatsUpdate = async (io, eventType = 'all', range = 'all') => {
  try {
    console.log(`📊 Emitting stats update for event: ${eventType}, range: ${range}`);
    
    const events = {
      'music-sources': async () => {
        // Emit for multiple ranges to cover all active clients
        const ranges = ['1d', '7d', '1m', 'all'];
        const results = {};
        
        for (const r of ranges) {
          const data = await getMusicSourcesStats(r);
          io.emit('stats:music-sources-update', { data, range: r });
          results[r] = data;
        }
        return results;
      },
      'top-contributors': async () => {
        const ranges = ['1d', '7d', '1m', 'all'];
        const results = {};
        
        for (const r of ranges) {
          const data = await getTopContributors(r);
          io.emit('stats:top-contributors-update', { data, range: r });
          results[r] = data;
        }
        return results;
      },
      'songs-added': async () => {
        const ranges = ['1d', '7d', '1m', 'all'];
        const results = {};
        
        for (const r of ranges) {
          const data = await getSongsAddedOverTime(r);
          io.emit('stats:songs-added-update', { data, range: r });
          results[r] = data;
        }
        return results;
      },
      'user-growth': async () => {
        console.log("🔄 [USER-GROWTH] Starting multi-range emission...");
        const ranges = ['1d', '7d', '1m', 'all'];
        const results = {};
        
        for (const r of ranges) {
          const data = await getUserGrowth(r);
          console.log(`📊 [USER-GROWTH] Emitting for range ${r}:`, {
            dataLength: Array.isArray(data) ? data.length : 0,
            sampleData: Array.isArray(data) ? data.slice(0, 2) : data
          });
          io.emit('stats:user-growth-update', { data, range: r });
          results[r] = data;
        }
        console.log("✅ [USER-GROWTH] All ranges emitted successfully");
        return results;
      },
      'all': async () => {
        const ranges = ['1d', '7d', '1m', 'all'];
        const allResults = {};
        
        // Emit for all ranges and all event types
        for (const r of ranges) {
          const [musicSources, topContributors, songsAdded, userGrowth] = await Promise.all([
            getMusicSourcesStats(r),
            getTopContributors(r),
            getSongsAddedOverTime(r),
            getUserGrowth(r)
          ]);

          // Emit tất cả events với range specific
          io.emit('stats:music-sources-update', { data: musicSources, range: r });
          io.emit('stats:top-contributors-update', { data: topContributors, range: r });
          io.emit('stats:songs-added-update', { data: songsAdded, range: r });
          io.emit('stats:user-growth-update', { data: userGrowth, range: r });

          allResults[r] = { musicSources, topContributors, songsAdded, userGrowth };
        }
        
        return allResults;
      }
    };

    if (events[eventType]) {
      const result = await events[eventType]();
      console.log(`✅ Stats emitted for event: ${eventType}`);
      return result;
    } else {
      console.warn(`⚠️ Unknown stats event type: ${eventType}`);
      return null;
    }
  } catch (error) {
    console.error(`❌ Error emitting stats update (${eventType}):`, error);
    return null;
  }
};

/**
 * Batch emit multiple stats updates - emit cho tất cả ranges
 */
const emitMultipleStatsUpdates = async (io, eventTypes = []) => {
  try {
    if (eventTypes.length === 0) {
      return await emitStatsUpdate(io, 'all');
    }

    const ranges = ['1d', '7d', '1m', 'all'];
    const allPromises = [];

    for (const eventType of eventTypes) {
      for (const range of ranges) {
        switch (eventType) {
          case 'music-sources':
            allPromises.push(
              getMusicSourcesStats(range).then(data => {
                io.emit('stats:music-sources-update', { data, range });
                return { type: eventType, range, data };
              })
            );
            break;
          case 'top-contributors':
            allPromises.push(
              getTopContributors(range).then(data => {
                io.emit('stats:top-contributors-update', { data, range });
                return { type: eventType, range, data };
              })
            );
            break;
          case 'songs-added':
            allPromises.push(
              getSongsAddedOverTime(range).then(data => {
                io.emit('stats:songs-added-update', { data, range });
                return { type: eventType, range, data };
              })
            );
            break;
          case 'user-growth':
            allPromises.push(
              getUserGrowth(range).then(data => {
                io.emit('stats:user-growth-update', { data, range });
                return { type: eventType, range, data };
              })
            );
            break;
          default:
            break;
        }
      }
    }

    const results = await Promise.all(allPromises);
    console.log(`✅ Multiple stats emitted for ranges [${ranges.join(', ')}]:`, eventTypes);
    return results;
  } catch (error) {
    console.error('❌ Error in emitMultipleStatsUpdates:', error);
    return [];
  }
};

module.exports = {
  getMusicSources,
  getTopContributorsController,
  getSongsAdded,
  getUserGrowthController,
  getStatsOverview,
  emitStatsUpdate,
  emitMultipleStatsUpdates,
  getTotalVisitsController,
};