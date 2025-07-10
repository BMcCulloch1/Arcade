import axios from "axios";

const API_URL = "http://localhost:5000/api";

const instance = axios.create({
  baseURL: API_URL,
});

// Attach token to every request if available
instance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("authToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor to handle 401 errors
instance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      console.error("⚠️ JWT expired or unauthorized. Logging out...");
      localStorage.removeItem("authToken");
      window.location.href = "/login"; // Redirect to login
    }
    return Promise.reject(error);
  }
);

export default instance;
