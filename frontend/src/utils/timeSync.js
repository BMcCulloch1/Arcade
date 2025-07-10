import axios from "../../utils/axios";

export const fetchServerTime = async () => {
  try {
    const { data } = await axios.get("/api/time");
    return data.serverTime; 
  } catch (error) {
    console.error("[ERROR] Error fetching server time:", error);
    return Date.now(); 
  }
};
