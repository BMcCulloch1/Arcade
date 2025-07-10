import axios from "axios";

const API_URL = "http://localhost:5000/api/time";

export const fetchServerTime = async () => {
  try {
    const { data } = await axios.get(API_URL);
    return data.serverTime; // Time in milliseconds
  } catch (error) {
    console.error("❌ Error fetching server time:", error);
    return Date.now(); // Fallback to local time
  }
};
