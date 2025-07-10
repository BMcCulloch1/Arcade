import axios from "axios";

const API_URL = "http://localhost:5000/api/time";

export const fetchServerTime = async () => {
  try {
    const { data } = await axios.get(API_URL);
    return data.serverTime; 
  } catch (error) {
    console.error("[ERROR] Error fetching server time:", error);
    return Date.now(); 
  }
};
