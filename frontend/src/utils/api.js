export const fetchWithAuth = async (url, options = {}) => {
  const token = localStorage.getItem("authToken");
  if (!token) {
    console.error("No token found in localStorage.");
    return Promise.reject(new Error("No token provided."));
  }

  const headers = {
    ...options.headers,
    Authorization: `Bearer ${token}`, // Ensure the token is prefixed with "Bearer"
  };

  const response = await fetch(url, { ...options, headers });
  return response.json();
};
