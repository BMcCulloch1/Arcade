// Import necessary modules
const express = require("express");
const cors = require("cors");
const http = require("http"); // Import http module
const { initSocket, getIo } = require("./socket"); // Import WebSocket helpers
const { scheduleExistingGames } = require("./controllers/jackpotController"); // Reschedule games
require("dotenv").config(); // Load environment variables


// Import routes
const authRoutes = require("./routes/authRoutes");
const gameRoutes = require("./routes/gameRoutes");
const jackpotRoutes = require("./routes/jackpotRoutes");
const timeRoutes = require("./routes/timeRoutes");


// Initialize Express
const app = express();

// Create an HTTP server
const server = http.createServer(app);

// Initialize WebSocket server
const io = initSocket(server); // Use initSocket instead of creating a new instance

// Middleware
app.use(express.json());
app.use(cors());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/games", gameRoutes);
app.use("/api/jackpot", jackpotRoutes);
app.use("/api/time", timeRoutes);


// Handle Socket.IO connections
io.on("connection", (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on("disconnect", () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send({ message: "An internal server error occurred" });
});


// Reschedule any in-progress games on startup (with delay to ensure getIo() is initialized)
setTimeout(() => {
  console.log("🔄 Rescheduling in-progress jackpot games...");
  scheduleExistingGames(getIo());
}, 1000); // Small delay to ensure `getIo()` is initialized

// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
