const express = require("express");
const { registerUser } = require("../controllers/registerController");
const { loginUser } = require("../controllers/loginController");
const { getUserProfile } = require("../controllers/userController");

const verifyToken = require("../middleware/verifyToken");

const router = express.Router();

// User registration
router.post("/register", registerUser);

// User login
router.post("/login", loginUser);

//User Profile
router.get("/profile", verifyToken, getUserProfile);


// Protected route for dashboard
router.get("/home", verifyToken, (req, res) => {
  res.status(200).json({ 
    success: true, 
    message: "Welcome to the dashboard!", 
    user: req.user // `req.user` should be set by verifyToken middleware
  });
});




module.exports = router;
