/**
 * WatchGameModal.js
 *
 * Modal to watch a coin toss game with countdown and animation phases.
 */

import React, { useEffect, useState, useCallback } from "react";
import CoinFlipAnimation from "./CoinFlipAnimation";

const WatchGameModal = ({ game, onClose, onAnimationComplete }) => {
  const COIN_TOSS_DURATION = 8000;

  // phase: "countdown", "animation", or "result"
  const [phase, setPhase] = useState("countdown");

  // Initialize remaining seconds based on the stored coinStart timestamp
  const [remaining, setRemaining] = useState(() => {
    const coinStartStr = localStorage.getItem(`coinStart-${game.id}`);
    if (coinStartStr) {
      const coinStart = parseInt(coinStartStr, 10);
      const elapsed = Date.now() - coinStart;
      if (elapsed < COIN_TOSS_DURATION) {
        return Math.ceil((COIN_TOSS_DURATION - elapsed) / 1000);
      }
    }
    return 0;
  });

  // Determine the final coin side based on backend logic.
  const finalCoinSide = game.result !== undefined
    ? (game.result === game.creator_id ? game.creator_choice : (game.creator_choice === "Heads" ? "Tails" : "Heads"))
    : "Unknown";

  const winnerEmail = game.result !== undefined
    ? (game.result === game.creator_id ? game.creator_email : game.opponent_email)
    : "Unknown";

  // Update the countdown timer and change phase when time is up.
  useEffect(() => {
    const coinStartStr = localStorage.getItem(`coinStart-${game.id}`);
    if (!coinStartStr) {
      setPhase("result");
      return;
    }
    const coinStart = parseInt(coinStartStr, 10);

    const intervalId = setInterval(() => {
      const elapsed = Date.now() - coinStart;
      if (elapsed < COIN_TOSS_DURATION) {
        setRemaining(Math.ceil((COIN_TOSS_DURATION - elapsed) / 1000));
        setPhase("countdown");
      } else if (elapsed < COIN_TOSS_DURATION + 3000) {
        setPhase("animation");
      } else {
        setPhase("result");
        clearInterval(intervalId);
      }
    }, 500);

    return () => clearInterval(intervalId);
  }, [game.id]);

  // Animation finish handler
  const handleAnimationFinish = useCallback(() => {
    localStorage.setItem(`animationPlayed-${game.id}`, finalCoinSide);
    setPhase("result");
    localStorage.setItem(`gameCompleteTime-${game.id}`, Date.now().toString());
    if (onAnimationComplete) {
      onAnimationComplete(finalCoinSide);
    }
  }, [finalCoinSide, game.id, onAnimationComplete]);

  // Determine what content to display based on the current phase.
  let content;
  if (phase === "countdown") {
    content = (
      <div className="text-center text-xl font-bold">
        The game begins in {remaining}...
      </div>
    );
  } else if (phase === "animation") {
    content = (
      <CoinFlipAnimation
        result={finalCoinSide}
        duration={3000}
        onFinish={handleAnimationFinish}
      />
    );
  } else {
    const finalTransform =
      finalCoinSide === "Heads"
        ? "rotateY(0deg) scale(1) translateZ(0px)"
        : "rotateY(180deg) scale(1) translateZ(0px)";
    content = (
      <div className="flex items-center justify-center w-full mb-4">
        <div className="coin-container">
          <div className="coin" style={{ transform: finalTransform }}>
            <div className="coin-face coin-heads">Heads</div>
            <div className="coin-face coin-tails">Tails</div>
          </div>
        </div>
      </div>
    );
  }
  

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
      {/* Increased modal container width */}
      <div className="bg-slate-800 p-6 rounded-lg shadow-lg relative w-full max-w-3xl">
        <button
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
          onClick={onClose}
        >
          ✖
        </button>
        <h2 className="text-2xl font-bold mb-4 text-center">Coin Toss</h2>
        <div className="flex items-center justify-between w-full mb-4">
          { (game.creator_choice || "").toLowerCase() === "heads" ? (
            <>
              <div className="text-red-500 font-semibold text-center w-1/3">
                <p>Creator (Heads)</p>
                <p>{game.creator_email}</p>
              </div>
              <div className="w-1/3 flex justify-center">
                {content}
              </div>
              <div className="text-blue-500 font-semibold text-center w-1/3">
                <p>Opponent (Tails)</p>
                <p>{game.opponent_email || "???"}</p>
              </div>
            </>
          ) : (
            <>
              <div className="text-red-500 font-semibold text-center w-1/3">
                <p>Opponent (Heads)</p>
                <p>{game.opponent_email || "???"}</p>
              </div>
              <div className="w-1/3 flex justify-center">
                {content}
              </div>
              <div className="text-blue-500 font-semibold text-center w-1/3">
                <p>Creator (Tails)</p>
                <p>{game.creator_email}</p>
              </div>
            </>
          )}
        </div>

        {phase === "result" && (
          <p className="mt-6 text-xl font-bold text-green-500 text-center">
            [WINNER]  Winner: {winnerEmail || "Unknown"}
          </p>
        )}
        <button
          onClick={onClose}
          className="mt-4 w-full py-2 bg-green-500 hover:bg-green-600 rounded font-bold"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default WatchGameModal;
