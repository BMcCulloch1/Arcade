import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../utils/axios";


function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState(""); 
  const [successMessage, setSuccessMessage] = useState(""); 
  const [isLoading, setIsLoading] = useState(false); 
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
  e.preventDefault();
  setError("");
  setSuccessMessage("");

  if (!email.trim() || !password.trim() || !confirmPassword.trim()) {
    setError("All fields are required.");
    return;
  }

  if (password !== confirmPassword) {
    setError("Passwords do not match.");
    return;
  }

  setIsLoading(true);

  try {
    const { data } = await axios.post("/api/auth/register", {
      email,
      password,
    });

    setSuccessMessage("Registration successful! You can now log in.");
    setEmail("");
    setPassword("");
    setConfirmPassword("");

    setTimeout(() => navigate("/login"), 2000);
  } catch (err) {
    console.error("Error during registration:", err);
    setError(
      err.response?.data?.message ||
      err.message ||
      "An error occurred. Please try again later."
    );
  } finally {
    setIsLoading(false);
  }
};


  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded shadow-md w-96"
      >
        <h2 className="text-xl  font-bold  mb-4 text-center text-blue-500">
          Register
        </h2>
        {error && (
          <p className="text-red-500 text-center mb-4" role="alert">
            {error}
          </p>
        )}
        {successMessage && (
          <p className="text-green-500 text-center mb-4" role="alert">
            {successMessage}
          </p>
        )}
        <div className="mb-4">
          <label htmlFor="email" className="block text-sm font-medium text-black">
            Email
          </label>
          <input
            type="email"
            id="email"
            className="w-full mt-1 p-2 border rounded text-black focus:outline-none focus:ring focus:ring-blue-300"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="mb-4">
          <label htmlFor="password" className="block text-sm font-medium text-black">
            Password
          </label>
          <input
            type="password"
            id="password"
            className="w-full mt-1 p-2 border rounded text-black focus:outline-none focus:ring focus:ring-blue-300"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <div className="mb-4">
          <label
            htmlFor="confirm-password"
            className="block text-sm font-medium text-black"
          >
            Confirm Password
          </label>
          <input
            type="password"
            id="confirm-password"
            className="w-full mt-1 p-2 border rounded text-black focus:outline-none focus:ring focus:ring-blue-300"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>
        <button
          type="submit"
          className={`w-full py-2 px-4 text-white font-semibold rounded-md shadow ${
            isLoading
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring focus:ring-blue-300"
          }`}
          disabled={isLoading}
        >
          {isLoading ? "Registering..." : "Register"}
        </button>
      </form>
    </div>
  );
}

export default Register;
