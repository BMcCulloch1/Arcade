const express = require("express");
const { registerUser } = require("../controllers/registerController");
const { loginUser } = require("../controllers/loginController");
const { getUserProfile } = require("../controllers/userController");

const verifyToken = require("../middleware/verifyToken");

const router = express.Router();

router.post("/register", registerUser);

router.post("/login", loginUser);

router.get("/profile", verifyToken, getUserProfile);


router.get("/home", verifyToken, (req, res) => {
  res.status(200).json({ 
    success: true, 
    message: "Welcome to the dashboard!", 
    user: req.user 
  });
});




module.exports = router;
