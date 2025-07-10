/**
 * CountdownTimer.js
 *
 * A simple countdown component.
 * - Starts from given duration
 * - Updates every second
 * - Calls onComplete() when time runs out
 */
import React, { useEffect, useState } from "react";

const CountdownTimer = ({ duration, onComplete }) => {
  const [timeLeft, setTimeLeft] = useState(duration);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalId);
          onComplete(); 
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [duration, onComplete]);

  return <div>The game begins in {timeLeft}...</div>;
};

export default CountdownTimer;
