/**
 * User Profile Controller
 * ------------------------
 * Handles:
 *  - Retrieving the logged-in user's profile details.
 */

const supabase = require("../utils/supabaseClient");

/**
 * Returns the profile of the authenticated user.
 */
const getUserProfile = async (req, res) => {
  try {
    const userId = req.user.userId; 

    const { data: user, error } = await supabase
      .from("users")
      .select("id, email, avatar_initials, avatar_color")
      .eq("id", userId)
      .single();

    if (error) throw error;

    res.status(200).json({ success: true, user });
  } catch (error) {
    console.error("[ERROR] Error fetching user profile:", error);
    res.status(500).json({ success: false, message: "Failed to retrieve profile." });
  }
};

module.exports = { getUserProfile };
