import { io } from "socket.io-client";

// ✅ Use a single socket instance
const socket = io("http://localhost:5000", {
  transports: ["websocket"], // Use WebSocket only
  reconnection: true, // Allow reconnecting
  reconnectionAttempts: 5, // Try 5 times before failing
  reconnectionDelay: 1000, // Delay before retrying
  autoConnect: true, // ✅ Automatically connect when the socket is created
});

// Debug logs for socket connection
socket.on("connect", () => {
  console.log("🟢 Socket connected:", socket.connected);
});

socket.on("connect_error", (error) => {
  console.error("🔴 Socket connection error:", error);
});

socket.on("disconnect", (reason) => {
  console.log("🔴 Socket disconnected:", reason);
});

export default socket;