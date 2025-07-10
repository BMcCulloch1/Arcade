import React, { createContext, useState, useEffect } from "react";
import supabase from "../utils/supabaseClient";

export const GamesContext = createContext(null);

export const GamesProvider = ({ children }) => {
  const [games, setGames] = useState([]);

  // Fetch games from API
  const fetchGames = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/games/all", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("authToken")}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        const formattedGames = data.games.map(game => ({
          ...game,
          creator_email: game.creator_email || game.creator?.email || "Unknown",
          creator_avatar_color: game.creator_avatar_color || game.creator?.avatar_color || "#ccc",
          creator_initials: game.creator_initials || game.creator?.avatar_initials || "?",
          opponent_email: game.opponent_email || game.opponent?.email || "Waiting for player...",
          opponent_avatar_color: game.opponent_avatar_color || game.opponent?.avatar_color || "#ccc",
          opponent_initials: game.opponent_initials || game.opponent?.avatar_initials || "?"
        }));
        setGames(formattedGames);
      } else {
        console.error("Failed to fetch games:", data.message);
      }
    } catch (err) {
      console.error("Error fetching games:", err);
    }
  };
  

  // Listen for real-time updates
  useEffect(() => {
    fetchGames(); // Initial fetch on mount
  
    const channel = supabase
      .channel("games")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "games" },
        (payload) => {
          console.log("🔄 Real-time update received:", payload);
  
          // Check if `created_at` is missing in real-time updates
          if (!payload.new.created_at) {
            console.warn(`⚠️ Game ${payload.new.id} missing created_at in real-time update!`);
          } else {
            console.log(`✅ Game ${payload.new.id} has valid created_at: ${payload.new.created_at}`);
          }
  
          fetchGames(); // Refresh game list
        }
      )
      .subscribe();
  
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
  
  

  return (
    <GamesContext.Provider value={{ games, setGames, fetchGames }}>
      {children}
    </GamesContext.Provider>
  );
};
