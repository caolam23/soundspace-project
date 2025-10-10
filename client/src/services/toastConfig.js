import { Slide } from "react-toastify";

export const toastConfig = {
  position: "bottom-right",
  autoClose: 2200,
  hideProgressBar: true,
  closeOnClick: true,
  pauseOnHover: false,
  draggable: false,
  theme: "dark",
  transition: Slide, // Hiệu ứng trượt mượt như Spotify
  style: {
    background: "rgba(24, 24, 24, 0.9)", // Nền đen mờ
    backdropFilter: "blur(12px)", // Hiệu ứng mờ nền kiểu premium
    color: "#fff",
    borderRadius: "14px",
    fontSize: "14px",
    fontWeight: 500,
    letterSpacing: "0.2px",
    padding: "10px 18px",
    minHeight: "unset",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    boxShadow: "0 4px 14px rgba(0,0,0,0.25)",
  },
  progressStyle: {
    background: "#1DB954", // Màu xanh Spotify cho thanh tiến trình (nếu bật)
  },
};
