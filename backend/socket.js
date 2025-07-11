let ioInstance;

const initSocket = (server) => {
  const socketIo = require("socket.io");
  ioInstance = socketIo(server, {
    cors: { 
      origin: process.env.FRONTEND_ORIGIN || "http://localhost:3000",
      methods: ["GET", "POST"] }
  });

  ioInstance.on("connection", (socket) => {
      console.log(`[CONNECTED]  A user connected: ${socket.id}`);

      socket.on("joinGameRoom", ({ gameId }) => {
          console.log(`🔗 User ${socket.id} joined game room: ${gameId}`);
          socket.join(gameId); 
      });

      socket.on("playerJoined", (data) => {
          console.log(`[RESCHEDULE]  Player joined event received:`, data);
          ioInstance.to(data.gameId).emit("playerJoined", data); 
      });

      socket.on("disconnect", () => {
          console.log(`🔴 A user disconnected: ${socket.id}`);
      });
  });

  return ioInstance;
};

const getIo = () => {
  if (!ioInstance) {
    throw new Error("Socket.io not initialized!");
  }
  return ioInstance;
};

module.exports = { initSocket, getIo };
