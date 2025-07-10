const { response } = require("express");
const supabase = require("../utils/supabaseClient");
const crypto = require("crypto");
const { getIo } = require("../socket");



const CARD_WIDTH = 80;
const CONTAINER_WIDTH = 400;
const TAPE_LENGTH = 100; // Fixed number of elements in the tape

// Initialize a global flag to track animation updates
globalThis.hasUpdatedAnimationTime = {};


const computeTargetOffset = (players, winnerEmail) => {
    if (!players || players.length === 0) {
        console.error("❌ computeTargetOffset: No players available.");
        return null;
    }

    console.log("📊 Computing target offset for:", winnerEmail);

    const totalWager = players.reduce((acc, player) => acc + Number(player.wager_amount), 0);
    let weightedProfiles = [];

    players.forEach(player => {
        const weight = Math.max(Math.round((Number(player.wager_amount) / totalWager) * 100), 1);
        for (let i = 0; i < weight; i++) {
            weightedProfiles.push(player);
        }
    });

    weightedProfiles.sort((a, b) => a.email.localeCompare(b.email));

    let tape = [];
    for (let i = 0; i < 5; i++) {
        tape = tape.concat(weightedProfiles);
    }

    const winnerIndices = tape.reduce((acc, player, index) => {
        if (String(player.email).trim().toLowerCase() === String(winnerEmail).trim().toLowerCase()) {
            acc.push(index);
        }
        return acc;
    }, []);

    if (winnerIndices.length === 0) {
        console.error("❌ No winner indices found for:", winnerEmail);
        return null;
    }

    const targetIndex = winnerIndices[Math.floor(winnerIndices.length / 2)];
    const targetOffset = targetIndex * CARD_WIDTH - CONTAINER_WIDTH / 2 + CARD_WIDTH / 2;

    // Scale the target offset to match the normalized tape length
    const scalingFactor = tape.length / TAPE_LENGTH;
    const scaledTargetOffset = targetOffset / scalingFactor;

    console.log(`🎯 Computed Target Offset: ${scaledTargetOffset}`);
    return scaledTargetOffset;
};



const createJackpotGame = async (req, res) => {
    const { time_limit } = req.body;
    const creator_id = req.user.userId;
  
    if (!time_limit || time_limit <= 0) {
      return res.status(400).json({ success: false, message: "Invalid time limit" });
    }
  
    try {
      // Use a transaction to ensure atomicity
      const { data: existingGames, error: fetchError } = await supabase
        .from("jackpot_games")
        .select("*")
        .in("status", ["open", "in_progress"]);
  
      if (fetchError) throw fetchError;
  
      if (existingGames.length > 0) {
        return res.status(200).json({
          success: true,
          message: "An active jackpot game already exists.",
          game: existingGames[0],
        });
      }
  
      const { data: newGame, error: insertError } = await supabase
        .from("jackpot_games")
        .insert([
          {
            creator_id,
            time_limit,
            total_pot: 0,
            status: "open",
            created_at: new Date().toISOString(),
          },
        ])
        .select("*")
        .single();
  
      if (insertError) throw insertError;
  
      res.status(201).json({
        success: true,
        message: "Jackpot game created successfully!",
        game: newGame,
      });
    } catch (error) {
      console.error("❌ Error creating jackpot game:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create jackpot game. Please try again later.",
      });
    }
  };



  const getOpenJackpotGames = async (req, res) => {
    try {
      const { data: activeGames, error } = await supabase
        .from("jackpot_games")
        .select("*")
        .in("status", ["open", "in_progress"]);
  
      if (error) {
        throw error;
      }
  
      res.status(200).json({
        success: true,
        message: "Active game(s) retrieved successfully",
        games: activeGames,
      });
    } catch (error) {
      console.error("Error retrieving active games", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve active games. Please try again.",
      });
    }
  };


const activeTimers = new Map(); // Store active timers

const startTimer = async (gameId, io) => {
    if (activeTimers.has(gameId)) return; // Prevent multiple timers

    try {
        const { data: game, error } = await supabase
            .from("jackpot_games")
            .select("started_at, time_limit")
            .eq("id", gameId)
            .single();

        if (error) throw error;

        const gameDuration = game.time_limit * 1000;
        const gameEndTime = new Date(game.started_at).getTime() + gameDuration;

        console.log(`⏱️ Timer started for game: ${gameId}`);

        const timerInterval = setInterval(() => {
            const timeLeft = Math.max(Math.floor((gameEndTime - Date.now()) / 1000), 0);
            io.emit("timerUpdate", { gameId, timeLeft });

            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                activeTimers.delete(gameId);
                console.log(`⏳ Timer for game ${gameId} has ended.`);
            }
        }, 1000);

        activeTimers.set(gameId, timerInterval); // Store active timer

    } catch (error) {
        console.error("❌ Error starting timer:", error);
    }
};

  const joinJackpotGame = async (req, res) => {
    const { gameId, wager_amount } = req.body;
    const user_id = req.user.userId;

    if (!gameId || !wager_amount || wager_amount <= 0) {
        return res.status(400).json({ success: false, message: "Invalid Game ID or wager amount" });
    }

    try {
        // ✅ Check if game exists and is open or in progress
        const { data: game, error: gameError } = await supabase
            .from("jackpot_games")
            .select("*")
            .eq("id", gameId)
            .in("status", ["open", "in_progress"])
            .maybeSingle();

        if (gameError) return res.status(500).json({ success: false, message: "Error fetching game." });
        if (!game) return res.status(404).json({ success: false, message: "Game not found or already finished." });

        // ✅ Check if this is the first bet BEFORE inserting the new bet
        const { data: previousBets, error: previousBetsError } = await supabase
            .from("jackpot_contributions")
            .select("id")
            .eq("game_id", gameId);

        if (previousBetsError) {
            console.error("❌ Error checking existing bets:", previousBetsError);
        }

        const isFirstBet = !previousBets || previousBets.length === 0; // ✅ Correct first bet detection

        // ✅ Ensure user has not already placed a bet
        const { data: existingContribution } = await supabase
            .from("jackpot_contributions")
            .select("id")
            .eq("game_id", gameId)
            .eq("user_id", user_id)
            .maybeSingle();

        if (existingContribution) {
            return res.status(403).json({ success: false, message: "You have already made a bet" });
        }

        // ✅ Insert new contribution
        const { data: contribution, error: insertError } = await supabase
            .from("jackpot_contributions")
            .insert([{ game_id: gameId, user_id, wager_amount }])
            .select("*")
            .single();

        if (insertError) return res.status(500).json({ success: false, message: "Failed to insert wager" });

        // ✅ Update the total pot and possibly start the game
        let updateFields = { total_pot: game.total_pot + wager_amount };

        // After updating the game in the database:
        if (isFirstBet) {
            console.log("🔥 First bet placed, starting the game!");
            updateFields.status = "in_progress";
            updateFields.started_at = new Date().toISOString();
        }

        // Apply the update to the database
        const { data: updatedGame, error: updateGameError } = await supabase
            .from("jackpot_games")
            .update(updateFields)
            .eq("id", gameId)
            .select("*")
            .single();

        if (updateGameError) {
            return res.status(500).json({
                success: false,
                message: "Could not update total pot in jackpot_games",
                error: updateGameError.message,
            });
        }

        // If this is the first bet, broadcast that the game has started
        if (isFirstBet) {
            const io = getIo();
            io.emit("gameStarted", { game: updatedGame });
            // Existing code to start timer and schedule game closure follows...
            startTimer(gameId, io);
            scheduleGameClosure(updatedGame, io);
        }


        // ✅ Fetch updated list of players WITH FULL DATA
        const { data: updatedPlayers, error: fetchPlayersError } = await supabase
            .from("jackpot_contributions")
            .select(`
                user_id, 
                wager_amount, 
                created_at, 
                users (email, avatar_color, avatar_initials)
            `)
            .eq("game_id", gameId);

        if (fetchPlayersError) {
            console.error("❌ Error fetching updated players:", fetchPlayersError);
        }

        // ✅ Ensure players data is correctly structured
        const formattedPlayers = updatedPlayers.map(player => ({
            user_id: player.user_id,
            email: player.users?.email || "Unknown",
            wager_amount: player.wager_amount,
            avatar_color: player.users?.avatar_color || "#ccc",
            avatar_initials: player.users?.avatar_initials || "?",
        }));

        // ✅ Emit real-time event with full player details
        const io = getIo();
        console.log("🟢 Formatted Players Data:", JSON.stringify(formattedPlayers, null, 2));
        console.log("🟢 Emitting playerJoined event:", formattedPlayers);
        io.to(gameId).emit("playerJoined", {
            gameId,
            totalPot: updateFields.total_pot,
            players: formattedPlayers,  // ✅ Ensure full player details are sent
        });

        return res.status(200).json({
            success: true,
            message: "Bet placed successfully!",
            updated_game: updatedGame,
            contribution,
        });
    } catch (error) {
        console.error("❌ Unexpected error:", error);
        return res.status(500).json({ success: false, message: "An unexpected error occurred." });
    }
};





const getJackpotPlayers = async (req, res) => {
    const { gameId } = req.params;
    try {
      // Directly fetch player contributions for the given gameId
      const { data: playerData, error: playerFetchError } = await supabase
        .from("jackpot_contributions")
        .select(`
          user_id, 
          wager_amount, 
          created_at, 
          users (email, avatar_color, avatar_initials)
        `)
        .eq("game_id", gameId);
  
      if (playerFetchError) {
        console.error("Error fetching players:", playerFetchError);
        return res.status(500).json({
          success: false,
          message: "Failed to fetch jackpot players",
          error: playerFetchError.message,
        });
      }
  
      // Compute the total pot by summing wager_amount for all contributions
      const totalPot = playerData.reduce(
        (sum, player) => sum + Number(player.wager_amount),
        0
      );
  
      // Calculate each player's percentage based on their wager
      const playersWithPercentages = playerData.map((player) => ({
        user_id: player.user_id,
        email: player.users?.email || "Unknown",
        wager_amount: player.wager_amount,
        created_at: player.created_at,
        avatar_color: player.users?.avatar_color || "#ccc",
        avatar_initials: player.users?.avatar_initials || (player.users?.email ? player.users.email[0].toUpperCase() : "?"),
        percentage_of_pot: totalPot > 0
          ? ((player.wager_amount / totalPot) * 100).toFixed(2)
          : 0,
      }));
  
      return res.status(200).json({
        success: true,
        message: "Successfully retrieved players",
        total_pot: totalPot,
        players: playersWithPercentages,
      });
    } catch (unexpectedError) {
      console.error("Unexpected error:", unexpectedError);
      return res.status(500).json({
        success: false,
        message: "An unexpected error occurred while retrieving players.",
        error: unexpectedError.message,
      });
    }
  };
  


const closeExpiredJackpotGames = async (gameId, io) => {
    try {
        console.log(`Checking for expired game: ${gameId}`);

        const now = new Date();
        const { data: game, error } = await supabase
            .from("jackpot_games")
            .select("id, status, started_at, time_limit")
            .eq("id", gameId)
            .maybeSingle();

        if (error || !game) {
            console.error("Error fetching game:", error || "Game not found.");
            return;
        }

        const gameEndTime = new Date(game.started_at).getTime() + game.time_limit * 1000;
        if (now.getTime() < gameEndTime) {
            console.log(`⏳ Game ${gameId} is still running. No action taken.`);
            return;
        }

        console.log(`🚨 Closing expired game ${gameId}...`);
        const winnerResult = await selectJackpotWinner(gameId);

        if (winnerResult.error) {
            console.log(`⚠️ No valid winner found for game ${gameId}. Reason: ${winnerResult.error}`);
            io.emit("jackpotUpdate", {
                gameId: gameId,
                status: "error",
                message: `No valid winner found. Reason: ${winnerResult.error}`
            });
            return;
        }

        const winnerId = winnerResult.winnerId;
        await supabase
            .from("jackpot_games")
            .update({ status: "finished", finished_at: now })
            .eq("id", gameId);

        console.log(`✅ Game ${gameId} closed! Winner: ${winnerId}`);

        io.emit("jackpotUpdate", {
            gameId: gameId,
            status: "finished",
            winnerId: winnerId,
            message: `Game finished! Winner: ${winnerId}`
        });

    } catch (error) {
        console.error("❌ Error closing game:", error);
    }
};



const selectJackpotWinner = async (gameId) => {
    try {
        //Fetch players data and bets
        const {data: players, error: fetchError } = await supabase
            .from("jackpot_contributions")
            .select("user_id, wager_amount, users!inner(email)")
            .eq("game_id", gameId)

        console.log("Players Data:", JSON.stringify(players, null, 2));


        if (fetchError) {
            console.error("❌ Error fetching players:", fetchError);
            return { error: "Error fetching players." };
        }
        
        if (!players || players.length === 0) {
            console.error(`⚠️ No players found for game ${gameId}.`);
            return { error: "No players found." };
        }
            

        //Create a weighted array based on users bets/wagers
        let weightedPool = [];
        players.forEach(player => {

            if (!player.users || !player.users.email) {
                console.error(`⚠️ Missing user email for player:`, player);
                return;
            }

            const amount = Number(player.wager_amount);
            for (let i = 0; i < amount; i++) {
                weightedPool.push({user_id: player.user_id, email: player.users.email});
            }
        });

        if (weightedPool.length === 0) {
            console.log("❌ No valid entries in the weighted pool.");
            return { error: "No valid players in the weighted pool." }; // ✅ Always return an object
        }

        // Generate a cryptographically secure random index using Node.js crypto module
        const randomBuffer = crypto.randomBytes(4); // Generate 4 random bytes
        const randomValue = randomBuffer.readUInt32BE(0); // Convert to a 32-bit integer
        const winnerIndex = randomValue % weightedPool.length; // Ensure it's within range

        const {user_id: winnerId, email: winnerEmail } = weightedPool[winnerIndex];
        


        //Update supabase jackpot_games table with result of the winner
        const {error: updateError} = await supabase
            .from("jackpot_games")
            .update({result: winnerId})
            .eq("id", gameId)
            .select()
            .maybeSingle();  

        if (updateError) {
            console.error("❌ Error updating game with winner:", updateError);
            return { error: "Failed to update winner in the database." };
        } 

        //Fetch winners email/username for better clear winner
        const {data: winnerData, error: winnerError } = await supabase
            .from("users")
            .select("email")
            .eq("id", winnerId)
            .maybeSingle();

        if (winnerError) {
            console.error("Error fetching winners email:", winnerError);
            return {error: "Failed to fetch winners email"};
        }


        console.log(`🎉 Jackpot Winner Selected: ${winnerData.email} (${winnerId}) for Game ${gameId}`);
        return { winnerId, winnerEmail: winnerData.email };

    } catch (error) {
        console.error("❌ Unexpected error selecting jackpot winner:", error);
        return { error: error.message };
    }
};

const scheduleGameClosure = async (game, io) => {
    const gameEndTime = new Date(game.started_at).getTime() + game.time_limit * 1000;
    const now = Date.now();
    let delay = gameEndTime - now;
    if (delay < 0) {
      delay = 0;
    }

    setTimeout(async () => {
      console.log(`⏳ Game ${game.id} time expired. Closing game...`);
      const winnerResult = await selectJackpotWinner(game.id);
      
      if (winnerResult.error) {
        console.log(`⚠️ No valid winner found for game ${game.id}. Reason: ${winnerResult.error}`);
        io.emit("jackpotUpdate", {
          gameId: game.id,
          status: "error",
          message: `No valid winner found. Reason: ${winnerResult.error}`,
        });
        return;
      }

      const winnerId = winnerResult.winnerId;
      const nowDate = new Date();

      // Update game status in the database
      const { error: updateError } = await supabase
        .from("jackpot_games")
        .update({
          status: "finished",
          finished_at: nowDate,
          result: winnerId,
        })
        .eq("id", game.id);
      
      if (updateError) {
        console.error(`❌ Error closing game ${game.id}:`, updateError);
        return;
      }
      
      console.log(`✅ Game ${game.id} finished! Winner: ${winnerId}`);
      io.emit("jackpotUpdate", {
        gameId: game.id,
        status: "finished",
        winnerId: winnerId,
        message: `Game finished! Winner: ${winnerId}`,
      });

      // Compute animation start time
      const animationStartTime = Date.now();

      // 🔥 Ensure Players Data Exists
      const { data: playersData, error: playersError } = await supabase
        .from("jackpot_contributions")
        .select(`
          user_id, 
          wager_amount, 
          users (email)
        `)
        .eq("game_id", game.id);

      if (playersError || !playersData) {
        console.error("❌ Error fetching players for tape computation:", playersError);
        return;
      }

      // 🔹 Ensure we have a valid winner email
      if (!winnerResult.winnerEmail) {
        console.error("❌ No valid winner email found.");
        return;
      }

      // Format players to include an email field
      const formattedPlayers = playersData.map(player => ({
        user_id: player.user_id,
        email: player.users?.email || "unknown",
        wager_amount: player.wager_amount,
      }));

      // Compute Target Offset
      const targetOffset = computeTargetOffset(formattedPlayers, winnerResult.winnerEmail);

      // 🔥 Ensure Target Offset is Not Null
      if (targetOffset === null) {
        console.error("❌ Failed to compute target offset. Aborting animation update.");
        return;
      }

      console.log(`🎯 Sending targetOffset to frontend: ${targetOffset}`);

        // 🔥 Ensure global tracking object is initialized
        if (!globalThis.hasUpdatedAnimationTime) {
            globalThis.hasUpdatedAnimationTime = {};
        }

        if (globalThis.hasUpdatedAnimationTime[game.id]) {
            console.warn(`⚠️ Skipping duplicate updateAnimationTime for Game ${game.id}`);
            return;
        }

        // ✅ Mark this game as updated (store timestamp)
        globalThis.hasUpdatedAnimationTime[game.id] = Date.now();



      // 🔥 Send Animation Update with Target Offset
      await updateAnimationTime(
        { body: { gameId: game.id, animationStartTime, targetOffset } },
        {
          status: (code) => ({
            json: (data) => {
              if (code === 200) {
                console.log("🎉 Animation time and offset updated successfully!");
              } else {
                console.error("❌ Failed to update animation time/offset:", data);
              }
            },
          }),
        }
      );
    }, delay);
};


  
  

  const scheduleExistingGames = async () => {
    const { data: inProgressGames, error } = await supabase
      .from("jackpot_games")
      .select("*")
      .eq("status", "in_progress");
  
    if (error) {
      console.error("Error fetching in-progress games:", error);
      return;
    }

    const io = getIo(); // 🔥 Ensure io is retrieved inside the function

  
    inProgressGames.forEach(game => {
        console.log(`🔄 Rescheduling game closure for game: ${game.id}`);
        scheduleGameClosure(game, io);
    });
    console.log("✅ Rescheduling complete.");

  };

  const getJackpotHistory = async (req, res) => {
    try {
        // Fetch last 10 finished jackpot games and join with users table
        const { data: games, error } = await supabase
            .from("jackpot_games")
            .select(`
                id, 
                total_pot, 
                result, 
                finished_at,
                users!jackpot_games_result_fkey(email)
            `)
            .eq("status", "finished")
            .order("finished_at", { ascending: false })
            .limit(10);

        if (error) throw error;

        // Fetch winner's wager from jackpot_contributions table
        const updatedGames = await Promise.all(games.map(async (game) => {
            if (!game.result) return { ...game, winner_percentage: "N/A" };

            // Get the winner's total wager in this game
            const { data: winnerContribution, error: contributionError } = await supabase
                .from("jackpot_contributions")
                .select("wager_amount")
                .eq("game_id", game.id)
                .eq("user_id", game.result)
                .single();

            if (contributionError) {
                console.error("Error fetching winner contribution:", contributionError);
                return { ...game, winner_percentage: "N/A" };
            }

            const winnerPercentage = game.total_pot > 0
                ? ((winnerContribution.wager_amount / game.total_pot) * 100).toFixed(2) + "%"
                : "N/A";

            return {
                ...game,
                winner: game.users ? game.users.email : "Unknown Winner",
                winner_percentage: winnerPercentage
            };
        }));

        res.status(200).json({
            success: true,
            message: "Jackpot game history retrieved successfully.",
            games: updatedGames,
        });
    } catch (error) {
        console.error("❌ Error retrieving jackpot history:", error);
        res.status(500).json({
            success: false,
            message: "Failed to retrieve jackpot history. Please try again later.",
        });
    }
};

const updateAnimationTime = async (req, res) => {
    const { gameId, animationStartTime, targetOffset } = req.body;

    if (targetOffset == null) {  
        console.error(`❌ updateAnimationTime: Missing targetOffset for Game ${gameId}.`);
        return res.status(400).json({
            success: false,
            message: "Missing targetOffset, cannot start animation",
        });
    }

    try {
        console.log(`📡 Updating animation for Game ${gameId} with Offset: ${targetOffset}`);

        const isoTimestamp = new Date(animationStartTime).toISOString();
        const { error: updateError } = await supabase
            .from("jackpot_games")
            .update({ animation_start_time: isoTimestamp })
            .eq("id", gameId);

        if (updateError) {
            console.error("❌ Error updating animation time in DB:", updateError);
            return res.status(500).json({ success: false, message: "Failed to update animation time" });
        }

        // ✅ Fetch the game result (winnerId)
        const { data: gameData, error: fetchError } = await supabase
            .from("jackpot_games")
            .select("result")
            .eq("id", gameId)
            .maybeSingle();

        if (fetchError || !gameData) {
            console.error("❌ Error fetching game data:", fetchError);
            return res.status(500).json({ success: false, message: "Failed to fetch game data" });
        }

        const winnerId = gameData.result; // ✅ Now correctly defined

        console.log(`🏆 Winner ID for game ${gameId}: ${winnerId}`);

        const io = getIo();

        console.log(`🚀 Emitting animationStarted with targetOffset ${targetOffset}`);
        io.emit("animationStarted", { gameId, winnerId, animationStartTime: isoTimestamp, targetOffset });

        res.status(200).json({
            success: true,
            message: "Animation time updated successfully",
        });

    } catch (err) {
        console.error("❌ Unexpected error updating animation time:", err);
        res.status(500).json({
            success: false,
            message: "Unexpected error occurred",
        });
    }
};




  
  
  
  






  

  module.exports = { createJackpotGame, getOpenJackpotGames, joinJackpotGame, getJackpotPlayers, closeExpiredJackpotGames, scheduleGameClosure, scheduleExistingGames, getJackpotHistory, updateAnimationTime };
  
  
