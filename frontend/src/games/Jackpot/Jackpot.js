/**
 * Jackpot.js
 * React component for handling the jackpot game logic and UI.
 *
 * Major sections:
 * - Imports & Setup
 * - State Variables
 * - Sync Refs with State
 * - Game API Handlers
 * - Socket Event Handlers
 * - Animation & Winner Handling
 * - Render
 */


import React, { useEffect, useState, useContext, useRef, useMemo, useCallback } from "react";
import { SocketContext } from "../../context/SocketContext";
import axios from "../../utils/axios";
import JackpotAnimation from "./JackpotAnimation";
import useClockOffset from "../../hooks/useClockOffset"; 



const Jackpot = () => {

  const socket = useContext(SocketContext);
  const joinEmittedRef = useRef(false);
  
  // State variables for game data
  const [activeGame, setActiveGame] = useState(null);
  const [players, setPlayers] = useState([]);
  const [totalPot, setTotalPot] = useState(0);
  const [timeLeft, setTimeLeft] = useState(null);
  const [winner, setWinner] = useState(null);
  const [pastGames, setPastGames] = useState([]);
  const [betAmount, setBetAmount] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [serverTargetOffset, setServerTargetOffset] = useState(null);
  const currentRoomRef = useRef(null);
  const [animationStartTime, setAnimationStartTime] = useState(null);
  const [phase, setPhase] = useState("playing");
  const phaseRef = useRef(phase);
  const tapeRef = useRef(null);



  // Other refs for game logic
  const finishedRef = useRef(false);
  const timerRef = useRef(null);
  const pollPlayersInterval = useRef(null);
  const isCreatingGameRef = useRef(false);
  const activeGameRef = useRef(activeGame);
  const playersRef = useRef([]);
  const userId = localStorage.getItem("userId") || "user-id-placeholder";
  const clockOffset = useClockOffset();


  useEffect(() => {
    const savedAnimation = localStorage.getItem("jackpotAnimationState");
    if (savedAnimation) {
      let parsed;
      try {
        parsed = JSON.parse(savedAnimation);
      } catch (err) {
        console.error("Error parsing saved animation state", err);
        localStorage.removeItem("jackpotAnimationState");
        fetchActiveGame();
        fetchPastGames();
        return;
      }
      if (!parsed.game || !parsed.game.status) {
        console.warn("Saved animation state is invalid. Clearing it.");
        localStorage.removeItem("jackpotAnimationState");
        fetchActiveGame();
        fetchPastGames();
        return;
      }
      const { game: savedGame, gameStartTime } = parsed;
      if (savedGame.status === "open" || savedGame.status === "in_progress") {
        axios.get("/api/jackpot/open")
          .then(({ data }) => {
            const games = data.games;
            if (games && games.length > 0 && games[0].id === savedGame.id) {
              setActiveGame(savedGame);
              setAnimationStartTime(gameStartTime);
              setPhase("animating");
              fetchPlayers(savedGame.id);
            } else {
              console.warn("Saved animation state does not match current active game. Clearing it.");
              localStorage.removeItem("jackpotAnimationState");
              fetchActiveGame();
              fetchPastGames();
            }
          })
          .catch((error) => {
            console.error("[ERROR] verifying saved state:", error);
            localStorage.removeItem("jackpotAnimationState");
            fetchActiveGame();
            fetchPastGames();
          });
      } else {
        console.warn("Saved animation state is stale. Clearing it.");
        localStorage.removeItem("jackpotAnimationState");
        fetchActiveGame();
        fetchPastGames();
      }
    } else {
      fetchActiveGame();
      fetchPastGames();
    }
  }, []);
  
  // --- Sync Refs with State ---  
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { activeGameRef.current = activeGame; }, [activeGame]);
  useEffect(() => { playersRef.current = players; }, [players]);

  // --- Fetch Active Game ---
  const fetchActiveGame = async () => {
    if (phaseRef.current !== "playing") return;
    try {
      const token = localStorage.getItem("authToken");
      const { data } = await axios.get("/api/jackpot/open");
      const games = data.games;
      if (games && games.length > 0) {
        const currentGame = games[0];
        if (currentGame.status === "finished" && currentGame.animation_start_time) {
          setActiveGame(currentGame);
          setAnimationStartTime(new Date(currentGame.animation_start_time).getTime());
          setPhase("animating");
          fetchPlayers(currentGame.id);
        } else {
          setActiveGame(currentGame);
        }
      } else if (!isCreatingGameRef.current) {
        isCreatingGameRef.current = true;
        await createNewGame();
        isCreatingGameRef.current = false;
      }
    } catch (error) {
      console.error("[ERROR] fetching active game:", error);
      isCreatingGameRef.current = false;
    }
  };
  
  // --- Fetch Past Games ---
  const fetchPastGames = async () => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        console.error("[ERROR] No auth token found.");
        return;
      }
      const { data } = await axios.get("/api/jackpot/history");
      if (data.success) {
        setPastGames(data.games);
      }
    } catch (error) {
      console.error("[ERROR] fetching past games:", error);
    }
  };

  // --- Create New Game ---
  const createNewGame = async () => {
    localStorage.removeItem("jackpotAnimationState");
    try {
      finishedRef.current = false;
      const token = localStorage.getItem("authToken");
      const { data } = await axios.post("/api/jackpot/create", { time_limit: 10 });
      const game = data.game;
      setActiveGame(game);
      setPlayers([]);
      setTotalPot(0);
      setWinner(null);
      setTimeLeft(null);
      setAnimationStartTime(null);
      setPhase("playing");
    } catch (error) {
      console.error("[ERROR] creating new game:", error);
    }
  };

  // --- Validate Bet ---
  const isValidBet = () => {
    const amount = parseFloat(betAmount);
    return !isNaN(amount) && amount > 0;
  };

  // --- Join Game ---
  const handleJoinGame = async () => {
    if (!activeGame || !betAmount || isJoining || !isValidBet()) return;
    setIsJoining(true);

    try {
        const token = localStorage.getItem("authToken");
        const { data } = await axios.post("/api/jackpot/join", {
          gameId: activeGame.id,
          wager_amount: parseFloat(betAmount)
        });

        if (data.updated_game) {
            setActiveGame(data.updated_game);
            socket.emit("joinGameRoom", { gameId: activeGame.id });

            const { data: latestGame } = await axios.get("/api/jackpot/open");

            if (latestGame.games.length > 0) {
                setTimeLeft(Math.floor((new Date(latestGame.games[0].started_at).getTime() + (latestGame.games[0].time_limit * 1000) - Date.now()) / 1000));
            }
        }

        setBetAmount("");
    } catch (error) {
        console.error("[ERROR] joining game:", error.response ? error.response.data : error);
    } finally {
        setIsJoining(false);
    }
};

  // --- Fetch Players ---
  const fetchPlayers = async (gameId) => {
    try {
      const token = localStorage.getItem("authToken");
      const { data } = await axios.get(`/api/jackpot/${gameId}/players`);
      setPlayers(data.players);
      setTotalPot(data.total_pot);
    } catch (error) {
      console.error("[ERROR] fetching players:", error);
    }
  };

// --- Memoize Players List ---
  const playersList = useMemo(() => {
    return players.map((player) => (
      <li key={player.user_id} className="flex items-center space-x-3">
        <div
          className="w-10 h-10 flex items-center justify-center rounded-full text-white font-bold"
          style={{ backgroundColor: player.avatar_color }}
        >
          {player.avatar_initials}
        </div>
        <p>
          {player.email} - Bet: ${player.wager_amount} ({player.percentage_of_pot}%)
        </p>
      </li>
    ));
  }, [players]);

  // Animation end handler
  const handleAnimationEnd = useCallback(() => {
    setPhase("winner");
    setTimeout(() => {
      fetchPastGames();
      // Clear the saved animation state
      localStorage.removeItem("jackpotAnimationState");
      // Reset state for a new game:
      setActiveGame(null);
      setPlayers([]);
      setTotalPot(0);
      setTimeLeft(null);
      setWinner(null);
      setAnimationStartTime(null);
      setPhase("playing");
      createNewGame();
    }, 3000);
  }, [createNewGame, fetchPastGames]);
  
// --- Memoize Animation Component ---
  const animationComponent = useMemo(() => {
    if (phase === "animating" && winner) {
      return (
        <JackpotAnimation
          players={players}
          winnerId={winner?.user_id || winner} 
          startAnimation={true}
          onAnimationEnd={handleAnimationEnd}
          animationStartTimeFromServer={animationStartTime}
          serverTargetOffset={serverTargetOffset}
          tapeRef={tapeRef}
        />
      );
    }
    return null;
  }, [phase, winner, players, handleAnimationEnd, animationStartTime, serverTargetOffset]);

  // --- Finish Game ---
  const finishGame = async (winnerValue, gameIdParam) => {
    setIsFinishing(true);
    try {
      const token = localStorage.getItem("authToken");
      const gameId =
        (activeGame && activeGame.id) ||
        (activeGameRef.current && activeGameRef.current.id) ||
        gameIdParam;
      if (!gameId) {
        console.error("[ERROR] No active game ID available in finishGame.");
        setIsFinishing(false);
        return;
      }
  
      // Ensure the players list is fresh
      await fetchPlayers(gameId);
  
      let finalWinner;
      let latestGame = null;
  
      if (winnerValue) {
        finalWinner = winnerValue;
      } else {
        // Fallback: fetch the latest game history if no winner was provided
        await new Promise((resolve) => setTimeout(resolve, 2000));
  
        for (let attempt = 0; attempt < 3; attempt++) {
          const { data } = await axios.get("/api/jackpot/history");

  
          latestGame = data.games.find((game) => game.id === gameId);
          if (latestGame) break;
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
  
        if (!latestGame) {
          console.error("[ERROR] Failed to retrieve updated game data after retries.");
          setIsFinishing(false);
          return;
        }
  
        finalWinner = latestGame.result;
  
        if (!finalWinner) {
          console.error("[ERROR] No winner available (finalWinner is null).");
          setIsFinishing(false);
          return;
        }
      }
  
  
      // Ensure latestGame has winner details before setting state
      if (latestGame && latestGame.winner) {
        setWinner({
          email: latestGame.winner, // Ensure API returns email
          avatarColor: latestGame.avatar_color || "#ccc",
          avatarInitials: latestGame.avatar_initials || latestGame.winner[0]?.toUpperCase(),
        });
      } else {
        console.error("[WARNING] Missing winner details in latestGame.");
        setWinner({ email: "Unknown", avatarColor: "#ccc", avatarInitials: "?" });
      }
  
      setActiveGame((prevGame) =>
        prevGame ? { ...prevGame, status: "finished" } : prevGame
      );
  
      const animStartTime = Date.now();
      setAnimationStartTime(animStartTime);

  
      // Save state locally as a fallback
      const finishedGame = { ...activeGame, status: "finished" };
      localStorage.setItem(
        "jackpotAnimationState",
        JSON.stringify({ game: finishedGame, gameStartTime: animStartTime })
      );
  
      setPhase("animating");
    } catch (error) {
      console.error("[ERROR] finishing game:", error);
    }
    setIsFinishing(false);
  };
  
  // --- Handle Game Started Events from Server ---
  useEffect(() => {
    const handleGameStarted = (data) => {
      setActiveGame(data.game);
      if (data.game.started_at && data.game.time_limit) {
        const startTime = new Date(data.game.started_at).getTime();
        const gameDuration = data.game.time_limit * 1000;
        const endTime = startTime + gameDuration;
        const remaining = Math.max(Math.floor((endTime - Date.now()) / 1000), 0);
        setTimeLeft(remaining);
      }
    };
  
    socket.on("gameStarted", handleGameStarted);
  
    return () => {
      socket.off("gameStarted", handleGameStarted);
    };
  }, [socket]);
  
  // --- Load Players When Active Game Changes ---
  useEffect(() => {
    if (activeGame && activeGame.id) {
      fetchPlayers(activeGame.id);
    }
  }, [activeGame]);

  // --- Handle Timer Updates from Server ---
  useEffect(() => {
    const handleTimerUpdate = (data) => {
      setTimeLeft(data.timeLeft);
  
      if (data.timeLeft === 0 && phaseRef.current === "playing") {
      }
    };
  
    socket.on("timerUpdate", handleTimerUpdate);
    return () => {
      socket.off("timerUpdate", handleTimerUpdate);
    };
  }, [socket]);
  
  // --- Keep activeGameRef Up To Date ---
  useEffect(() => {
    activeGameRef.current = activeGame; 
  }, [activeGame]);


// --- Automatic Room Join on Connection ---
useEffect(() => {
  const joinRoom = () => {
    if (activeGameRef.current && activeGameRef.current.id) {
      socket.emit("joinGameRoom", { gameId: activeGameRef.current.id });
      currentRoomRef.current = activeGameRef.current.id;
    }
  };

  if (activeGame) {
    joinRoom();
  }

  socket.on("connect", () => {
    if (activeGameRef.current) joinRoom();
  });

  return () => {
    socket.off("connect");
  };
}, [socket, activeGame]);
  

// --- Handle Player Joined Events from Server ---
useEffect(() => {
  const handlePlayerJoined = (data) => {
    if (activeGameRef.current && data.gameId === activeGameRef.current.id) {
      setPlayers((prevPlayers) => {
        const updatedPlayers = [...prevPlayers];
        data.players.forEach((newPlayer) => {
          if (!updatedPlayers.some((p) => p.user_id === newPlayer.user_id)) {
            updatedPlayers.push(newPlayer);
          }
        });
        return updatedPlayers;
      });
      setTotalPot(data.totalPot);
      setActiveGame((prev) =>
        prev ? { ...prev, total_pot: data.totalPot } : prev
      );
    }
  };

  socket.on("playerJoined", handlePlayerJoined);
  return () => {
    socket.off("playerJoined", handlePlayerJoined);
  };
}, [socket]);


// --- Handle Animation Started Events from Server ---
useEffect(() => {
  const handleAnimationStarted = (data) => {
    if (activeGame && data.gameId === activeGame.id) {
      if (phaseRef.current === "animating") {
        console.warn("[WARNING]  Ignoring duplicate animationStarted event.");
        return;
      }

      const serverTimestamp = new Date(data.animationStartTime).getTime();
      // Adjust the timestamp by subtracting the clock offset.
      const adjustedTimestamp = serverTimestamp - clockOffset;
      

      const winnerDetails =
        players.find(
          (p) => String(p.user_id) === String(data.winnerId)
        ) || { email: data.winnerId, avatarColor: "#ccc", avatarInitials: "?" };

      setWinner(winnerDetails);
      setAnimationStartTime(adjustedTimestamp);
      setServerTargetOffset(data.targetOffset);
      setPhase("animating");
    }
  };

  socket.on("animationStarted", handleAnimationStarted);

  return () => {
    socket.off("animationStarted", handleAnimationStarted);
  };
}, [socket, activeGame, clockOffset, players]);


  // --- Initial Fetches ---
  useEffect(() => {
    fetchActiveGame();
    fetchPastGames();
  }, []);

  // --- Render UI ---
  return (
    <div
      className="max-w-4xl mx-auto p-6 rounded-lg shadow-xl text-white"
      style={{
        background: "linear-gradient(180deg, #1a1f38, #000000)",
        boxShadow: "0 0 20px rgba(0, 150, 255, 0.6)",
        fontFamily: "'Orbitron', sans-serif",
      }}
    >
      {/* Game Title */}
      <h1 className="text-4xl font-extrabold text-center mb-6 neon-text">
        🎰 Jackpot Game
      </h1>
  
      <div className="flex flex-col md:flex-row gap-6">
        {/* Game Info Card */}
        <div className="md:w-1/2">
          <div
            className="p-6 rounded-lg neon-border"
            style={{
              background: "rgba(255, 255, 255, 0.15)",
              backdropFilter: "blur(12px)",
              boxShadow: "0 4px 25px rgba(0, 0, 0, 0.2)",
            }}
          >
            <h2 className="text-xl font-bold text-neon-blue">
              Game ID: {activeGame ? activeGame.id : "Loading..."}
            </h2>
            <p className="text-lg font-medium">
              Status:{" "}
              <span className={activeGame?.status === "open" ? "text-green-400" : "text-yellow-400"}>
                {activeGame ? (activeGame.status === "open" ? "Waiting for players" : "In Progress") : "Loading..."}
              </span>
            </p>
            <p className="text-2xl font-bold text-neon-green">
              💰 Total Pot: ${totalPot}
            </p>
  
            {/* Timer */}
            {activeGame?.status === "in_progress" && (
              <p className="text-2xl font-extrabold text-red-500 neon-glow">
                [TIMER] Time Left: {timeLeft}s
              </p>
            )}
  
            {/* Bet Input */}
            {phaseRef.current === "playing" &&
              (activeGame?.status === "open" || activeGame?.status === "in_progress") && (
                <div className="mt-4">
                  <label className="block text-sm font-medium">Your Bet:</label>
                  <input
                    type="number"
                    value={betAmount}
                    onChange={(e) => setBetAmount(e.target.value)}
                    className="w-full p-3 bg-gray-900 border border-gray-700 rounded-lg text-white text-lg"
                    disabled={isJoining}
                  />
                  <button
                    onClick={handleJoinGame}
                    className="w-full mt-3 bg-blue-600 hover:bg-blue-800 text-white font-bold py-2 px-4 rounded-lg transition-transform transform hover:scale-105 neon-glow"
                    disabled={isJoining || !isValidBet()}
                  >
                    {isJoining ? "Joining..." : "Join Game"}
                  </button>
                </div>
              )}
  
            {/* Players List */}
            {players.length > 0 && (
              <div className="mt-4">
                <h3 className="text-lg font-bold text-neon-yellow">Players:</h3>
                <ul className="space-y-2">{playersList}</ul>
              </div>
            )}
          </div>
        </div>
  
       {/* Right Container: Animation / Winner Display */}
        <div className="md:w-1/2 flex justify-center items-center">
          {phase === "animating" && winner ? (
            animationComponent
          ) : phase === "winner" ? (
            <div className="bg-green-600 p-5 rounded-lg text-center flex flex-col items-center neon-border">
              {winner && typeof winner === "object" ? (
                <>
                  <div
                    className="w-16 h-16 flex items-center justify-center rounded-full text-white font-bold mb-2 shadow-xl"
                    style={{ backgroundColor: winner.avatarColor || "#ccc" }}
                  >
                    {winner.avatarInitials || (winner.email ? winner.email[0].toUpperCase() : "?")}
                  </div>
                  <p className="text-lg font-bold text-neon-green">
                    Winner: {winner.email}
                  </p>
                </>
              ) : (
                <p className="text-lg font-bold text-neon-green">
                  Winner: {winner || "Unknown"}
                </p>
              )}
            </div>
          ) : (
            <div className="bg-gray-800 p-5 rounded-lg text-center">
              {phase === "playing" ? "Animation will play here" : "Awaiting..."}
            </div>
          )}
        </div>

      </div>
  
      {/* Past Games Section */}
      <div className="mt-8">
        <h2 className="text-2xl font-bold text-neon-yellow mb-4">Past Jackpot Games</h2>
        {pastGames.length === 0 ? (
          <p>No past games yet.</p>
        ) : (
          <ul className="space-y-4">
            {pastGames.map((game, index) => (
              <li key={index} className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                <p className="text-neon-blue">Game ID: {game.id}</p>
                <p className="text-neon-green">💰 Total Pot: ${game.total_pot}</p>
                <p className="text-neon-yellow"> Winner: {game.winner}</p>
                <p className="text-yellow-400">Winner's Share: {game.winner_percentage}%</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
  

export default Jackpot;