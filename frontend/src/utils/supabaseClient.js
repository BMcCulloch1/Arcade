import { createClient } from "@supabase/supabase-js";

// Get Supabase credentials from .env
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_KEY;

// Create Supabase client with auto-refresh enabled
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true, // Automatically refresh token when it expires
    persistSession: true, // Ensure session is persisted across page reloads
    detectSessionInUrl: true,
  },
});

// Listen for token changes and re-subscribe
supabase.auth.onAuthStateChange((event, session) => {
  if (event === "TOKEN_REFRESHED" || event === "SIGNED_IN") {
    console.log("🔄 Token refreshed! Re-subscribing to real-time updates...");
    // Re-subscribe to the games table
    supabase.channel("public:games").subscribe();
  }
});

export default supabase;
