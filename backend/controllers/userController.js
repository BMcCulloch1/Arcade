const supabase = require("../utils/supabaseClient");

const getUserProfile = async (req, res) => {
  try {
    const userId = req.user.userId; // Get user ID from auth middleware

    const { data: user, error } = await supabase
      .from("users")
      .select("id, email, avatar_initials, avatar_color")
      .eq("id", userId)
      .single();

    if (error) throw error;

    res.status(200).json({ success: true, user });
  } catch (error) {
    console.error("❌ Error fetching user profile:", error);
    res.status(500).json({ success: false, message: "Failed to retrieve profile." });
  }
};

module.exports = { getUserProfile };
