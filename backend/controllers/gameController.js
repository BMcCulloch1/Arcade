const supabase = require("../utils/supabaseClient");
const { getIo } = require("../socket");
const crypto = require("crypto"); // Import at the top of your file



// Controller function to create a new game
const createGame = async (req, res) => {
  const { wager_amount, creator_choice } = req.body;
  const creator_id = req.user.userId;

  // Validate input
  if (!wager_amount || wager_amount <= 0) {
    return res.status(400).json({ success: false, message: "Invalid wager amount." });
  }
  if (!creator_choice || (creator_choice !== "Heads" && creator_choice !== "Tails")) {
    return res.status(400).json({ success: false, message: "Invalid coin choice." });
  }

  try {
    const { data: newGame, error } = await supabase
      .from("games")
      .insert([
        {
          creator_id,
          wager_amount,
          creator_choice, 
        },
      ])
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    res.status(201).json({
      success: true,
      message: "Game created successfully!",
      game: newGame,
    });
  } catch (error) {
    console.error("Error creating game:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create game. Please try again later.",
    });
  }
};


// Controller function to retrieve open games
const getOpenGames = async (req, res) => {
  try {
    // Fetch open and in-progress games, including creator and opponent details
    const { data: openGames, error } = await supabase
      .from("games")
      .select(`
        id,
        wager_amount,
        status,
        creator_id,
        opponent_id,
        created_at,
        creator_choice,
        creator:creator_id (email, avatar_color, avatar_initials),
        opponent:opponent_id (email, avatar_color, avatar_initials)
      `)
      .or('status.eq.open,status.eq.in_progress');

    if (error) {
      throw error;
    }

    // Ensure each game has a valid created_at timestamp
    const validatedGames = openGames.map(game => ({
      id: game.id,
      wager_amount: game.wager_amount,
      status: game.status,
      creator_id: game.creator_id,
      creator_email: game.creator?.email || "Unknown",
      creator_avatar_color: game.creator?.avatar_color || "#ccc",
      creator_initials: game.creator?.avatar_initials || "?",
      creator_choice: game.creator_choice,
      opponent_id: game.opponent_id,
      opponent_email: game.opponent?.email || "Waiting for player...",
      opponent_avatar_color: game.opponent?.avatar_color || "#ccc",
      opponent_initials: game.opponent?.avatar_initials || "?",
      created_at: game.created_at || new Date().toISOString(), 
    }));

    res.status(200).json({
      success: true,
      message: "Open games retrieved successfully.",
      games: validatedGames,
    });
  } catch (error) {
    console.error("Error retrieving open games:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve open games. Please try again later.",
    });
  }
};




const joinGame = async (req, res) => {
  const { gameId } = req.body;
  const opponent_id = req.user.userId;

  try {
    // Check if game exists and is open
    const { data: game, error: gameError } = await supabase
      .from("games")
      .select("*")
      .eq("id", gameId)
      .eq("status", "open")
      .single();

    if (gameError || !game) {
      return res.status(404).json({ success: false, message: "Game not found or already in progress." });
    }

    // Update the game with the opponent_id and set status to "in_progress"
    const { error: updateError } = await supabase
      .from("games")
      .update({
        opponent_id,
        status: "in_progress",
        started_at: new Date(),
      })
      .eq("id", gameId);

    if (updateError) {
      throw updateError;
    }

    // Re-fetch the updated game with the joined user details
    const { data: updatedGame, error: refetchError } = await supabase
      .from("games")
      .select(`
        id,
        wager_amount,
        status,
        creator_id,
        opponent_id,
        created_at, 
        creator_choice,
        creator:creator_id (email, avatar_color, avatar_initials),
        opponent:opponent_id (email, avatar_color, avatar_initials)
      `)
      .eq("id", gameId)
      .maybeSingle();

    if (refetchError) {
      console.error("Error re-fetching game:", refetchError);
    }

    // Format the game object to include the desired fields
    const formattedGame = {
      id: updatedGame.id,
      wager_amount: updatedGame.wager_amount,
      status: updatedGame.status,
      creator_id: updatedGame.creator_id,
      creator_email: updatedGame.creator?.email || "Unknown",
      creator_avatar_color: updatedGame.creator?.avatar_color || "#ccc",
      creator_initials: updatedGame.creator?.avatar_initials || "?",
      creator_choice: updatedGame.creator_choice,
      opponent_id: updatedGame.opponent_id,
      opponent_email: updatedGame.opponent?.email || "Waiting for player...",
      opponent_avatar_color: updatedGame.opponent?.avatar_color || "#ccc",
      opponent_initials: updatedGame.opponent?.avatar_initials || "?",
      created_at: updatedGame.created_at,
    };

    console.log("⚡ Preparing gameUpdated for broadcast:", formattedGame);
    const io = getIo();
    io.emit("gameUpdated", formattedGame);

    // Start coin toss timer (simulate delay for animation)
    setTimeout(async () => {
      // Randomly determine the winner
      const randomValue = crypto.randomInt(0, 2); // Secure random number (0 or 1)
      const winnerId = randomValue === 0 ? game.creator_id : opponent_id;
      console.log(`Random value: ${randomValue}, Winner ID: ${winnerId}`);

      // Update game with the result and finished_at timestamp,
      // forcing Supabase to return the updated record
      const { data: updatedFinishedGame, error: resultError } = await supabase
        .from("games")
        .update({
          result: winnerId,
          status: "finished",
          finished_at: new Date(),
        }, { returning: "representation" })
        .select(`
          id,
          wager_amount,
          status,
          creator_id,
          opponent_id,
          created_at,
          finished_at,
          creator_choice,
          result,
          creator:creator_id (email, avatar_color, avatar_initials),
          opponent:opponent_id (email, avatar_color, avatar_initials)
        `)
        .eq("id", gameId)
        .maybeSingle();

        console.log("Updated finished game record:", updatedFinishedGame);


      if (resultError) {
        console.error("Error updating game result:", resultError);
      } else {
        console.log(`Game ${gameId} finished! Winner: ${winnerId}`);

        const formattedFinishedGame = {
          id: updatedFinishedGame.id,
          wager_amount: updatedFinishedGame.wager_amount,
          status: updatedFinishedGame.status,
          creator_id: updatedFinishedGame.creator_id,
          creator_email: updatedFinishedGame.creator?.email || "Unknown",
          creator_avatar_color: updatedFinishedGame.creator?.avatar_color || "#ccc",
          creator_initials: updatedFinishedGame.creator?.avatar_initials || "?",
          creator_choice: updatedFinishedGame.creator_choice,
          opponent_id: updatedFinishedGame.opponent_id,
          opponent_email: updatedFinishedGame.opponent?.email || "Waiting for player...",
          opponent_avatar_color: updatedFinishedGame.opponent?.avatar_color || "#ccc",
          opponent_initials: updatedFinishedGame.opponent?.avatar_initials || "?",
          created_at: updatedGame.created_at,
          finished_at: updatedFinishedGame.finished_at,
          result: updatedFinishedGame.result,
        };

        io.emit("gameUpdated", formattedFinishedGame);
      }
    }, 2000); // 2-second delay

    res.status(200).json({
      success: true,
      message: "You have successfully joined the game.",
    });
  } catch (error) {
    console.error("Error joining game:", error);
    res.status(500).json({
      success: false,
      message: "Failed to join game. Please try again later.",
    });
  }
};



  
  const getGameHistory = async (req, res) => {
    const userId = req.user.userId;
  
    try {
      // Fetch completed games where the user was either creator or opponent
      const { data: gameHistory, error } = await supabase
        .from("games")
        .select("*")
        .or(`creator_id.eq.${userId},opponent_id.eq.${userId}`)
        .eq("status", "finished");
  
      if (error) {
        throw error;
      }
  
      res.status(200).json({
        success: true,
        message: "Game history retrieved successfully.",
        games: gameHistory,
      });
    } catch (error) {
      console.error("Error retrieving game history:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve game history. Please try again later.",
      });
    }
  };

  // Controller function to retrieve game details by ID
const getGameDetails = async (req, res) => {
    const { id } = req.params;
  
    try {
      // Fetch the game by ID
      const { data: game, error } = await supabase
        .from("games")
        .select("*")
        .eq("id", id)
        .single();
  
      if (error || !game) {
        return res.status(404).json({ success: false, message: "Game not found." });
      }
  
      res.status(200).json({
        success: true,
        message: "Game details retrieved successfully.",
        game,
      });
    } catch (error) {
      console.error("Error retrieving game details:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve game details. Please try again later.",
      });
    }
  };

  const getAllGames = async (req, res) => {
    try {
      const { data: games, error } = await supabase
        .from("games")
        .select(`
          id,
          wager_amount,
          status,
          creator_id,
          opponent_id,
          created_at,
          finished_at,
          creator_choice,
          result,
          creator:creator_id (email, avatar_color, avatar_initials),
          opponent:opponent_id (email, avatar_color, avatar_initials)
        `)

        .order("created_at", { ascending: false });
  
      if (error) {
        throw error;
      }
  
      // Ensure each game has a valid created_at timestamp
      const validatedGames = games.map(game => ({
        ...game,
        created_at: game.created_at || new Date().toISOString(), // Fallback if missing
      }));
  
      res.status(200).json({
        success: true,
        message: "All games retrieved successfully.",
        games: validatedGames, // Send fixed games to frontend
      });
    } catch (error) {
      console.error("Error retrieving all games:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve all games. Please try again later.",
      });
    }
  };
  
  
  module.exports = { createGame, getOpenGames, joinGame, getGameHistory, getGameDetails, getAllGames };
  