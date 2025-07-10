const express = require("express");
const verifyToken = require("../middleware/verifyToken"); 
const { createGame, getOpenGames, joinGame, getGameHistory, getGameDetails, getAllGames } = require("../controllers/gameController"); // Controller to handle game logic

const router = express.Router();

// API Calls
router.post("/create", verifyToken, createGame);
router.get("/open", verifyToken, getOpenGames);
router.post("/join", verifyToken, joinGame); 
router.get("/history", verifyToken, getGameHistory);
router.get("/all", verifyToken, getAllGames); 
router.get("/:id", verifyToken, getGameDetails);






module.exports = router;
