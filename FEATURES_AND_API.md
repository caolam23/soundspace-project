# SoundSpace — Tổng quan chức năng & API

Tài liệu tóm tắt các chức năng chính của dự án, danh sách endpoint HTTP quan trọng, các sự kiện Socket.IO và các thành phần UI.

---

**Tổng quan ngắn**
- Ứng dụng live audio/room (host phát nhạc, listeners tham gia, chat realtime).
- Hỗ trợ nguồn nhạc: YouTube (stream qua server) và upload audio (Cloudinary).
- Hệ thống phòng: public/manual/private (mã 6 ký tự), host quản lý playlist và phiên live.
- Quản trị (admin): quản lý user, quản lý phòng, thống kê.

**Backend — Endpoints HTTP chính (method + path) và file controller**
- Auth
  - POST /api/auth/register  — `src/controllers/authController.js` (register)
  - POST /api/auth/login     — `src/controllers/authController.js` (login)
  - GET  /api/auth/google    — `src/controllers/authController.js` (googleAuth)
  - GET  /api/auth/google/callback — `src/controllers/authController.js` (googleCallback)
  - GET  /api/auth/me        — `src/controllers/authController.js` (getMe) (auth)
  - GET  /api/auth/profile   — `src/controllers/authController.js` (getProfile) (verifyToken)

- Users
  - GET  /api/users                      — `src/controllers/userController.js` (getAllUsers)
  - POST /api/users/create               — `src/controllers/userController.js` (createUser)
  - DELETE /api/users/:id                — `src/controllers/userController.js` (deleteUser)
  - PUT /api/users/:id/toggle-lock       — `src/controllers/userController.js` (toggleLockUser)
  - PUT /api/users/change-password       — `src/controllers/userController.js` (changePassword) (verifyToken)
  - PUT /api/users/:id/update-info       — `src/controllers/userController.js` (updateUserInfo)
  - PUT /api/users/:id/update-role       — `src/controllers/userController.js` (updateUserRole)
  - PUT /api/users/:id/reset-password    — `src/controllers/userController.js` (resetUserPassword)

- Rooms
  - POST  /api/rooms/create                        — `src/controllers/roomController.js` (createRoom) (upload coverImage)
  - GET   /api/rooms/active                        — `src/controllers/roomController.js` (getActiveRooms)
  - POST  /api/rooms/:roomId/start                 — `src/controllers/roomController.js` (startSession)
  - PUT   /api/rooms/:roomId/end                   — `src/controllers/roomController.js` (endSession)
  - GET   /api/rooms/:roomId                       — `src/controllers/roomController.js` (getRoomDetails)
  - POST  /api/rooms/:roomId/join                  — `src/controllers/roomController.js` (joinRoom)
  - POST  /api/rooms/:roomId/request-join          — `src/controllers/roomController.js` (requestJoinRoom)
  - GET   /api/rooms/search-by-code/:roomCode      — `src/controllers/roomController.js` (searchRoomByCode)

- Playlist
  - POST  /api/rooms/:roomId/playlist              — `src/controllers/playlist.controller.js` (addTrack - từ link)
  - POST  /api/rooms/:roomId/playlist/upload       — `src/controllers/playlist.controller.js` (addTrackByUpload) (multipart upload)
  - DELETE /api/rooms/:roomId/playlist/:trackId    — `src/controllers/playlist.controller.js` (removeTrackFromPlaylist)

- Stream
  - GET /api/stream/:videoId                       — `src/controllers/stream.controller.js` (streamTrack)

- Admin / Quản lý phòng
  - GET /api/admin/dashboard                       — `src/controllers/adminController.js` (getDashboard) (auth + isAdmin)
  - GET /api/quanlyphong/rooms                     — `src/controllers/QuanLyPhongController.js` (getAllRooms) (admin)
  - GET /api/quanlyphong/rooms/statistics          — `src/controllers/QuanLyPhongController.js` (getRoomStatistics) (admin)
  - GET /api/quanlyphong/rooms/:roomId             — `src/controllers/QuanLyPhongController.js` (getRoomById) (admin)
  - DELETE /api/quanlyphong/rooms/:roomId          — `src/controllers/QuanLyPhongController.js` (deleteRoom) (admin)
  - PATCH  /api/quanlyphong/rooms/:roomId/ban      — `src/controllers/QuanLyPhongController.js` (toggleBanRoom) (admin)

**Socket / Realtime — Sự kiện chính**
- Client → Server
  - `join-room`            — join một room (roomId)
  - `leave-room`           — leave room
  - `register-user`        — đăng ký mapping socket -> userId
  - `send-chat-message`    — gửi chat (server lưu và broadcast)
  - `request-to-join` / `respond-to-request` — flow phòng manual
  - `music-control`        — action từ host: PLAY/PAUSE/SKIP/SEEK
  - `sync-time`            — host gửi time để listeners sync
  - `respond-to-request`   — host chấp nhận/từ chối join request

- Server → Client
  - `new-chat-message`     — broadcast tin nhắn (kèm `isHost` nếu message từ host)
  - `update-members`       — cập nhật danh sách thành viên
  - `user-joined-notification`, `user-left-notification`
  - `room-ended`, `room-ended-homepage`
  - `join-request-accepted`, `join-request-denied`
  - `playlist-updated`, `playback-state-changed`, `time-updated`
  - `room-status-changed`, `room-info-update`, `room-members-changed`
  - `user-blocked`

**Frontend — Pages & Components & chức năng UI**
- Pages chính (client/src/pages): `LandingPage`, `AuthPage`, `AuthSuccess`, `UserHomePage`, `RoomPage`, `GuestRoom`, Admin pages (`AdminLayout`, `Dashboard`, `Users`, `QuanLyPhong`, `Settings`).
- Router: `src/routes/AppRouter.jsx` với `UserRoute` và `AdminRoute` bảo vệ route.
- Room page (`src/pages/RoomPage.jsx`): hiển thị room, members, chat, join/leave, xử lý reload, host-only controls (end, invite), join-by-code, request/approve.
- Music player (`src/components/MusicPlayer.jsx`):
  - Đồng bộ playback host → listeners (sync interval), auto-seek khi drift lớn.
  - Play/pause/next/prev/seek (host), optimistic UI.
  - Nguồn: `upload` (direct URL) hoặc `youtube` (stream qua server).
  - Visualization: WebAudio API + beat detection + animation.
  - Thêm nhạc từ link và upload (modal), giới hạn YouTube 8 bài, upload 5 bài/room.
- Chat (`src/components/RoomChat.jsx`): send, temp message, reply, highlight, host badge.
- Room list / Card (`src/components/RoomCard.jsx`): join flow (public/manual/private), modal mã phòng, socket handling.
- Admin UI: layout + `Sidebar` + pages quản lý users/rooms.
- Services: `src/services/api.js` (axios base + token interceptor), `src/services/socket.js` (socket.io client), `src/services/toastConfig.js`.

**Nghiệp vụ & giới hạn**
- Chỉ owner (host) được thêm/xóa bài, bắt đầu/kết thúc phiên.
- Private room yêu cầu mã 6 ký tự; Manual room cần phê duyệt.
- YouTube tracks tối đa 8 per room; Upload tracks tối đa 5 per room.
- Khi host reload trong lúc live → host sẽ bị end session.
- Khi admin khóa user → server emit `user-blocked` và force disconnect.

---

**Tệp đã tạo**
- Tài liệu này: `FEATURES_AND_API.md` (gốc repo).

**Next steps — bạn muốn tôi làm gì tiếp theo?**
- Xuất chi tiết từng endpoint thành bảng (method/path/params/response) — có thể làm thành OpenAPI (YAML/JSON).
- Sinh file markdown chi tiết cho Socket events (payload schemas).
- Tạo README tóm tắt riêng cho backend và frontend.

Viết lựa chọn bạn muốn (ví dụ: "OpenAPI" hoặc "Socket doc") và tôi sẽ tiếp tục.