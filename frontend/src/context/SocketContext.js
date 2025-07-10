// src/context/SocketContext.js
import React, { createContext } from "react";
import { io } from "socket.io-client";

export const SocketContext = createContext();

const socket = io("http://localhost:5000", {
  transports: ["websocket"],
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

// Track joined rooms globally on the socket instance
socket.joinedRooms = new Set();

export const SocketProvider = ({ children }) => {
  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};
