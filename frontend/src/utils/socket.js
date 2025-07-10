import { io } from "socket.io-client";

// Use a single socket instance
const socket = io("http://localhost:5000", {
  transports: ["websocket"], 
  reconnection: true, 
  reconnectionAttempts: 5, 
  reconnectionDelay: 1000, 
  autoConnect: true, 
});

// Debug logs for socket connection
socket.on("connect", () => {
  console.log("[CONNECTED]  Socket connected:", socket.connected);
});

socket.on("connect_error", (error) => {
  console.error("🔴 Socket connection error:", error);
});

socket.on("disconnect", (reason) => {
  console.log("🔴 Socket disconnected:", reason);
});

export default socket;