// frontend/src/hooks/useClockOffset.js
import { useState, useEffect } from "react";
import axios from "axios";

const useClockOffset = () => {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    axios.get("http://localhost:5000/api/time")
      .then((response) => {
        const serverTime = response.data.serverTime;
        const clientTime = Date.now();
        // Calculate the offset as serverTime - clientTime.
        const newOffset = serverTime - clientTime;
        setOffset(newOffset);
        console.log("Clock offset (ms):", newOffset);
      })
      .catch((err) => {
        console.error("Error syncing time:", err);
      });
  }, []);

  return offset;
};

export default useClockOffset;
