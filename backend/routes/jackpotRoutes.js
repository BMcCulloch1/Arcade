const express = require("express");
const verifyToken = require("../middleware/verifyToken");
const { createJackpotGame, getOpenJackpotGames, joinJackpotGame, 
    getJackpotPlayers, closeExpiredJackpotGames, getJackpotHistory, 
    updateAnimationTime} = require("../controllers/jackpotController");

const router = express.Router();


console.log("[SUCCESS]  Jackpot Routes File Loaded!"); 

router.get("/test", (req, res) => {
    console.log("[SUCCESS]  /api/jackpot/test route was hit!"); 
    res.json({ success: true, message: "Jackpot API is working!" });
});

// Jackpot game Routes
router.post("/create", verifyToken, createJackpotGame);
router.get("/open", verifyToken, getOpenJackpotGames);
router.post("/join", verifyToken, joinJackpotGame);
router.get("/:gameId/players", getJackpotPlayers);
router.post("/close", closeExpiredJackpotGames);
router.get("/history", verifyToken, getJackpotHistory);
router.get("/:gameId/players", getJackpotPlayers); 
router.post("/updateAnimationTime", verifyToken, updateAnimationTime);




module.exports = router;
