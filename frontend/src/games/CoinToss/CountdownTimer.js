// CountdownTimer.js
import React, { useEffect, useState } from "react";

const CountdownTimer = ({ duration, onComplete }) => {
  const [timeLeft, setTimeLeft] = useState(duration);

  useEffect(() => {
    // Set up a 1-second interval to count down.
    const intervalId = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalId);
          onComplete(); // Notify when countdown is complete.
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
