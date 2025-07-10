import React, { useEffect, useRef, useCallback, useMemo } from "react";

const CARD_WIDTH = 80;
const CONTAINER_WIDTH = 400;
const TAPE_LENGTH = 100;

// Easing function for smooth deceleration
const easeOut = (t) => 1 - Math.pow(1 - t, 5); 

/**
 * JackpotAnimation
 * Handles rendering and animating the scrolling tape of player avatars.
 */
const JackpotAnimation = ({ 
  players, 
  winnerId, 
  startAnimation, 
  onAnimationEnd, 
  animationStartTimeFromServer, 
  serverTargetOffset 
}) => {
  const containerRef = useRef(null);
  const tapeRef = useRef(null);
  const animationFrameIdRef = useRef(null);
  const isAnimationRunningRef = useRef(false);
  const lastAnimationStartTime = useRef(null);
  const hasRenderedTapeRef = useRef(false); 

  // Stabilize values so they don’t change mid-animation.
  const stableAnimationStartTime = useMemo(() => animationStartTimeFromServer, [animationStartTimeFromServer]);
  const stableTargetOffset = useMemo(() => serverTargetOffset, [serverTargetOffset]);

  /** 
   * Call this when animation completes 
   */
  const handleAnimationEnd = useCallback(() => {
    isAnimationRunningRef.current = false;
    setTimeout(() => {
      if (onAnimationEnd) onAnimationEnd();
    }, 500);
  }, [onAnimationEnd]);

/**
   * Renders the full tape of player avatars once.
   */
    useEffect(() => {
    if (!tapeRef.current || !players || players.length === 0) {
      console.error("[ERROR] Tape is missing or players are empty!");
      return;
    }
    if (hasRenderedTapeRef.current) return;
    
    tapeRef.current.innerHTML = ""; // Clear previous tape elements

    // Repeat players to fill tape
    const tapePlayers = [];
    for (let i = 0; i < TAPE_LENGTH; i++) {
      // Cycle through players
      const player = players[i % players.length];
      tapePlayers.push(player);
    }

    
    tapePlayers.forEach((player) => {
      const item = document.createElement("div");
      item.style.display = "inline-block";
      item.style.width = `${CARD_WIDTH}px`;
      item.style.height = `${CARD_WIDTH}px`;
      item.style.lineHeight = `${CARD_WIDTH}px`;
      item.style.textAlign = "center";
      item.style.borderRadius = "50%";
      item.style.marginRight = "5px";
      item.style.backgroundColor = player.avatar_color || "#ccc";
      item.style.color = "#fff";
      item.style.fontWeight = "bold";
      item.style.flexShrink = "0";
      item.style.minWidth = `${CARD_WIDTH}px`;
      item.innerText = player.avatar_initials || (player.email ? player.email[0].toUpperCase() : "?");

      // Highlight the winning entry
      if (String(player.user_id) === String(winnerId)) {
        item.style.border = "3px solid gold";
      }

      tapeRef.current.appendChild(item);
    });

    hasRenderedTapeRef.current = true;
  }, [players]);

  /**
   * Runs the animation when startAnimation is true.
   */
  useEffect(() => {
    if (!startAnimation) return;
  
    // Reset the tape render flag so the tape re-renders on each animation run.
    hasRenderedTapeRef.current = false;

    const animationStart = stableAnimationStartTime;
    const targetOffset = stableTargetOffset;
    isAnimationRunningRef.current = true;

    const totalDuration = 8000; // total duration in ms (8 seconds)

    const animate = () => {
      const now = Date.now();
      const elapsed = now - animationStart;
      // Clamp elapsed time between 0 and totalDuration
      const t = Math.min(elapsed / totalDuration, 1);
      // Compute current offset using a single easing function
      const currentOffset = targetOffset * easeOut(t);

      if (tapeRef.current) {
        tapeRef.current.style.transform = `translateX(-${currentOffset}px)`;
      }

      if (t < 1) {
        animationFrameIdRef.current = requestAnimationFrame(animate);
      } else {
        handleAnimationEnd();
        isAnimationRunningRef.current = false;
      }
  };

  animationFrameIdRef.current = requestAnimationFrame(animate);

  return () => {
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
    }
  };
}, [startAnimation, stableAnimationStartTime, stableTargetOffset]);

  /**
   * Render UI
   */
  return (
    <div
      ref={containerRef}
      style={{
        width: `${CONTAINER_WIDTH}px`,
        height: "150px",
        overflow: "hidden",
        margin: "0 auto",
        border: "2px solid white",
        padding: "10px",
        borderRadius: "10px",
        background: "#222",
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Center Indicator Line */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "0",
          bottom: "0",
          width: "4px",
          backgroundColor: "#fff",
          transform: "translateX(-50%)",
          zIndex: 10,
        }}
      />
      {/* Tape */}
      <div
        ref={tapeRef}
        style={{
          display: "flex",
          whiteSpace: "nowrap",
          minWidth: "100%",
        }}
      />
    </div>
  );
};

export default JackpotAnimation;
