/**
 * CoinFlipAnimation Component
 *
 * Renders a 3D coin-flip animation using GSAP.
 * - Flips to show Heads or Tails result.
 * - Calls onFinish callback after animation completes.
 *
 * Props:
 * - result: "Heads" | "Tails" (which side the coin should land on)
 * - duration: total duration of animation (currently fixed internally)
 * - onFinish: function to call when animation completes
 */

import React, { useEffect, useRef } from "react";
import { gsap } from "gsap";
import "./CoinFlipAnimation.css";

const CoinFlipAnimation = ({ result, duration, onFinish }) => {
  const coinRef = useRef(null);

  useEffect(() => {
    if (!coinRef.current) return;

    // Reset coin to its initial state.
    coinRef.current.style.transition = "none";
    coinRef.current.style.transform = "rotateY(0deg) scale(1) translateZ(0px)";
    void coinRef.current.offsetWidth; // Force reflow

    // Create a GSAP timeline for the animation.
    const tl = gsap.timeline({ onComplete: onFinish });

    //Flick the coin (simulate by moving it along the z-axis).
    tl.to(coinRef.current, {
      z: 500,        
      duration: 1,
      ease: "power2.out",
    }, 0);

    //Rotate the coin over the entire duration.
    const rotations = 2;
    const resultOffset = result === "Heads" ? 0 : 180;
    /** Without extra offsets, 2*360 + 0 gives 720°, which is equivalent to 0° (showing Heads).
      For Tails, 2*360 + 180 gives 900° (equivalent to 180°).
     */
    const totalRotation = rotations * 360 + resultOffset;
    tl.to(coinRef.current, {
      rotationY: totalRotation,
      duration: 3,
      ease: "power2.inOut",
    }, 0);

    // Retrieve coin back onto the page (z:0) from 2s.
    tl.to(coinRef.current, {
      z: 0,
      duration: 1,
      ease: "power2.in",
    }, 2);

  }, [result, duration, onFinish]);

  return (
    <div className="coin-container">
      <div ref={coinRef} className="coin">
        <div className="coin-face coin-heads">Heads</div>
        <div className="coin-face coin-tails">Tails</div>
      </div>
    </div>
  );
};

export default CoinFlipAnimation;
