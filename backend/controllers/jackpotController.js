/**
 * Jackpot Game Controller
 * -----------------------
 * Handles creation, joining, timing, winner selection, and animation updates
 * for the jackpot game.
 */

const supabase = require("../utils/supabaseClient");
const crypto = require("crypto");
const { getIo } = require("../socket");


const CARD_WIDTH = 80;
const CONTAINER_WIDTH = 400;
const TAPE_LENGTH = 100; 

// Seedable PRNG
function mulberry32(a) {
  return function() {
    let t = (a += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Deterministic shuffle using seed
function shuffleWithSeed(array, seed) {
  const rng = mulberry32(seed);
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}


// Global flag to track animation updates
globalThis.hasUpdatedAnimationTime = {};


/**
 * Builds exactly TAPE_LENGTH tape with wager proportions,
 * shuffles with seed, and returns winnerIndex & targetOffset.
 */
const computeWinnerOffsetAndIndex = (players, winnerEmail, seed) => {
  if (!players || players.length === 0) {
    console.error("[ERROR] No players available for offset computation.");
    return null;
  }

  const totalWager = players.reduce((acc, p) => acc + Number(p.wager_amount), 0);
  if (totalWager <= 0) {
    console.error("[ERROR] Total wager is zero.");
    return null;
  }

  // 1️⃣ Build weighted tape of exactly TAPE_LENGTH
  let tape = [];
  let remainder = TAPE_LENGTH;
  players.forEach((player, idx) => {
    let count = Math.round((player.wager_amount / totalWager) * TAPE_LENGTH);
    if (count < 1) count = 1;
    tape.push(...Array(count).fill(player));
    remainder -= count;
  });
  // Fix rounding errors
  while (remainder > 0) {
    tape.push(players[0]); remainder--;
  }
  while (remainder < 0) {
    tape.pop(); remainder++;
  }

  console.log(`[DEBUG] Built tape length = ${tape.length}`);


  // 2️⃣ Shuffle with seed
  shuffleWithSeed(tape, seed);

  // 3️⃣ Find winner index
  const winnerIndex = tape.findIndex(p => 
    String(p.email).trim().toLowerCase() === String(winnerEmail).trim().toLowerCase()
  );

  if (winnerIndex === -1) {
    console.error("[ERROR] Winner not found in shuffled tape!");
    return null;
  }

  // 4️⃣ Compute offset to center
  const targetOffset = winnerIndex * CARD_WIDTH - (CONTAINER_WIDTH / 2 - CARD_WIDTH / 2);

  console.log(`[DEBUG] WinnerIndex=${winnerIndex} TargetOffset=${targetOffset}`);
  return { winnerIndex, targetOffset };
};




const createJackpotGame = async (req, res) => {
    const { time_limit } = req.body;
    const creator_id = req.user.userId;
  
    if (!time_limit || time_limit <= 0) {
      return res.status(400).json({ success: false, message: "Invalid time limit" });
    }
  
    try {
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
      console.error("[ERROR] Failed to create jackpot game:", error);
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
      console.error("[ERROR] Failed to fetch active jackpot games:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve active games. Please try again.",
      });
    }
  };


const activeTimers = new Map(); // Store active timers

/**
 * Starts a countdown timer for a jackpot game.
 * Emits 'timerUpdate' events to clients every second.
 */
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

        console.log(`[INFO] Timer started for game ${gameId}`);

        const timerInterval = setInterval(() => {
            const timeLeft = Math.max(Math.floor((gameEndTime - Date.now()) / 1000), 0);
            io.emit("timerUpdate", { gameId, timeLeft });

            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                activeTimers.delete(gameId);
                console.log(`[INFO] Timer ended for game ${gameId}`);
            }
        }, 1000);

        activeTimers.set(gameId, timerInterval); 

    } catch (error) {
        console.error("[ERROR] starting timer:", error);
    }
};

  const joinJackpotGame = async (req, res) => {
    const { gameId, wager_amount } = req.body;
    const user_id = req.user.userId;

    if (!gameId || !wager_amount || wager_amount <= 0) {
        return res.status(400).json({ success: false, message: "Invalid Game ID or wager amount" });
    }

    try {
        const { data: game, error: gameError } = await supabase
            .from("jackpot_games")
            .select("*")
            .eq("id", gameId)
            .in("status", ["open", "in_progress"])
            .maybeSingle();

        if (gameError) return res.status(500).json({ success: false, message: "Error fetching game." });
        if (!game) return res.status(404).json({ success: false, message: "Game not found or already finished." });

        const { data: previousBets, error: previousBetsError } = await supabase
            .from("jackpot_contributions")
            .select("id")
            .eq("game_id", gameId);

        if (previousBetsError) {
            console.error("[ERROR] checking existing bets:", previousBetsError);
        }

        const isFirstBet = !previousBets || previousBets.length === 0;

        const { data: existingContribution } = await supabase
            .from("jackpot_contributions")
            .select("id")
            .eq("game_id", gameId)
            .eq("user_id", user_id)
            .maybeSingle();

        if (existingContribution) {
            return res.status(403).json({ success: false, message: "You have already made a bet" });
        }

        const { data: contribution, error: insertError } = await supabase
            .from("jackpot_contributions")
            .insert([{ game_id: gameId, user_id, wager_amount }])
            .select("*")
            .single();

        if (insertError) return res.status(500).json({ success: false, message: "Failed to insert wager" });

        let updateFields = { total_pot: game.total_pot + wager_amount };

        if (isFirstBet) {
            console.log(`[INFO] First bet placed for game ${gameId}. Starting game.`);
            updateFields.status = "in_progress";
            updateFields.started_at = new Date().toISOString();
        }

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

        if (isFirstBet) {
            const io = getIo();
            io.emit("gameStarted", { game: updatedGame });
            startTimer(gameId, io);
            scheduleGameClosure(updatedGame, io);
        }


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
            console.error("[ERROR] fetching updated players:", fetchPlayersError);
        }

        const formattedPlayers = updatedPlayers.map(player => ({
            user_id: player.user_id,
            email: player.users?.email || "Unknown",
            wager_amount: player.wager_amount,
            avatar_color: player.users?.avatar_color || "#ccc",
            avatar_initials: player.users?.avatar_initials || "?",
        }));

        const io = getIo();
    
        io.to(gameId).emit("playerJoined", {
            gameId,
            totalPot: updateFields.total_pot,
            players: formattedPlayers, 
        });

        return res.status(200).json({
            success: true,
            message: "Bet placed successfully!",
            updated_game: updatedGame,
            contribution,
        });
    } catch (error) {
        console.error("[ERROR] Unexpected error:", error);
        return res.status(500).json({ success: false, message: "An unexpected error occurred." });
    }
};





const getJackpotPlayers = async (req, res) => {
    const { gameId } = req.params;
    try {
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
  
      const totalPot = playerData.reduce(
        (sum, player) => sum + Number(player.wager_amount),
        0
      );
  
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
            console.log(`[TIMER] Game ${gameId} is still running. No action taken.`);
            return;
        }

        console.log(`[ALERT] Closing expired game ${gameId}...`);
        const winnerResult = await selectJackpotWinner(gameId);

        if (winnerResult.error) {
            console.log(`[WARNING]  No valid winner found for game ${gameId}. Reason: ${winnerResult.error}`);
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

        console.log(`[SUCCESS] Game ${gameId} closed! Winner: ${winnerId}`);

        io.emit("jackpotUpdate", {
            gameId: gameId,
            status: "finished",
            winnerId: winnerId,
            message: `Game finished! Winner: ${winnerId}`
        });

    } catch (error) {
        console.error("[ERROR] closing game:", error);
    }
};


/**
 * Securely selects a winner based on weighted wagers.
 * Updates the game's result in the database.
 */
const selectJackpotWinner = async (gameId) => {
    try {
        const {data: players, error: fetchError } = await supabase
            .from("jackpot_contributions")
            .select("user_id, wager_amount, users!inner(email)")
            .eq("game_id", gameId)

        console.log("Players Data:", JSON.stringify(players, null, 2));


        if (fetchError) {
            console.error("[ERROR] fetching players:", fetchError);
            return { error: "Error fetching players." };
        }
        
        if (!players || players.length === 0) {
            console.error(`[WARNING]  No players found for game ${gameId}.`);
            return { error: "No players found." };
        }
            

        let weightedPool = [];
        players.forEach(player => {

            if (!player.users || !player.users.email) {
                console.error(`[WARNING]  Missing user email for player:`, player);
                return;
            }

            const amount = Number(player.wager_amount);
            for (let i = 0; i < amount; i++) {
                weightedPool.push({user_id: player.user_id, email: player.users.email});
            }
        });

        if (weightedPool.length === 0) {
            console.log("[ERROR] No valid entries in the weighted pool.");
            return { error: "No valid players in the weighted pool." }; 
        }

        const randomBuffer = crypto.randomBytes(4); 
        const randomValue = randomBuffer.readUInt32BE(0); 
        const winnerIndex = randomValue % weightedPool.length;

        const {user_id: winnerId, email: winnerEmail } = weightedPool[winnerIndex];
        


        const {error: updateError} = await supabase
            .from("jackpot_games")
            .update({result: winnerId})
            .eq("id", gameId)
            .select()
            .maybeSingle();  

        if (updateError) {
            console.error("[ERROR] updating game with winner:", updateError);
            return { error: "Failed to update winner in the database." };
        } 

        const {data: winnerData, error: winnerError } = await supabase
            .from("users")
            .select("email")
            .eq("id", winnerId)
            .maybeSingle();

        if (winnerError) {
            console.error("Error fetching winners email:", winnerError);
            return {error: "Failed to fetch winners email"};
        }


        console.log(`[COMPLETE] Jackpot Winner Selected: ${winnerData.email} (${winnerId}) for Game ${gameId}`);
        return { winnerId, winnerEmail: winnerData.email };

    } catch (error) {
        console.error("[ERROR] Unexpected error selecting jackpot winner:", error);
        return { error: error.message };
    }
};

/**
 * Schedules closure of a running game after its time limit expires.
 * Picks a winner and emits the final game result to clients.
 */
const scheduleGameClosure = async (game, io) => {
    const gameEndTime = new Date(game.started_at).getTime() + game.time_limit * 1000;
    const now = Date.now();
    let delay = gameEndTime - now;
    if (delay < 0) {
      delay = 0;
    }

    setTimeout(async () => {
      console.log(`[TIMER] Game ${game.id} time expired. Closing game...`);
      const winnerResult = await selectJackpotWinner(game.id);
      
      if (winnerResult.error) {
        console.log(`[WARNING]  No valid winner found for game ${game.id}. Reason: ${winnerResult.error}`);
        io.emit("jackpotUpdate", {
          gameId: game.id,
          status: "error",
          message: `No valid winner found. Reason: ${winnerResult.error}`,
        });
        return;
      }

      const winnerId = winnerResult.winnerId;
      const nowDate = new Date();

      const { error: updateError } = await supabase
        .from("jackpot_games")
        .update({
          status: "finished",
          finished_at: nowDate,
          result: winnerId,
        })
        .eq("id", game.id);
      
      if (updateError) {
        console.error(`[ERROR] closing game ${game.id}:`, updateError);
        return;
      }
      
      console.log(`[SUCCESS] Game ${game.id} finished! Winner: ${winnerId}`);
      io.emit("jackpotUpdate", {
        gameId: game.id,
        status: "finished",
        winnerId: winnerId,
        message: `Game finished! Winner: ${winnerId}`,
      });

      const animationStartTime = Date.now();

      const { data: playersData, error: playersError } = await supabase
        .from("jackpot_contributions")
        .select(`
          user_id, 
          wager_amount, 
          users (email)
        `)
        .eq("game_id", game.id);

      if (playersError || !playersData) {
        console.error("[ERROR] fetching players for tape computation:", playersError);
        return;
      }

      if (!winnerResult.winnerEmail) {
        console.error("[ERROR] No valid winner email found.");
        return;
      }

      const formattedPlayers = playersData.map(player => ({
        user_id: player.user_id,
        email: player.users?.email || "unknown",
        wager_amount: player.wager_amount,
      }));

      // Generate random seed
      const seedBuffer = crypto.randomBytes(4);
      const seed = seedBuffer.readUInt32BE(0);

      // Compute winnerIndex and targetOffset with seed
      const offsetResult = computeWinnerOffsetAndIndex(formattedPlayers, winnerResult.winnerEmail, seed);


      if (!offsetResult) {
        console.error("[ERROR] Failed to compute target offset. Aborting animation update.");
        return;
      }

      const { winnerIndex, targetOffset } = offsetResult;

      console.log(`[OFFSET]  Sending targetOffset=${targetOffset} winnerIndex=${winnerIndex} seed=${seed}`);


      console.log(`[OFFSET]  Sending targetOffset to frontend: ${targetOffset}`);

        if (!globalThis.hasUpdatedAnimationTime) {
            globalThis.hasUpdatedAnimationTime = {};
        }

        if (globalThis.hasUpdatedAnimationTime[game.id]) {
            console.warn(`[WARNING]  Skipping duplicate updateAnimationTime for Game ${game.id}`);
            return;
        }

        globalThis.hasUpdatedAnimationTime[game.id] = Date.now();



      await updateAnimationTime(
        { body: { gameId: game.id, animationStartTime, targetOffset, seed, winnerIndex } },
        {
          status: (code) => ({
            json: (data) => {
              if (code === 200) {
                console.log("[COMPLETE] Animation time and offset updated successfully!");
              } else {
                console.error("[ERROR] Failed to update animation time/offset:", data);
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

    const io = getIo(); 

  
    inProgressGames.forEach(game => {
        console.log(`[RESCHEDULE] game closure for game: ${game.id}`);
        scheduleGameClosure(game, io);
    });
    console.log("[SUCCESS] Rescheduling complete.");

  };

  const getJackpotHistory = async (req, res) => {
    try {
       
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

       
        const updatedGames = await Promise.all(games.map(async (game) => {
            if (!game.result) return { ...game, winner_percentage: "N/A" };

            
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
        console.error("[ERROR] retrieving jackpot history:", error);
        res.status(500).json({
            success: false,
            message: "Failed to retrieve jackpot history. Please try again later.",
        });
    }
};

/**
 * Updates the animation start time and target offset in the database.
 * Notifies clients to start jackpot animation.
 */
const updateAnimationTime = async (req, res) => {
  const { gameId, animationStartTime, targetOffset, seed, winnerIndex } = req.body;

  if (targetOffset == null) {
    console.error(`[ERROR] updateAnimationTime: Missing targetOffset for Game ${gameId}.`);
    return res.status(400).json({
      success: false,
      message: "Missing targetOffset, cannot start animation",
    });
  }

  try {
    // Save animation time in DB (optional)
    const isoTimestamp = new Date(animationStartTime).toISOString();
    await supabase
      .from("jackpot_games")
      .update({ animation_start_time: isoTimestamp })
      .eq("id", gameId);

    const { data: gameData } = await supabase
      .from("jackpot_games")
      .select("result")
      .eq("id", gameId)
      .maybeSingle();

    const winnerId = gameData?.result;

    const io = getIo();
    io.emit("animationStarted", {
      gameId,
      winnerId,
      animationStartTime: isoTimestamp,
      targetOffset,
      seed,
      winnerIndex
    });

    res.status(200).json({
      success: true,
      message: "Animation time updated successfully",
    });
  } catch (err) {
    console.error("[ERROR] Unexpected error updating animation time:", err);
    res.status(500).json({
      success: false,
      message: "Unexpected error occurred",
    });
  }
};





  module.exports = { createJackpotGame, getOpenJackpotGames, joinJackpotGame, getJackpotPlayers, closeExpiredJackpotGames, scheduleGameClosure, scheduleExistingGames, getJackpotHistory, updateAnimationTime };
  
  