# Soundspace Project — Project Documentation

## Mục đích
Tài liệu này tổng hợp cấu trúc source, API backend, mô hình dữ liệu, socket events và các thành phần frontend để bạn dễ nắm toàn cảnh dự án (FE + BE).

---

## 1. Vị trí chính
- Backend root: server/src
- Frontend root: client/src

---

## 2. Backend — Models chính
- `User` (server/src/models/User.js): email, password, username, role, currentRole, avatar, isBlocked, contributionPoints, totalSongRequests, approvedRequests.
- `Room` (server/src/models/room.js): name, owner, members, privacy, roomCode, status, playlist (TrackSchema), songRequests (SongRequestSchema), statistics, chat, virtual `memberCount`.
- `Notification` (server/src/models/Notification.js): userId, type, payload, isRead, createdAt.
- `Report` / `RoomReport` (server/src/models/Report.js, RoomReport.js): báo cáo comment / phòng.
- `Visit` (server/src/models/Visit.js): log lượt truy cập.

---

## 3. Backend — Routes / Endpoints chính (method + path -> controller)
- Auth
  - POST `/api/register` -> `register` (authController)
  - POST `/api/login` -> `login`
  - GET `/api/google`, GET `/api/google/callback` -> Google OAuth
  - GET `/api/me` (auth) -> `getMe`
  - GET `/api/profile` (verifyToken) -> `getProfile`

- Users
  - GET `/api/users/` -> `getAllUsers`
  - POST `/api/users/create` -> `createUser`
  - DELETE `/api/users/:id` -> `deleteUser`
  - PUT `/api/users/:id/toggle-lock`, `/api/users/:id/update-info`, `/api/users/:id/update-role`, `/api/users/:id/reset-password`, PUT `/api/users/change-password`

- Rooms
  - POST `/api/rooms/create` (verifyToken + upload) -> `createRoom` (roomController)
  - GET `/api/rooms/active` -> `getActiveRooms`
  - POST `/api/rooms/:roomId/start` -> `startSession`
  - PUT `/api/rooms/:roomId/end` -> `endSession`
  - GET `/api/rooms/:roomId` -> `getRoomDetails`
  - POST `/api/rooms/:roomId/join` -> `joinRoom`
  - POST `/api/rooms/:roomId/request-join` -> `requestJoinRoom`
  - GET `/api/rooms/search-by-code/:roomCode` -> `searchRoomByCode`
  - POST `/api/rooms/:roomId/report` -> `reportRoom`
  - POST `/api/rooms/:roomId/ghost-join`, `/api/rooms/:roomId/send-ghost-message` (admin ghost features)

- Requests (Song Requests)
  - POST `/api/rooms/:roomId/requests/youtube` -> `addRequestFromYouTube`
  - POST `/api/rooms/:roomId/requests/upload` -> `addRequestFromUpload`
  - POST `/api/rooms/:roomId/requests/:requestId/vote` -> `voteRequest`
  - POST `/api/rooms/:roomId/requests/:requestId/approve` -> `approveRequest`
  - POST `/api/rooms/:roomId/requests/:requestId/reject` -> `rejectRequest`
  - GET `/api/rooms/:roomId/requests` -> `getRequests`
  - PUT `/api/rooms/:roomId/request-settings` -> `updateRequestSettings`

- Playlist
  - POST `/api/:roomId/playlist` -> add track by link
  - POST `/api/:roomId/playlist/upload` -> add track by upload
  - DELETE `/api/:roomId/playlist/:trackId` -> remove track

- Notifications
  - GET `/api/notifications` -> `getNotifications`
  - PUT `/api/notifications/:id/read`, PUT `/api/notifications/mark-all-read`, DELETE `/api/notifications/read`, DELETE `/api/notifications/:id`

- Recommendations
  - GET `/api/recommendations/trending` -> `getTrendingTracks`
  - GET `/api/recommendations/profile` -> `getHostProfile`

- Admin / Stats
  - Routes under `/api/admin/*` and `/api/admin/stats/*` (music-sources, top-contributors, songs-added, user-growth, overview)

- Streaming
  - GET `/api/stream/:videoId` -> `streamTrack`

---

## 4. Backend — Các controller & service chính
- `authController.js` — register/login, Google OAuth, get profile.
- `roomController.js` — create/join/start/end/search/report/ghost features.
- `requestController.js` — core Song Request system: add (YouTube/upload), vote, approve/reject, auto-approve, batch approve, create notification.
- `playlist.controller.js` — add track by link/upload, delete track, start playback state changes.
- `recommendationController.js` — trending algorithm + host profile builder (context-aware scoring based on tags/mood/popularity).
- `notificationController.js`, `statsController.js`, `adminController.js`, `stream.controller.js`.
- Services: `cleanupService.js`, `chatService.js`, `statsService.js`, `emailService.js`.

---

## 5. Realtime (Socket.io)
- Initialization: `server/src/socket/index.js` (JWT handshake). Exposes `io` and `userSockets` map.
- Handlers
  - `user.handler.js`: `register-user`, `user-logout`, `disconnect` (manage online status)
  - `room.handler.js`: `join-room`, `request-to-join`, `respond-to-request`, `join-room-ghost`, `leave-room`, `update-members`, `room-members-changed` (emits for admin dashboard)
  - `music.handler.js`: `music-control` (PLAY/PAUSE/SKIP/SEEK), `sync-time`, broadcasts `playback-state-changed`
  - Chat and report handlers registered from controllers.

---

## 6. Frontend — cấu trúc & components chính
- Pages (client/src/pages): `LandingPage`, `AuthPage`, `AuthSuccess`, `UserHomePage`, `RoomPage`, `GuestRoom`, `AdminPanel`, `AdminLayout`.
- Components (client/src/components): `MusicPlayer`, `RoomChat`, `RoomCard`, `Sidebar`, `SongRequest/*` (host actions, modals), `AI/AIRecommendationDock.jsx` (gọi `recommendationApi`), Charts under `components/charts`.
- State: Redux slices include `requestSlice` (client/src/store/requestSlice.js) — fetch/submit/vote requests.

---

## 7. Frontend — Client APIs (client/src/services)
- `api.js`: axios base instance with token interceptor; helper `reportRoom`.
- `requestApi.js`: maps to `/rooms/:roomId/requests/*` endpoints (get, youtubeRequest, uploadRequest, vote, approve, reject, updateSettings).
- `recommendationApi.js`: GET `/api/recommendations/trending` and `/profile`.
- `notificationApi.js`: GET/PUT/DELETE `/api/notifications`.
- `socket.js`: socket.io client setup (autoConnect: false) used by `RoomPage`, `MusicPlayer`, notifications, etc.

---

## 8. Các tính năng nổi bật & lưu ý triển khai
- Song Request system: supports YouTube + file uploads, votes, auto-approve by threshold %, batch approve when switching mode.
- Gamification: `contributionPoints`, `approvedRequests` on `User`.
- Admin ghost mode: admin có thể xem phòng mà không ảnh hưởng thống kê (ghost mode socket flows).
- Real-time notifications and personal notifications via socket `personal-notification`.
- Recommendation engine: context-aware (tags/mood) + deduplication and scoring.
- Throttles/limits: per-user pending request limit, playlist YouTube/upload limits (8/5), validation on server.

---

## 9. Gợi ý tiếp theo (tôi có thể làm)
- Sinh OpenAPI (YAML/JSON) cho các endpoint quan trọng.
- Tạo Postman collection từ endpoints.
- Thêm một file `API_REFERENCE.md` chi tiết hơn (ví dụ request/response mẫu).

---

## 10. File liên quan nhanh (để mở nhanh)
- Backend routes: `server/src/routes/*`
- Backend controllers: `server/src/controllers/*`
- Backend models: `server/src/models/*`
- Socket: `server/src/socket/*`
- Frontend services: `client/src/services/*`
- Frontend pages: `client/src/pages/*`

---

*File được tạo tự động bởi trợ lý — nếu muốn, tôi sẽ mở rộng thành OpenAPI hoặc Postman collection.*
