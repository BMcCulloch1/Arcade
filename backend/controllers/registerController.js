const bcrypt = require("bcrypt");
const supabase = require("../utils/supabaseClient");

const getUserInitials = (email) => {
  if (!email) return "?";
  
  const parts = email.split(/[@._]/).filter(Boolean); // Split by `.`, `_`, `@`
  let initials = parts.length > 1 
    ? (parts[0][0] + parts[1][0]).toUpperCase()  // Two initials
    : parts[0][0].toUpperCase();                 // One initial

  // If email contains "testuser", add a number suffix
  const match = email.match(/testuser(\d+)/);
  if (match) {
    initials = `T${match[1]}`; // Example: "testuser2" → "T2"
  }

  return initials;
};


const getUserColor = (email) => {
  const colors = ["#FF5733", "#33FF57", "#3357FF", "#FF33A1", "#FFD700", "#00CED1"];
  return colors[email.charCodeAt(0) % colors.length]; // Assign color based on first char
};

const registerUser = async (req, res) => {
  const { email, password } = req.body;

  // Input validation
  if (!email || !password) {
    return res.status(400).json({ success: false, message: "All fields are required." });
  }

  try {
    // Check if user already exists
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

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate avatar initials & color
    const avatar_initials = getUserInitials(email);
    const avatar_color = getUserColor(email);

    // Save new user in Supabase
    const { error } = await supabase.from("users").insert([
      {
        email,
        password: hashedPassword,
        balance: 0, // Default balance
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
