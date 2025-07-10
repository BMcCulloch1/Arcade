const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader?.split(" ")[1]; // Extract token from the Bearer header

  if (!token) {
    console.log("No token provided.");
    return res.status(401).json({
      success: false,
      message: "Access Denied: No token provided.",
    });
  }

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET); 
    req.user = verified; 
    next(); 
  } catch (err) {
    console.error("Token verification failed:", err.message);
    return res.status(403).json({
      success: false,
      message: "Invalid or expired token.",
    });
  }
};

module.exports = verifyToken;
