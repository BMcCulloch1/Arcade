import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { fetchWithAuth } from "../utils/api";

function Home() {
  const [userData, setUserData] = useState(null);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const data = await fetchWithAuth(`${process.env.REACT_APP_BACKEND_URL}/api/auth/home`);
        setUserData(data);
      } catch (err) {
        console.error("Error fetching user data:", err);
        setError("Failed to load user data. Please try again.");
      }
    };

    fetchUserData();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    navigate("/login");
  };

  if (error) {
    return (
      <div className="text-center text-red-500">
        <h1 className="text-2xl font-bold">Error</h1>
        <p>{error}</p>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="text-center">
        <h1 className="text-4xl font-bold">Loading...</h1>
        <p className="mt-4 text-lg">Fetching user information...</p>
      </div>
    );
  }

  return (
    <div className="text-center">
      <h1 className="text-4xl font-bold">Welcome to CoinToss, {userData.name}!</h1>
      <p className="mt-4 text-lg">Your email: {userData.email}</p>
      <p className="mt-2">Choose a game to play from the menu.</p>
    </div>
  );
}

export default Home;
