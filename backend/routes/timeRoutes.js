const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
  res.json({ serverTime: Date.now() });
});

module.exports = router;
