// src/App.js
import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Home from "./pages/Home";
import Profile from "./pages/Profile";
import CoinToss from "./games/CoinToss/CoinToss";
import Jackpot from "./games/Jackpot/Jackpot";
import Game3 from "./games/Game3/Game3";
import Game4 from "./games/Game4/Game4";
import ProtectedRoute from "./components/ProtectedRoute";
import Navigation from "./components/Navigation";
import { GamesProvider } from "./context/GamesContext";
import { SocketProvider } from "./context/SocketContext";

function App() {
  const location = useLocation();
  const noNavRoutes = ["/login", "/register"];

  return (
    <SocketProvider>
      <GamesProvider>
        <div>
          {!noNavRoutes.includes(location.pathname) && <Navigation />}
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/home"
              element={
                <ProtectedRoute>
                  <Home />
                </ProtectedRoute>
              }
            />
            <Route
              path="/coin-toss"
              element={
                <ProtectedRoute>
                  <CoinToss />
                </ProtectedRoute>
              }
            />
            <Route
              path="/jack-pot"
              element={
                <ProtectedRoute>
                  <Jackpot />
                </ProtectedRoute>
              }
            />
            <Route
              path="/game-3"
              element={
                <ProtectedRoute>
                  <Game3 />
                </ProtectedRoute>
              }
            />
            <Route
              path="/game-4"
              element={
                <ProtectedRoute>
                  <Game4 />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="*"
              element={
                <div className="text-center text-2xl text-red-500">
                  404 - Page Not Found
                </div>
              }
            />
          </Routes>
        </div>
      </GamesProvider>
    </SocketProvider>
  );
}

export default App;
