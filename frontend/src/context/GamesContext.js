/**
 * GamesContext Provider
 * ---------------------
 * Provides global access to game data and real-time updates
 * for the entire React app.
 */

import React, { createContext, useState, useEffect } from "react";
import supabase from "../utils/supabaseClient";

export const GamesContext = createContext(null);

/**
 * GamesProvider
 * Wraps children components and supplies:
 *  - games list
 *  - setGames
 *  - fetchGames function
 */

export const GamesProvider = ({ children }) => {
  const [games, setGames] = useState([]);

 /**
   * Fetches all games from the backend API.
   */  
  const fetchGames = async () => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      console.warn("[INFO] No auth token found, skipping fetchGames call.");
      return;
    }

    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/games/all`, {
        headers: {
          Authorization: `Bearer ${token}`,
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
  
  /**
   * Sets up initial fetch and real-time updates from Supabase on mount.
   */
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (token) {
      fetchGames();
    } else {
      console.log("[INFO] User not logged in, skipping initial fetchGames.");
    }

    const channel = supabase
      .channel("games")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "games" },
        (payload) => {
          if (!payload.new.created_at) {
            console.warn(`[WARNING] Game ${payload.new.id} missing created_at in real-time update!`);
          }
          fetchGames();
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
