require('dotenv').config(); // Load environment variables at the top


const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL, // Ensure this is in your .env
  process.env.SUPABASE_KEY  // Ensure this is in your .env
);

module.exports = supabase;
