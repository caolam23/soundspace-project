# SoundSpace Backend - Real-time Statistics API

## 📊 Tổng quan

Backend đã được cập nhật để hỗ trợ thống kê real-time với Socket.IO cho Admin Dashboard.

## 🆕 Features mới đã thêm

### 1. Stats Service (`src/services/statsService.js`)
- `getMusicSourcesStats()` - Tỷ lệ nguồn nhạc (Upload vs YouTube vs Spotify vs SoundCloud)
- `getTopContributors()` - Top 5 người dùng đóng góp nhiều nhất
- `getSongsAddedOverTime()` - Số bài hát được thêm theo ngày (7 ngày gần nhất) 
- `getUserGrowth()` - Tăng trưởng người dùng theo tháng (12 tháng gần nhất)
- `getAllStats()` - Lấy tất cả thống kê cùng lúc

### 2. Stats Controller (`src/controllers/statsController.js`)
**API Endpoints:**
- `GET /api/admin/stats/music-sources` - Tỷ lệ nguồn nhạc
- `GET /api/admin/stats/top-contributors` - Top contributors  
- `GET /api/admin/stats/songs-added` - Bài hát theo thời gian
- `GET /api/admin/stats/user-growth` - Tăng trưởng user
- `GET /api/admin/stats/overview` - Tất cả stats

**Real-time Functions:**
- `emitStatsUpdate(io, eventType)` - Emit single stat update
- `emitMultipleStatsUpdates(io, eventTypes[])` - Batch emit multiple updates

### 3. Real-time Integration

#### 🎵 Playlist Controller Updates
Khi thêm bài hát mới (YouTube hoặc Upload):
```javascript
// Emit stats updates
emitMultipleStatsUpdates(io, ['music-sources', 'songs-added', 'top-contributors']);
```

#### 👥 User Registration Updates  
Khi có user mới đăng ký:
```javascript
// Emit user growth stats
emitStatsUpdate(io, 'user-growth');
```

### 4. Socket Events được emit

| Event | Dữ liệu | Khi nào |
|-------|---------|---------|
| `stats:music-sources-update` | `{upload, youtube, spotify, soundcloud}` | Khi thêm bài hát mới |
| `stats:top-contributors-update` | `[{username, songCount, avatar}]` | Khi thêm bài hát mới |
| `stats:songs-added-update` | `[{date, count}]` | Khi thêm bài hát mới |
| `stats:user-growth-update` | `[{month, userCount}]` | Khi có user mới |

## 🔐 Authentication & Authorization

Tất cả stats endpoints yêu cầu:
1. **Authentication**: Valid JWT token
2. **Authorization**: User role phải là `admin`

```javascript
// Middleware chain
router.use(authenticateToken);
router.use(requireAdmin);
```

## 🧪 Testing

```bash
# Test tất cả stats functions
node test-stats.js
```

Kết quả test mẫu:
```
📊 Testing Stats Service...

✅ getMusicSourcesStats: {upload: 0, youtube: 4, spotify: 0, soundcloud: 0}
✅ getTopContributors: [{"username": "Kiet Ha", "songCount": 4}]
✅ getSongsAddedOverTime: 7 ngày dữ liệu
✅ getUserGrowth: 12 tháng dữ liệu  
```

## 📡 API Usage Examples

### Lấy tỷ lệ nguồn nhạc
```bash
curl -H "Authorization: Bearer <admin-token>" \
     http://localhost:8800/api/admin/stats/music-sources
```

**Response:**
```json
{
  "upload": 0,
  "youtube": 4, 
  "spotify": 0,
  "soundcloud": 0
}
```

### Lấy top contributors
```bash
curl -H "Authorization: Bearer <admin-token>" \
     http://localhost:8800/api/admin/stats/top-contributors
```

**Response:**
```json
[
  {
    "userId": "68f1093c8af391ca35cc8e9e",
    "username": "Kiet Ha",
    "songCount": 4,
    "avatar": "https://...",
    "email": "user@example.com"
  }
]
```

## 🚀 Performance Optimizations

### 1. Database Aggregation
- Sử dụng MongoDB aggregation pipelines cho hiệu suất cao
- Index trên các trường thường query (`createdAt`, `source`, `addedBy`)

### 2. Error Handling
- Graceful fallback khi stats functions fail
- Default values để đảm bảo API luôn trả về data hợp lệ

### 3. Socket Efficiency  
- Batch emit multiple stats cùng lúc
- Async/non-blocking stats updates
- Error isolation (stats lỗi không ảnh hưởng main flow)

## 🔧 Configuration

### Environment Variables
```env
MONGODB_URI=mongodb://localhost:27017/soundspace
JWT_SECRET=your-secret-key
CLIENT_URL=http://localhost:5173
```

### Database Indexes
```javascript
// Recommended indexes for optimal stats performance
db.rooms.createIndex({"playlist.createdAt": -1})
db.rooms.createIndex({"playlist.source": 1}) 
db.rooms.createIndex({"playlist.addedBy": 1})
db.users.createIndex({"createdAt": -1})
```

## 📈 Data Models

### Music Sources Stats
```javascript
{
  upload: Number,     // Số bài upload
  youtube: Number,    // Số bài từ YouTube  
  spotify: Number,    // Số bài từ Spotify
  soundcloud: Number  // Số bài từ SoundCloud
}
```

### Top Contributors
```javascript
[{
  userId: ObjectId,
  username: String,
  songCount: Number,
  avatar: String,
  email: String
}]
```

### Songs Added Over Time (7 days)
```javascript
[{
  date: "YYYY-MM-DD",
  count: Number
}]
```

### User Growth (12 months)  
```javascript
[{
  month: "YYYY-MM",
  userCount: Number  // Tổng tích lũy
}]
```

## 🔄 Real-time Flow

```
1. User thêm bài hát mới
   ↓
2. playlist.controller.js saves to DB
   ↓  
3. emitMultipleStatsUpdates() được gọi
   ↓
4. Stats được tính toán từ DB
   ↓
5. Socket events được emit đến tất cả clients
   ↓
6. Frontend Dashboard tự động cập nhật
```

## 🛡️ Security

- ✅ Admin-only access với role checking
- ✅ JWT token validation  
- ✅ Input sanitization
- ✅ Rate limiting có thể thêm nếu cần
- ✅ Error messages không leak sensitive info

## 🔍 Monitoring & Debugging

Logs để monitor:
```javascript
console.log('📊 Stats updates emitted for new track');
console.log('✅ Multiple stats emitted:', results.map(r => r.type));
console.error('❌ Error emitting stats updates:', err);
```

---

**Backend đã sẵn sàng phục vụ Admin Dashboard với real-time statistics!** 🚀