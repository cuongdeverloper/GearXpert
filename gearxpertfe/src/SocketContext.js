import React, { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { useSelector, useDispatch } from "react-redux";
import { toast } from "react-toastify";
import { setSocketConnection } from "./redux/action/userAction";

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const tutorId = useSelector(state => state.user.account?.id);
  const [socket, setSocket] = useState(null);
  const dispatch = useDispatch();

  useEffect(() => {
    if (!tutorId) return;

    const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:1357";
    console.log("[SOCKET] Attempting connection to:", backendUrl);

    const newSocket = io(backendUrl, {
      transports: ["websocket", "polling"],
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    newSocket.on("connect", () => {
      console.log("[SOCKET] Connected successfully! ID:", newSocket.id);
      newSocket.emit("addUser", tutorId);
      dispatch(setSocketConnection(newSocket));
    });

    newSocket.on("connect_error", (error) => {
      console.error("[SOCKET] Connection error:", error.message);
    });

    newSocket.on("error", (err) => {
      console.error("[SOCKET] Socket error:", err);
    });

    newSocket.on("disconnect", (reason) => {
      console.log("[SOCKET] Disconnected:", reason);
      dispatch(setSocketConnection(null));
    });

    newSocket.on("getMessage", (data) => {
      toast.info(`💬 Ai đó vừa nhắn tin cho bạn: "${data.text}"`, {
        autoClose: 4000,
      });
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
      dispatch(setSocketConnection(null));
    };
  }, [tutorId, dispatch]);

  return (
    <SocketContext.Provider value={{ socket, connected: !!socket }}>
      {children}
    </SocketContext.Provider>
  );
};