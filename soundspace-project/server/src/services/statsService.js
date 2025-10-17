/**
 * Lấy thống kê tỷ lệ nguồn nhạc (Upload, YouTube, Spotify, SoundCloud) - không tính admin
 * @param {string} range - '1d', '7d', '1m', 'all'
 * @returns {Promise<{upload: number, youtube: number, spotify: number, soundcloud: number}>}
 */
async function getMusicSourcesStats(range = '7d') {
  try {
    const startDate = getStartDateFromRange(range);
    
    const pipeline = [
      // Unwind playlist để tách từng track
      { $unwind: '$playlist' },
      // Match theo thời gian nếu có startDate
      ...(startDate ? [{ $match: { 'playlist.createdAt': { $gte: startDate } } }] : []),
      // Match chỉ tracks có addedBy
      { $match: { 'playlist.addedBy': { $exists: true, $ne: null } } },
      // Lookup user để kiểm tra role
      {
        $lookup: {
          from: 'users',
          localField: 'playlist.addedBy',
          foreignField: '_id',
          as: 'userInfo'
        }
      },
      // Unwind user info
      { $unwind: '$userInfo' },
      // 🔥 Loại trừ admin - chỉ tính user thường
      {
        $match: {
          'userInfo.role': { $ne: 'admin' }
        }
      },
      // Group theo source và đếm
      {
        $group: {
          _id: '$playlist.source',
          count: { $sum: 1 }
        }
      }
    ];

    const results = await Room.aggregate(pipeline);
    // Khởi tạo object với giá trị mặc định
    const stats = {
      upload: 0,
      youtube: 0,
      spotify: 0,
      soundcloud: 0
    };
    // Map kết quả từ database
    results.forEach(item => {
      const source = item._id;
      if (stats.hasOwnProperty(source)) {
        stats[source] = item.count;
      }
    });
    return stats;
  } catch (error) {
    console.error('Error in getMusicSourcesStats:', error);
    return { upload: 0, youtube: 0, spotify: 0, soundcloud: 0 };
  }
}
// server/src/services/statsService.js
const User = require('../models/User');
const Room = require('../models/room');
const Visit = require('../models/Visit');

/**
 * Tính toán ngày bắt đầu dựa trên range
 * @param {string} range - '1d', '7d', '1m', hoặc 'all'
 * @returns {Date|null} - Ngày bắt đầu hoặc null nếu là 'all'
 */
function getStartDateFromRange(range) {
  const now = new Date();
  switch (range) {
    case '1d':
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case '1m':
      return new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    case 'all':
      return null;
  }
}



/**
 * Lấy top 5 người dùng đóng góp nhiều bài hát nhất (không tính admin)
 * @param {string} range - Khoảng thời gian: '1d', '7d', '1m', 'all'
 * @returns {Promise<Array<{userId: string, username: string, songCount: number, avatar: string}>>}
 */
async function getTopContributors(range = '7d') {
  try {
    const startDate = getStartDateFromRange(range);
    const pipeline = [
      // Unwind để tách từng track
      { $unwind: '$playlist' },
      // Match conditions
      {
        $match: {
          'playlist.addedBy': { $exists: true, $ne: null },
          ...(startDate && { 'playlist.createdAt': { $gte: startDate } })
        }
      },
      // Lookup user để kiểm tra role
      {
        $lookup: {
          from: 'users',
          localField: 'playlist.addedBy',
          foreignField: '_id',
          as: 'userInfo'
        }
      },
      // Unwind user info
      { $unwind: '$userInfo' },
      // 🔥 Loại trừ admin - chỉ tính user thường
      {
        $match: {
          'userInfo.role': { $ne: 'admin' }
        }
      },
      // Group theo user và đếm số bài hát
      {
        $group: {
          _id: '$playlist.addedBy',
          songCount: { $sum: 1 },
          userInfo: { $first: '$userInfo' }
        }
      },
      // Sắp xếp theo số bài hát giảm dần
      { $sort: { songCount: -1 } },
      // Lấy top 5
      { $limit: 5 },
      // Project kết quả cuối
      {
        $project: {
          userId: '$_id',
          username: '$userInfo.username',
          songCount: 1,
          avatar: '$userInfo.avatar',
          email: '$userInfo.email'
        }
      }
    ];

    const results = await Room.aggregate(pipeline);
    return results || [];
  } catch (error) {
    console.error('Error in getTopContributors:', error);
    return [];
  }
}

/**
 * Lấy thống kê số bài hát được thêm theo thời gian (không tính admin)
 * @param {string} range - Khoảng thời gian: '1d', '7d', '1m', 'all'
 * @returns {Promise<Array<{date: string, count: number}>>}
 */
async function getSongsAddedOverTime(range = '7d') {
  try {
    let daysBack, timeFormat;
    
    // Xác định số ngày và format dựa trên range
    switch (range) {
      case '1d':
        daysBack = 1;
        timeFormat = '%Y-%m-%d %H:00'; // Theo giờ
        break;
      case '7d':
        daysBack = 7;
        timeFormat = '%Y-%m-%d'; // Theo ngày
        break;
      case '1m':
        daysBack = 30;
        timeFormat = '%Y-%m-%d'; // Theo ngày
        break;
      case 'all':
      default:
        daysBack = 365; // 1 năm
        timeFormat = '%Y-%m'; // Theo tháng
        break;
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    const pipeline = [
      // Unwind playlist
      { $unwind: '$playlist' },
      // Lọc theo thời gian
      {
        $match: {
          'playlist.createdAt': { $gte: startDate },
          'playlist.addedBy': { $exists: true, $ne: null }
        }
      },
      // Lookup user để kiểm tra role
      {
        $lookup: {
          from: 'users',
          localField: 'playlist.addedBy',
          foreignField: '_id',
          as: 'userInfo'
        }
      },
      // Unwind user info
      { $unwind: '$userInfo' },
      // 🔥 Loại trừ admin - chỉ tính user thường
      {
        $match: {
          'userInfo.role': { $ne: 'admin' }
        }
      },
      // Group theo thời gian (ngày/giờ/tháng)
      {
        $group: {
          _id: {
            $dateToString: {
              format: timeFormat,
              date: '$playlist.createdAt'
            }
          },
          count: { $sum: 1 }
        }
      },
      // Sắp xếp theo ngày
      { $sort: { '_id': 1 } },
      // Project kết quả
      {
        $project: {
          date: '$_id',
          count: 1,
          _id: 0
        }
      }
    ];

    const results = await Room.aggregate(pipeline);

    // Tạo map cho dữ liệu
    const dateMap = new Map();
    results.forEach(item => {
      dateMap.set(item.date, item.count);
    });

    // Tạo dữ liệu đầy đủ cho khoảng thời gian
    const finalResults = [];
    
    if (range === '1d') {
      // 24 giờ gần nhất
      for (let i = 23; i >= 0; i--) {
        const date = new Date();
        date.setHours(date.getHours() - i);
        const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:00`;
        
        finalResults.push({
          date: dateStr,
          count: dateMap.get(dateStr) || 0
        });
      }
    } else if (range === 'all') {
      // 12 tháng gần nhất
      for (let i = 11; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        finalResults.push({
          date: dateStr,
          count: dateMap.get(dateStr) || 0
        });
      }
    } else {
      // Theo ngày cho 7d và 1m
      for (let i = daysBack - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        finalResults.push({
          date: dateStr,
          count: dateMap.get(dateStr) || 0
        });
      }
    }

    return finalResults;
  } catch (error) {
    console.error('Error in getSongsAddedOverTime:', error);
    // Trả về 7 ngày với giá trị 0
    const results = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      results.push({
        date: date.toISOString().split('T')[0],
        count: 0
      });
    }
    return results;
  }
}

/**
 * Lấy thống kê tăng trưởng người dùng theo thời gian (không tính admin)
 * @param {string} range - Khoảng thời gian: '1d', '7d', '1m', 'all'
 * @returns {Promise<Array<{month: string, userCount: number}>>}
 */
async function getUserGrowth(range = '1m') {
  try {
    let monthsBack, periodFormat;
    
    // Xác định khoảng thời gian dựa trên range
    switch (range) {
      case '1d':
      case '7d':
        monthsBack = 3; // 3 tháng gần nhất cho short range
        periodFormat = 'month';
        break;
      case '1m':
        monthsBack = 6; // 6 tháng gần nhất
        periodFormat = 'month';
        break;
      case 'all':
      default:
        monthsBack = 12; // 12 tháng gần nhất
        periodFormat = 'month';
        break;
    }

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - monthsBack);

    const pipeline = [
      // Lọc user trong khoảng thời gian và loại trừ admin
      {
        $match: {
          createdAt: { $gte: startDate },
          role: { $ne: 'admin' } // 🔥 Loại trừ admin
        }
      },
      // Group theo tháng và đếm số user mới
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          newUsers: { $sum: 1 }
        }
      },
      // Sort theo thời gian
      {
        $sort: {
          '_id.year': 1,
          '_id.month': 1
        }
      }
    ];

    const monthlyNewUsers = await User.aggregate(pipeline);

    // Tính tổng tích lũy cho mỗi tháng
    const results = [];
    let cumulativeCount = 0;

    // Đầu tiên, lấy số user hiện có trước khoảng thời gian (không tính admin)
    const existingUsersCount = await User.countDocuments({
      createdAt: { $lt: startDate },
      role: { $ne: 'admin' } // 🔥 Loại trừ admin
    });
    cumulativeCount = existingUsersCount;

    // Tạo map cho dữ liệu monthly
    const monthlyMap = new Map();
    monthlyNewUsers.forEach(item => {
      const monthKey = `${item._id.year}-${String(item._id.month).padStart(2, '0')}`;
      monthlyMap.set(monthKey, item.newUsers);
    });

    // Tạo kết quả cho khoảng thời gian
    for (let i = monthsBack - 1; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      // Cộng số user mới trong tháng này
      const newUsersThisMonth = monthlyMap.get(monthKey) || 0;
      cumulativeCount += newUsersThisMonth;

      results.push({
        month: monthKey,
        userCount: cumulativeCount
      });
    }

    return results;
  } catch (error) {
    console.error('Error in getUserGrowth:', error);
    // Trả về 12 tháng với giá trị mặc định
    const results = [];
    const currentUserCount = await User.countDocuments({ 
      role: { $ne: 'admin' } // 🔥 Loại trừ admin
    }).catch(() => 0);
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      results.push({
        month: monthKey,
        userCount: Math.max(0, currentUserCount - (i * 10)) // Mock data nếu có lỗi
      });
    }
    return results;
  }
}

/**
 * Lấy tất cả thống kê cùng lúc để tối ưu performance
 * @param {string} range - Khoảng thời gian: '1d', '7d', '1m', 'all'
 * @returns {Promise<{musicSources: Object, topContributors: Array, songsAdded: Array, userGrowth: Array}>}
 */
async function getAllStats(range = '7d') {
  try {
    const [musicSources, topContributors, songsAdded, userGrowth] = await Promise.all([
      getMusicSourcesStats(range),
      getTopContributors(range),
      getSongsAddedOverTime(range),
      getUserGrowth(range)
    ]);

    return {
      musicSources,
      topContributors,
      songsAdded,
      userGrowth
    };
  } catch (error) {
    console.error('Error in getAllStats:', error);
    return {
      musicSources: { upload: 0, youtube: 0, spotify: 0, soundcloud: 0 },
      topContributors: [],
      songsAdded: [],
      userGrowth: []
    };
  }
}

/**
 * Lấy tổng số lượt truy cập (login) theo range (không tính admin)
 * @param {string} range - '1d', '7d', '1m', 'all'
 * @returns {Promise<number>}
 */
async function getTotalVisitsStats(range = 'all') {
  try {
    const startDate = getStartDateFromRange(range);
    
    // Pipeline để loại trừ admin
    const pipeline = [
      // Match theo thời gian nếu có
      ...(startDate ? [{ $match: { createdAt: { $gte: startDate } } }] : []),
      
      // Lookup user để kiểm tra role
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      
      // Unwind user (có thể null)
      {
        $unwind: {
          path: '$user',
          preserveNullAndEmptyArrays: true
        }
      },
      
      // Loại trừ admin và null userId
      {
        $match: {
          $and: [
            { userId: { $ne: null } },
            { $or: [
              { 'user.role': { $ne: 'admin' } },
              { 'user.role': { $exists: false } }
            ]}
          ]
        }
      },
      
      // Đếm
      { $count: 'total' }
    ];
    
    const result = await Visit.aggregate(pipeline);
    return result.length > 0 ? result[0].total : 0;
  } catch (error) {
    console.error('Error in getTotalVisitsStats:', error);
    return 0;
  }
}

module.exports = {
  getMusicSourcesStats,
  getTopContributors,
  getSongsAddedOverTime,
  getUserGrowth,
  getAllStats,
  getTotalVisitsStats,
};