let ioInstance;

const initSocket = (server) => {
  const socketIo = require("socket.io");
  ioInstance = socketIo(server, {
    cors: { 
      origin: "http://localhost:3000",
      methods: ["GET", "POST"] }
  });

  ioInstance.on("connection", (socket) => {
      console.log(`🟢 A user connected: ${socket.id}`);

      // ✅ Handle users joining a game room
      socket.on("joinGameRoom", ({ gameId }) => {
          console.log(`🔗 User ${socket.id} joined game room: ${gameId}`);
          socket.join(gameId); // ✅ Add player to the specific game room
      });

      // ✅ Corrected playerJoined event handling
      socket.on("playerJoined", (data) => {
          console.log(`🔄 Player joined event received:`, data);
          ioInstance.to(data.gameId).emit("playerJoined", data); // ✅ Send only to players in the game
      });

      // ✅ Handle disconnections
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
