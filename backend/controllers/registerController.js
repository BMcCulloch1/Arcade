/**
 * User Registration Controller
 * ----------------------------
 * Handles:
 *  - User sign-up
 *  - Password hashing
 *  - Avatar initials & color generation
 */

const bcrypt = require("bcrypt");
const supabase = require("../utils/supabaseClient");

/**
 * Generates initials for the user's avatar based on their email.
 * Supports special testuser suffix (e.g., "testuser2" -> "T2").
 */
const getUserInitials = (email) => {
  if (!email) return "?";
  
  const parts = email.split(/[@._]/).filter(Boolean); 
  let initials = parts.length > 1 
    ? (parts[0][0] + parts[1][0]).toUpperCase()  
    : parts[0][0].toUpperCase();                

  const match = email.match(/testuser(\d+)/);
  if (match) {
    initials = `T${match[1]}`; 
  }

  return initials;
};

/**
 * Returns a color hex code for the avatar based on email character code.
 */
const getUserColor = (email) => {
  const colors = ["#FF5733", "#33FF57", "#3357FF", "#FF33A1", "#FFD700", "#00CED1"];
  return colors[email.charCodeAt(0) % colors.length]; 
};

/**
 * Registers a new user.
 * - Checks for existing email
 * - Hashes password
 * - Generates avatar properties
 * - Inserts into Supabase
 */
const registerUser = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: "All fields are required." });
  }

  try {
    const { data: existingUser, error: existingError } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .single();

    if (existingError && existingError.code !== "PGRST116") {
      throw existingError;
    }

    if (existingUser) {
      return res.status(400).json({ success: false, message: "Email already registered." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const avatar_initials = getUserInitials(email);
    const avatar_color = getUserColor(email);

    const { error } = await supabase.from("users").insert([
      {
        email,
        password: hashedPassword,
        balance: 0, 
        avatar_initials,
        avatar_color,
      },
    ]);

    if (error) {
      throw error;
    }

    return res.status(201).json({ success: true, message: "User registered successfully." });
  } catch (error) {
    console.error("Error in registration:", error);
    return res.status(500).json({ success: false, message: "Server error. Please try again later." });
  }
};

module.exports = { registerUser };
