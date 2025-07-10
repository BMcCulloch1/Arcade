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

/**
 * Track joined rooms globally on this socket instance.
 * Useful for avoiding duplicate joins.
 */
socket.joinedRooms = new Set();

 /**
 * SocketProvider
 * Wraps child components and supplies the shared socket instance.
 */
export const SocketProvider = ({ children }) => {
  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};
