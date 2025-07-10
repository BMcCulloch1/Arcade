import React from "react";
import { NavLink } from "react-router-dom";

function Navigation() {
  return (
    <nav
      className="bg-gradient-to-r from-blue-900 to-black p-4 shadow-lg"
      
    >
      <div className="flex justify-between items-center max-w-6xl mx-auto">
        {/* Logo / Title */}
        <h1 className="text-3xl font-extrabold neon-text text-neon-red">Rush</h1>

        {/* Navigation Links */}
        <div className="space-x-6">
          <NavLink
            to="/home"
            className={({ isActive }) =>
              isActive
                ? "text-neon-red font-semibold neon-glow"
                : "text-white hover:text-neon-red transition duration-300"
            }
          >
            Home
          </NavLink>
          <NavLink
            to="/coin-toss"
            className={({ isActive }) =>
              isActive
                ? "text-neon-red font-semibold neon-glow"
                : "text-white hover:text-neon-red transition duration-300"
            }
          >
            Coin Clash
          </NavLink>
          <NavLink
            to="/jack-pot"
            className={({ isActive }) =>
              isActive
                ? "text-neon-red font-semibold neon-glow"
                : "text-white hover:text-neon-red transition duration-300"
            }
          >
            Jackpot
          </NavLink>
          <NavLink
            to="/game-3"
            className={({ isActive }) =>
              isActive
                ? "text-neon-red font-semibold neon-glow"
                : "text-white hover:text-neon-red transition duration-300"
            }
          >
            Game 3
          </NavLink>
          <NavLink
            to="/game-4"
            className={({ isActive }) =>
              isActive
                ? "text-neon-red font-semibold neon-glow"
                : "text-white hover:text-neon-red transition duration-300"
            }
          >
            Game 4
          </NavLink>
          <NavLink
            to="/profile"
            className={({ isActive }) =>
              isActive
                ? "text-neon-red font-semibold neon-glow"
                : "text-white hover:text-neon-red transition duration-300"
            }
          >
            Profile
          </NavLink>
          <NavLink
            to="/"
            onClick={() => localStorage.removeItem("authToken")} 
            className="text-white hover:text-neon-red transition duration-300"
          >
            Logout
          </NavLink>
        </div>
      </div>
    </nav>
  );
}

export default Navigation;
