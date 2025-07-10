const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const supabase = require("../utils/supabaseClient");

const loginUser = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: "All fields are required." });
  }

  try {
    // Check if user exists in Supabase
    const { data: user, error } = await supabase
      .from("users")
      .select("id, email, password")
      .eq("email", email)
      .single();

    if (error) {
      return res.status(400).json({ success: false, message: "Invalid email or password." });
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Invalid email or password." });
    }

    // Generate JWT token
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: "1h" });

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
    });
  } catch (error) {
    console.error("Error in login:", error);
    res.status(500).json({ success: false, message: "Server error. Please try again later." });
  }
};

module.exports = { loginUser };
