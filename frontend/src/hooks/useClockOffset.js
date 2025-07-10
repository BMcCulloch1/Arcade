import { useState, useEffect } from "react";
import axios from "../utils/axios";

const useClockOffset = () => {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    axios.get("/api/time")
      .then((response) => {
        const serverTime = response.data.serverTime;
        const clientTime = Date.now();
        // Calculate the offset as serverTime - clientTime.
        const newOffset = serverTime - clientTime;
        setOffset(newOffset);
      })
      .catch((err) => {
        console.error("Error syncing time:", err);
      });
  }, []);

  return offset;
};

export default useClockOffset;
