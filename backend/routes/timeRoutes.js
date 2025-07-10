// routes/timeRoutes.js
const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
  // Return server time in milliseconds
  res.json({ serverTime: Date.now() });
});

module.exports = router;
