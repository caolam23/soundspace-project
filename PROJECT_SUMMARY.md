# SoundSpace — Tổng hợp chức năng, luồng hoạt động và công nghệ

Tệp này tóm tắt đầy đủ các chức năng của dự án, mô tả các luồng hoạt động chính và liệt kê công nghệ được sử dụng (backend + frontend + realtime).

---

**1. Tổng quan ứng dụng**
- Ứng dụng live audio / phòng nghe nhạc realtime. Host (chủ phòng) có thể tạo phòng, thêm nhạc (từ YouTube hoặc upload), phát/thao tác playlist; listeners tham gia nghe, chat, và tương tác.
- Hỗ trợ role: `admin`, `user` (và `host` là trạng thái currentRole của user trong phòng).

**2. Tính năng chính (chi tiết)**
- Authentication
  - Đăng ký, đăng nhập (local), đăng nhập bằng Google OAuth.
  - JWT cho API, endpoint lấy user hiện tại và profile.
- User management
  - Tạo user (admin hoặc qua form), lấy danh sách users, cập nhật thông tin, thay đổi/đặt lại mật khẩu, khóa/mở khóa user, cập nhật role/currentRole.
  - Gửi email (welcome/reset) qua `emailService`.
- Room lifecycle
  - Tạo phòng với ảnh bìa (upload lên Cloudinary), đặt privacy: `public`, `manual`, `private` (mã 6 ký tự).
  - Lấy danh sách phòng active, lấy chi tiết phòng, tìm phòng theo mã.
  - Tham gia phòng: auto-join cho public, join bằng code cho private, request/approve cho manual.
  - Host: bắt đầu phiên (start), kết thúc phiên (end) — kết thúc dọn file tạm, tính duration, gửi thông báo realtime.
- Playlist & Music
  - Thêm track từ link (YouTube) — validate, hạn chế tối đa 8 track YouTube/room.
  - Upload audio + thumbnail (Cloudinary) — hạn chế 5 upload/room, lấy duration, lưu metadata.
  - Xóa track (chỉ host), auto-play nếu là track đầu.
  - Playback state: playlist, currentTrackIndex, isPlaying, playbackStartTime.
- Streaming
  - Endpoint stream audio `/api/stream/:videoId` dùng `ytdl-core` + fallback `yt-dlp`, proxy stream với header phù hợp, caching metadata (LRU).
- Realtime & Chat
  - Socket.IO events: join/leave/register-user, chat (send & broadcast), music-control (PLAY/PAUSE/SKIP/SEEK), sync-time (host → listeners), join-request flows.
  - Tin nhắn chat được lưu qua `chatService` và broadcast; server đính `isHost` cho message từ host.
- Admin features
  - Dashboard (protected), quản lý phòng (list, detail, delete, ban/unban, statistics), quản lý users.
- UX / Client features
  - MusicPlayer: đồng bộ playback host→listeners (host gửi `sync-time` theo interval; client tự điều chỉnh nếu drift > threshold), WebAudio visualization (beat detection), optimistic UI cho control.
  - RoomChat: reply, temp messages, scroll, highlight, host badge.
  - RoomCard / Room list: join flow UI, modal nhập mã, waiting overlay cho request/approve.
  - Toasts, confirm modal (SweetAlert2), localStorage flags `room_visited_*` để xử lý reload behavior.

**3. Luồng hoạt động chính (mô tả)**

- Luồng Authentication
  1. User đăng ký hoặc đăng nhập qua form -> gọi API `/api/auth/register` hoặc `/api/auth/login`.
  2. Server trả về JWT; client lưu `token` vào `localStorage`.
  3. `AuthContext` trong frontend đọc token, gọi `/api/auth/me` hoặc `/api/auth/profile` để lấy user.

- Luồng tạo phòng (Host)
  1. Host upload ảnh bìa + gửi thông tin phòng -> POST `/api/rooms/create` (multipart) -> server upload lên Cloudinary, tạo document `Room`.
  2. Server emit `room-created` qua Socket.IO để cập nhật homepage/room list.

- Luồng tham gia phòng
  - Public: client gọi POST `/api/rooms/:roomId/join` -> server thêm user vào `members`, emit `update-members` và `room-members-changed`.
  - Private: client hiển thị modal mã, gửi code cùng POST `/join`; server kiểm tra code.
  - Manual: client emit `request-to-join` socket -> host nhận `new-join-request` -> host respond -> server emit `join-request-accepted` hoặc `join-request-denied`.

- Luồng playback đồng bộ
  - Host thay đổi trạng thái (PLAY/PAUSE/SKIP/SEEK) -> client host emit `music-control` -> server cập nhật DB `Room` và emit `playback-state-changed` + `playlist-updated` về room.
  - Host định kỳ emit `sync-time` (currentTime). Listeners: khi nhận `time-updated` hoặc `playback-state-changed`, so sánh với local audio.currentTime; nếu drift > threshold (1.5s) thì tự seek về thời gian server.
  - Khi stream là YouTube: frontend audio src là `/api/stream/:videoId` (server proxy/ytdl/yt-dlp).

- Luồng thêm bài (YouTube)
  1. Host gửi URL -> POST `/api/rooms/:roomId/playlist` -> server validate URL, lấy info (ytdl.getInfo hoặc timeout fallback), tạo track metadata, push vào `room.playlist`.
  2. Nếu playlist từ 0->1: server tự bật `isPlaying` và set playbackStartTime.
  3. Server emit `playback-state-changed` và có thể emit `room-status-changed` / `room-info-update`.

- Luồng upload audio
  1. Host chọn audio + thumbnail -> POST multipart `/api/rooms/:roomId/playlist/upload` -> middleware upload lên Cloudinary.
  2. Server lưu metadata (url, public_id, duration), push playlist, emit updates.

- Luồng chat
  1. Client emit `send-chat-message` (roomId, text, optional meta.replyTo) -> server lưu message via `chatService` -> server broadcast `new-chat-message` (kèm `isHost` flag).
  2. Clients append message (temp -> replaced by saved message ID), scroll UI.

**4. Công nghệ & thư viện chính**

- Backend
  - Node.js + Express
  - MongoDB (Mongoose models `User`, `Room`, ...) — lưu playlist, members, statistics, chat
  - Socket.IO (realtime events)
  - Authentication: `jsonwebtoken` (JWT), `passport` (Google OAuth)
  - File upload / storage: Cloudinary (uploader), `multer` middleware (or Cloudinary middleware)
  - YouTube streaming: `@distube/ytdl-core` (ytdl-core) + fallback `yt-dlp` CLI
  - Caching: `lru-cache` (metaCache trong stream)
  - Utility: `bcryptjs` (password hashing), `nodemailer`/custom `emailService` for emails
  - Dev ops: environment via `dotenv`, scripts in `server/package.json`

- Frontend
  - React + Vite
  - React Router for navigation
  - Axios (`src/services/api.js`) cho HTTP API (interceptor gán Authorization header)
  - Socket.IO client (`src/services/socket.js`)
  - UI libs: `react-feather`/`lucide-react` icons, `react-toastify` for toasts, `sweetalert2` for confirm
  - Web APIs: Web Audio API (analyser) cho visualization/beat detection
  - State: React context `AuthContext`, `SocketContext`; redux-toolkit slice for requests in `/store` (nếu có)

- Tooling & khác
  - `yt-dlp` binary required on server for robust fallback
  - Cloudinary account + credentials
  - Lint/format: project includes `eslint.config.js` and uses consistent React code style

**5. File / cấu trúc quan trọng (đã rà soát)**
- Backend: `server/src/controllers/*`, `server/src/routes/*`, `server/src/models/*`, `server/src/config/*`, `server/src/services/*`, `server/src/middleware/*`.
- Frontend: `client/src/pages/*`, `client/src/components/*`, `client/src/contexts/*`, `client/src/services/*`, `client/src/routes/AppRouter.jsx`.
- Tài liệu tóm tắt API đã được tạo: [FEATURES_AND_API.md](FEATURES_AND_API.md)

**6. Khuyến nghị / điểm chú ý**
- Đảm bảo `yt-dlp` được cài trên server để fallback hoạt động tốt.
- Giới hạn upload/YouTube tracks đã được áp dụng — cần trình bày rõ trong UI/validation.
- Khi deploy lên môi trường production: đặt `CLIENT_URL`, `JWT_SECRET`, cấu hình Cloudinary, giới hạn request/streaming, và bật HTTPS / CORS hợp lý.

---

File tóm tắt đã lưu: [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) và bạn cũng có bản rút gọn API tại [FEATURES_AND_API.md](FEATURES_AND_API.md).

Muốn tôi sinh tiếp:  
- Một OpenAPI (swagger) spec cho các endpoint?  
- Hoặc tài liệu Socket events (payload schemas)?  
Chọn 1 trong 2 và tôi sẽ tạo tiếp.