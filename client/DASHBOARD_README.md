# SoundSpace Admin Dashboard

## Mô tả
Dashboard thống kê real-time cho ứng dụng SoundSpace với 4 biểu đồ chính:

1. **Tỷ lệ nguồn nhạc** (PieChart) - Upload vs YouTube
2. **Top 5 người dùng đóng góp** (BarChart) 
3. **Bài hát được thêm theo thời gian** (LineChart)
4. **Tăng trưởng người dùng theo tháng** (LineChart)

## Công nghệ sử dụng
- **React** - UI Framework
- **Ant Design** - Component Library
- **Recharts** - Chart Library
- **Socket.IO Client** - Real-time updates

## Cấu trúc Files

```
src/
├── components/
│   ├── charts/
│   │   ├── MusicSourcesChart.jsx     # Biểu đồ tỷ lệ nguồn nhạc
│   │   ├── TopContributorsChart.jsx  # Biểu đồ top người đóng góp
│   │   ├── SongsAddedChart.jsx       # Biểu đồ bài hát theo thời gian
│   │   └── UserGrowthChart.jsx       # Biểu đồ tăng trưởng người dùng
│   ├── StatsSummary.jsx              # Thống kê tổng quan
│   └── DashboardDemo.jsx             # Demo component (không cần backend)
├── hooks/
│   └── useDashboardData.js           # Custom hook quản lý data
└── pages/admin/
    ├── Dashboard.jsx                 # Main dashboard component
    └── Dashboard.css                 # Styling cho dashboard
```

## Socket Events

Dashboard lắng nghe các events real-time từ server:

- `stats:music-sources-update` - Cập nhật tỷ lệ nguồn nhạc
- `stats:top-contributors-update` - Cập nhật top người đóng góp  
- `stats:songs-added-update` - Cập nhật bài hát theo thời gian
- `stats:user-growth-update` - Cập nhật tăng trưởng người dùng

## API Endpoints (Backend cần implement)

```javascript
// Tỷ lệ nguồn nhạc
GET /api/admin/stats/music-sources
Response: { upload: number, youtube: number }

// Top người đóng góp
GET /api/admin/stats/top-contributors  
Response: [{ username: string, songCount: number }]

// Bài hát theo thời gian
GET /api/admin/stats/songs-added
Response: [{ date: string, count: number }]

// Tăng trưởng người dùng
GET /api/admin/stats/user-growth
Response: [{ month: string, userCount: number }]
```

## Cách sử dụng

### 1. Import Dashboard vào App Router
```jsx
import Dashboard from './pages/admin/Dashboard';

// Trong route admin
<Route path="/admin/dashboard" element={<Dashboard />} />
```

### 2. Test với DashboardDemo
```jsx
import DashboardDemo from './components/DashboardDemo';

// Sử dụng để test giao diện mà không cần backend
<DashboardDemo />
```

### 3. Socket Connection
Dashboard tự động kết nối socket và lắng nghe events khi component mount:

```jsx
// Trong useDashboardData hook
useEffect(() => {
  socket.on("stats:music-sources-update", handleUpdate);
  socket.on("stats:top-contributors-update", handleUpdate);  
  socket.on("stats:songs-added-update", handleUpdate);
  socket.on("stats:user-growth-update", handleUpdate);
  
  return () => {
    // Cleanup listeners
  };
}, []);
```

## Features

### ✅ Đã implement
- 4 biểu đồ thống kê với Recharts
- Real-time updates qua Socket.IO
- Responsive design với Ant Design
- Loading states và error handling
- Thống kê tổng quan (StatsSummary)
- Demo component để test

### 🎯 Tính năng nổi bật
- **Real-time**: Dữ liệu cập nhật ngay lập tức khi có thay đổi
- **Responsive**: Hiển thị tốt trên mọi thiết bị
- **Error Handling**: Xử lý lỗi và retry functionality
- **Modular**: Code được chia thành components nhỏ, dễ maintain
- **Demo Mode**: Test dashboard mà không cần backend

## Installation

```bash
cd client
npm install antd recharts
```

## Dependencies Added
- `antd` - Ant Design components
- `recharts` - Chart library

## Next Steps (Backend)

Backend cần implement:
1. API endpoints cho các thống kê
2. Socket events để emit real-time updates
3. Middleware authentication cho admin routes
4. Database queries để lấy dữ liệu thống kê

## Demo

Để test dashboard ngay lập tức, sử dụng `DashboardDemo` component có mock data và real-time simulation.