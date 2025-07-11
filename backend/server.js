const express = require("express");
const cors = require("cors");
const http = require("http"); 
const { initSocket, getIo } = require("./socket"); 
const { scheduleExistingGames } = require("./controllers/jackpotController"); 
require("dotenv").config();
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:3000";



// Import routes
const authRoutes = require("./routes/authRoutes");
const gameRoutes = require("./routes/gameRoutes");
const jackpotRoutes = require("./routes/jackpotRoutes");
const timeRoutes = require("./routes/timeRoutes");

const app = express();

const server = http.createServer(app);

const io = initSocket(server); 

// Middleware
app.use(express.json());
app.use(cors({
  origin: FRONTEND_ORIGIN,
  credentials: true
}));


// Routes
app.use("/api/auth", authRoutes);
app.use("/api/games", gameRoutes);
app.use("/api/jackpot", jackpotRoutes);
app.use("/api/time", timeRoutes);

// Add a root path for debugging
app.get("/", (req, res) => {
  res.send("Arcade Backend API is running!");
});


// Handle Socket.IO connections
io.on("connection", (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on("disconnect", () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send({ message: "An internal server error occurred" });
});


// Reschedule any in-progress games on startup 
setTimeout(() => {
  console.log("[RESCHEDULE]  Rescheduling in-progress jackpot games...");
  scheduleExistingGames(getIo());
}, 1000); //  Delay to ensure `getIo()` is initialized

// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
