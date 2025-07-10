/**
 * CoinToss.js
 * React component for handling the Coin Clash/Toss game page logic and UI.
 *
 * Major sections:
 * - Imports & Setup
 * - State Variables
 * - Derived State & Refs
 * - Data Fetching & Polling
 * - Categorization & Stats
 * - Socket Event Handlers
 * - Game Action Handlers
 * - Render
 */

import React, { useContext, useEffect, useState, useRef, useCallback } from "react";
import { GamesContext } from "../../context/GamesContext";
import { SocketContext } from "../../context/SocketContext";
import WatchGameModal from "./WatchGameModal";
import CreateGameModal from "./CreateGameModal";
import debounce from "lodash.debounce";

// --- Hero Section Component ---
function HeroSection() {
  return (
    <section className="bg-gradient-to-r from-blue-900 to-black p-8 rounded-lg mb-8 text-center"
      style={{
        boxShadow: "0 0 20px rgba(0, 150, 255, 0.6)",
      }}
    >
      <h1 className="text-5xl font-extrabold text-white neon-text1">Coin Clash</h1>
      <p className="mt-4 text-xl text-neon-blue">
      Flip. Clash. Dominate!      </p>
    </section>
  );
}

// --- Main CoinToss Component ---
function CoinToss() {
  const { games, fetchGames, setGames } = useContext(GamesContext);
  const socket = useContext(SocketContext); 

  // --- State Variables ---
  const [error, setError] = useState("");
  const [isJoining, setIsJoining] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [watchingGame, setWatchingGame] = useState(null);
  const [showAnimation, setShowAnimation] = useState(false);
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);
  const [openGames, setOpenGames] = useState(0);
  const [totalGamesToday, setTotalGamesToday] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false); 
  const [joiningGames, setJoiningGames] = useState(new Set());
  const [activeGames, setActiveGames] = useState([]);
  const [completedGames, setCompletedGames] = useState([]);

  // --- Refs ---
  const pollIntervalRef = useRef(null);

  

  // --- Debounced FetchGames ---
  const debouncedFetchGames = useCallback(debounce(() => {
    fetchGames();
  }, 500), [fetchGames]);

  // --- Initial Fetch and User ID Setup ---
  useEffect(() => {
    if (fetchGames) {
      debouncedFetchGames();
    }
    const token = localStorage.getItem("authToken");
    if (token) {
      try {
        const decodedToken = JSON.parse(atob(token.split(".")[1]));
        setCurrentUserId(decodedToken.userId);
      } catch (error) {
        console.error("Error decoding token:", error);
      }
    }
  }, [fetchGames, debouncedFetchGames]);

  // --- Polling for Watched Game Updates ---
  useEffect(() => {
    if (watchingGame && !watchingGame.result) {
      pollIntervalRef.current = setInterval(async () => {
        await debouncedFetchGames();
        const updatedGame = games.find((g) => g.id === watchingGame.id);
        if (updatedGame?.result) {
          setWatchingGame(updatedGame);
          clearInterval(pollIntervalRef.current);
        }
      }, 1000);
    }
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [watchingGame, games, debouncedFetchGames]);

  // --- Background Process Effect ---
  useEffect(() => {
    games.forEach((game) => {
      if (game.status !== "open") {
        if (!localStorage.getItem(`coinStart-${game.id}`)) {
          localStorage.setItem(`coinStart-${game.id}`, Date.now().toString());
        }
        const coinStartStr = localStorage.getItem(`coinStart-${game.id}`);
        if (coinStartStr && !localStorage.getItem(`animationPlayed-${game.id}`)) {
          const coinStart = parseInt(coinStartStr, 10);
          const elapsed = Date.now() - coinStart;
          if (elapsed >= 15000) {
            const finalSide = game.result === game.creator_id ? "Heads" : "Tails";
            localStorage.setItem(`animationPlayed-${game.id}`, finalSide);
          }
        }
      }
    });
  }, [games]);

  // --- Stats Calculation (Wins/Losses) ---
  useEffect(() => {
    if (!currentUserId) return;
  
    let winCount = 0;
    let lossCount = 0;
    games.forEach((game) => {
      if (game.result) {
        const userWon = game.result === currentUserId;
        if (userWon) {
          winCount++;
        } else if (game.creator_id === currentUserId || game.opponent_id === currentUserId) {
          lossCount++;
        }
      }
    });
    setWins(winCount);
    setLosses(lossCount);
  }, [games, currentUserId]);

  // --- Open Games & Today's Games Count ---
  useEffect(() => {
    if (!games || games.length === 0) {
      setOpenGames(0);
      setTotalGamesToday(0);
      return;
    }
  
    const today = new Date().toISOString().split("T")[0];
    let openCount = 0;
    let todayCount = 0;
  
    games.forEach((game) => {
      // Count games that are still open
      if (game.status === "open") {
        openCount++;
      }
      // Count games created today (using the created_at property)
      if (game.created_at) {
        const gameDate = new Date(game.created_at).toISOString().split("T")[0];
        if (gameDate === today) {
          todayCount++;
        }
      }
    });
  
    setOpenGames(openCount);
    setTotalGamesToday(todayCount);
  }, [games]);
  

// --- Categorize Active & Completed Games ---
useEffect(() => {
  if (!games || games.length === 0) return;
  
  const newActiveGames = [];
  const newCompletedGames = [];
  const now = Date.now();
  const delay = 15000; 

  games.forEach((game) => {
    if (game.status === "finished" && game.finished_at) {
      const finishedTime = new Date(game.finished_at).getTime();
      if (now - finishedTime < delay) {
        newActiveGames.push(game);
      } else {
        newCompletedGames.push(game);
      }
    } else {
      newActiveGames.push(game);
    }
  });
  
  setActiveGames(newActiveGames);
  setCompletedGames(newCompletedGames);
}, [games]);

// --- Body Scroll Lock on Modal Open ---
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
  }, [isModalOpen]);

  // --- Handle Socket Updates ---
  useEffect(() => {
    socket.on("gameUpdated", (updatedGame) => {
  
      // Only skip if the game is finished and the result is missing
      if (updatedGame.status === "finished" && !updatedGame.result) {
        console.warn(`[WARNING]  Skipping finished game ${updatedGame.id}: Missing result`);
        return;
      }
  
      setGames((prevGames) => {
        const newGames = prevGames.map((g) =>
          g.id === updatedGame.id
            ? {
                ...updatedGame,
                created_at: updatedGame.created_at || g.created_at || new Date().toISOString(),
              }
            : g
        );
        // Update the watchingGame if it's the same game
        if (watchingGame && watchingGame.id === updatedGame.id) {
          setWatchingGame(updatedGame);
        }
        return newGames;
      });
    });
  
    return () => {
      socket.off("gameUpdated");
    };
  }, [socket, setGames, watchingGame]);
  
  // --- Handle Create Game ---
  const handleCreateGame = async (wagerAmount, coinChoice) => {
    setIsCreating(true);
    try {
      const response = await fetch("http://localhost:5000/api/games/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("authToken")}`,
        },
        // Include creator_choice along with wager_amount
        body: JSON.stringify({ wager_amount: wagerAmount, creator_choice: coinChoice }),
      });
  
      const data = await response.json();
      if (data.success) {
        debouncedFetchGames(); // Refresh game list
      } else {
        setError(data.message || "Failed to create game.");
      }
    } catch (err) {
      console.error("Error creating game:", err);
      setError("An error occurred while creating the game.");
    } finally {
      setIsCreating(false);
    }
  };
  

  // --- Handle Join Game ---
  const handleJoinGame = async (gameId) => {
    setIsJoining(gameId);
    setJoiningGames((prev) => new Set(prev).add(gameId)); 
  
    try {
      setActiveGames((prevActiveGames) =>
        prevActiveGames.map((g) =>
          g.id === gameId
            ? { ...g, status: "in_progress", opponent_id: currentUserId }
            : g
        )
      );
  
      const response = await fetch("http://localhost:5000/api/games/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("authToken")}`,
        },
        body: JSON.stringify({ gameId }),
      });
  
      const data = await response.json();
      if (data.success) {
        await fetchGames(); 
      } else {
        console.error(`Failed to join game ${gameId}: ${data.message}`); 
        setError(data.message);
        setActiveGames((prevActiveGames) =>
          prevActiveGames.map((g) =>
            g.id === gameId
              ? { ...g, status: "open", opponent_id: null }
              : g
          )
        );
      }
    } catch (err) {
      console.error(`Error joining game ${gameId}:`, err);
      setError("An error occurred while joining the game.");
      setActiveGames((prevActiveGames) =>
        prevActiveGames.map((g) =>
          g.id === gameId
            ? { ...g, status: "open", opponent_id: null }
            : g
        )
      );
    } finally {
      setIsJoining(null);
      setJoiningGames((prev) => {
        const newSet = new Set(prev);
        newSet.delete(gameId);
        return newSet;
      }); // Unlock the game
    }
  };

  // --- Frontend Status ---
  const getFrontendStatus = (game) => {
    if (game.status === "open") {
      return "Open game";
    } else if (game.status === "in_progress") {
      return "In Progress";
    } else if (game.status === "finished") {
      // If the coin toss animation hasn’t played, show as “In Progress”
      const animationPlayed = localStorage.getItem(`animationPlayed-${game.id}`);
      return animationPlayed ? "Finished" : "In Progress";
    }
    return game.status;
  };
  
  // --- WatchGame Sync on Update ---
  useEffect(() => {
    if (watchingGame) {
      const latest = games.find((g) => g.id === watchingGame.id);
      if (latest && latest.status === "finished") {
        setWatchingGame(latest);
      }
    }
  }, [games, watchingGame]);
  
  // --- Render UI ---
  return (
    <div
      className="max-w-5xl mx-auto p-6"
      style={{
        background: "linear-gradient(180deg, #1a1f38, #000000)",
        fontFamily: "'Orbitron', sans-serif",
        boxShadow: "0 0 20px rgba(0, 150, 255, 0.6)",
      }}
    >
      {/* Hero Section */}
      <HeroSection />
  
      {/* Header Section for Stats */}
      <header className="mb-8">
        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="p-4 bg-gray-900 rounded-lg neon-border text-center">
            <h2 className="text-xl font-semibold">Your Stats</h2>
            <div className="mt-2">
              <p className="text-neon-green">Wins: {wins}</p>
              <p className="text-neon-yellow">Losses: {losses}</p>
            </div>
          </div>
          <div className="p-4 bg-gray-900 rounded-lg neon-border text-center">
            <h2 className="text-xl font-semibold">Game Activity</h2>
            <div className="mt-2">
              <p className="text-neon-blue">Open Games: {openGames}</p>
              <p className="text-neon-green">Today's Games: {totalGamesToday}</p>
            </div>
          </div>
        </div>
      </header>
  
      {/* Create Game Button */}
      <div className="flex justify-start mb-6">
        <button
          className="px-6 py-3 bg-green-500 text-white rounded hover:bg-green-600 neon-glow"
          onClick={() => setIsModalOpen(true)}
        >
          Create Game
        </button>
      </div>
  
      {/* Main Content */}
      <main>
        {/* Active Games Section */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Active Games</h2>
          <ul className="space-y-4">
            {activeGames.map((game) => (
              <li
                key={game.id}
                className="group p-4 border rounded-md shadow neon-border bg-gray-900 transition-all hover:scale-105 hover:shadow-lg flex flex-col"
              >
                <div className="text-center mb-4">
                  <h2 className="text-lg font-semibold">
                    Game ID: {game.id.slice(0, 8)}...
                  </h2>
                  <p>
                    Wager:{" "}
                    <span className="text-green-400">${game.wager_amount}</span>
                  </p>
                  <p>Status: <strong>{getFrontendStatus(game)}</strong></p>
                </div>
                <div className="flex h-24 w-full">
                {(game.creator_choice || "").toLowerCase() === "heads" ? (
                // Creator in red container and opponent in blue container
                <>
                  <div className="w-1/2 bg-red-500 flex flex-col items-center justify-center p-2">
                    <div
                      className="w-10 h-10 flex items-center justify-center rounded-full text-white font-bold border border-white"
                      style={{ backgroundColor: game.creator_avatar_color }}
                    >
                      {game.creator_initials}
                    </div>
                    <span className="text-white text-sm">{game.creator_email}</span>
                  </div>
                  <div className="w-1/2 bg-blue-500 flex flex-col items-center justify-center p-2">
                    {game.opponent_id ? (
                      <>
                        <div
                          className="w-10 h-10 flex items-center justify-center rounded-full text-white font-bold border border-white"
                          style={{ backgroundColor: game.opponent_avatar_color }}
                        >
                          {game.opponent_initials}
                        </div>
                        <span className="text-white text-sm">{game.opponent_email}</span>
                      </>
                    ) : (
                      <span className="text-white font-bold">Waiting for player...</span>
                    )}
                  </div>
                </>
              ) : (
                // Opposite: if creator chose tails, show opponent in red container and creator in blue container
                <>
                  <div className="w-1/2 bg-red-500 flex flex-col items-center justify-center p-2">
                    {game.opponent_id ? (
                      <>
                        <div
                          className="w-10 h-10 flex items-center justify-center rounded-full text-white font-bold border border-white"
                          style={{ backgroundColor: game.opponent_avatar_color }}
                        >
                          {game.opponent_initials}
                        </div>
                        <span className="text-white text-sm">{game.opponent_email}</span>
                      </>
                    ) : (
                      <span className="text-white font-bold">Waiting for player...</span>
                    )}
                  </div>
                  <div className="w-1/2 bg-blue-500 flex flex-col items-center justify-center p-2">
                    <div
                      className="w-10 h-10 flex items-center justify-center rounded-full text-white font-bold border border-white"
                      style={{ backgroundColor: game.creator_avatar_color }}
                    >
                      {game.creator_initials}
                    </div>
                    <span className="text-white text-sm">{game.creator_email}</span>
                  </div>
                </>
              )}

                </div>

                {game.status === "open" && currentUserId !== game.creator_id && (
                  <button
                    className="bg-blue-600 text-white px-3 py-1 rounded mt-2 neon-glow"
                    onClick={() => handleJoinGame(game.id)}
                    disabled={isJoining === game.id}
                  >
                    {isJoining === game.id ? "Joining..." : "Join Game"}
                  </button>
                )}
                {game.status !== "open" && (
                  <button
                    className="bg-indigo-600 text-white px-3 py-1 rounded mt-2 neon-glow"
                    onClick={() => {
                      debouncedFetchGames();
                      setWatchingGame(game);
                    }}
                  >
                    Watch
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>

        {/* Spacer between Active and Completed Games */}
        {activeGames.length === 0 && (
          <div className="h-32 border-2 border-gray-500 rounded-md flex items-center justify-center text-gray-400">
            No active games
          </div>
        )}



  
        {/* Completed Games Section */}
        <section>
          <h2 className="text-2xl font-bold mb-4">Completed Games</h2>
          {completedGames.length > 0 ? (
            <ul className="space-y-4">
              {completedGames.map((game) => {
                const coinResult =
                localStorage.getItem(`animationPlayed-${game.id}`) ||
                (game.result === game.creator_id ? game.creator_choice : (game.creator_choice === "Heads" ? "Tails" : "Heads"));              
                const totalPot = game.wager_amount * 2;
                return (
                  <li
                    key={game.id}
                    className="group p-4 border rounded-md shadow neon-border bg-gray-800 transition-all hover:scale-105 hover:shadow-lg"
                  >
                    <h2 className="text-lg font-semibold">Game ID: {game.id.slice(0, 8)}...</h2>
                    <p>
                      Wager: <span className="text-green-400">${game.wager_amount}</span>
                    </p>
                    <p>Status: <strong>{game.status}</strong></p>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <p>
                        Creator: <span className="text-red-500">{game.creator_id.slice(0, 8)}</span>
                      </p>
                      <p>
                        Opponent:{" "}
                        {game.opponent_id ? (
                          <span className="text-blue-500">{game.opponent_id.slice(0, 8)}</span>
                        ) : (
                          "Not yet joined"
                        )}
                      </p>
                    </div>
                    {coinResult ? (
                      <div className="mt-2">
                        <div className="coin-container">
                          <div
                            className="coin"
                            style={{
                              transform:
                                coinResult === "Heads"
                                  ? "rotateY(0deg) scale(1) translateZ(0px)"
                                  : "rotateY(180deg) scale(1) translateZ(0px)",
                            }}
                          >
                            <div className="coin-face coin-heads">Heads</div>
                            <div className="coin-face coin-tails">Tails</div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-neon-yellow">[WINNER]  Winner: {game.result}</p>
                    )}
                    <p>Total Pot: <span className="text-yellow-400">${totalPot}</span></p>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-gray-500">No completed games yet.</p>
          )}
        </section>
      </main>
  
      {/* Watch Game Modal */}
      {watchingGame && (
        <WatchGameModal
          game={games.find((g) => g.id === watchingGame.id) || watchingGame}
          onClose={() => {
            setWatchingGame(null);
            setShowAnimation(false);
          }}
        />
      )}
  
      {/* Create Game Modal */}
      <CreateGameModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreateGame={handleCreateGame}
      />
    </div>
  );
        }  


export default CoinToss;
