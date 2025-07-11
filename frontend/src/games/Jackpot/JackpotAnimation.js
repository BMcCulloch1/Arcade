import React, { useEffect, useRef, useCallback, useMemo } from "react";
import { shuffleWithSeed } from "../../utils/shuffleWithSeed";


const CARD_WIDTH = 80;
const CONTAINER_WIDTH = 400;
const TAPE_LENGTH = 100;

// Easing for smooth deceleration
const easeOut = (t) => 1 - Math.pow(1 - t, 5);

const JackpotAnimation = ({
  players,
  winnerId,
  startAnimation,
  onAnimationEnd,
  animationStartTimeFromServer,
  tapeRef,
  seed
}) => {
  const containerRef = useRef(null);
  const animFrameRef = useRef(null);
  const hasRenderedRef = useRef(false);
  const localOffsetRef = useRef(0);

  // Stabilize the server start time
  const startTime = useMemo(
    () => new Date(animationStartTimeFromServer).getTime(),
    [animationStartTimeFromServer]
  );

  // Finish callback
  const finish = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    setTimeout(onAnimationEnd, 500);
  }, [onAnimationEnd]);

  // ── BUILD & RENDER TAPE ───────────────────────────────────────────────
  useEffect(() => {
    // whenever we start a new run, allow rebuild
    hasRenderedRef.current = false;
  }, [startAnimation]);

  useEffect(() => {
    if (!tapeRef.current || !players?.length || hasRenderedRef.current) return;

    // 1) Build weighted pool
    const total = players.reduce((sum, p) => sum + Number(p.wager_amount), 0);
    let pool = [];
    players.forEach((p) => {
      const slots = Math.max(Math.round((p.wager_amount / total) * 100), 1);
      for (let i = 0; i < slots; i++) pool.push(p);
    });

    if (!seed) {
      console.error("[ERROR] Missing seed from server — cannot shuffle deterministically!");
      return;
    }

    //Shuffle using server seed
    shuffleWithSeed(pool, seed);


    // 3) Tile to exactly TAPE_LENGTH
    let tape = [];
    while (tape.length < TAPE_LENGTH) tape = tape.concat(pool);
    tape = tape.slice(0, TAPE_LENGTH);

    // 4) Compute offset so winner lands in center
    const winIdx = tape.findIndex((p) => String(p.user_id) === String(winnerId));
    const centerCorrection = CONTAINER_WIDTH / 2 - CARD_WIDTH / 2;
    localOffsetRef.current = winIdx * CARD_WIDTH - centerCorrection;

    // 5) Render DOM
    tapeRef.current.innerHTML = "";
    tape.forEach((p) => {
      const div = document.createElement("div");
      Object.assign(div.style, {
        display: "inline-block",
        width: `${CARD_WIDTH}px`,
        height: `${CARD_WIDTH}px`,
        lineHeight: `${CARD_WIDTH}px`,
        textAlign: "center",
        borderRadius: "50%",
        marginRight: "5px",
        backgroundColor: p.avatar_color || "#ccc",
        color: "#fff",
        fontWeight: "bold",
        flexShrink: 0,
        minWidth: `${CARD_WIDTH}px`,
      });
      div.textContent = p.avatar_initials || p.email[0].toUpperCase();
      if (String(p.user_id) === String(winnerId)) {
        div.style.border = "3px solid gold";
      }
      tapeRef.current.appendChild(div);
    });

    hasRenderedRef.current = true;
  }, [players, winnerId, tapeRef, startAnimation]);
  // ────────────────────────────────────────────────────────────────────────

  // ── ANIMATION EFFECT ─────────────────────────────────────────────────
  useEffect(() => {
    if (!startAnimation) return;
    // rebuild guard already reset above
    const duration = 8000;
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const t = Math.max(0, Math.min(elapsed / duration, 1));
      const offset = localOffsetRef.current * easeOut(t);
      tapeRef.current.style.transform = `translateX(-${offset}px)`;
      if (t < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        finish();
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [startAnimation, startTime, finish]);
  // ────────────────────────────────────────────────────────────────────────

  return (
    <div
      ref={containerRef}
      style={{
        width: CONTAINER_WIDTH,
        height: 150,
        overflow: "hidden",
        margin: "0 auto",
        border: "2px solid white",
        borderRadius: 10,
        background: "#222",
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Center indicator */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: 0,
          bottom: 0,
          width: 4,
          backgroundColor: "#fff",
          transform: "translateX(-50%)",
          zIndex: 10,
        }}
      />
      {/* The tape */}
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
