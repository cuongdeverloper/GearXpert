import React, { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { useSelector, useDispatch } from "react-redux";
import { setSocketConnection } from "./redux/action/userAction";
import { focusOrOpenChatWindow } from "./redux/reducer/chatWindowReducer";
import {
  playIncomingMessageSound,
  resumeIncomingMessageSound,
} from "./utils/incomingMessageSound";

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const account = useSelector((state) => state.user.account);
  const tutorId = account?.id || account?._id;
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const dispatch = useDispatch();

  useEffect(() => {
    if (!tutorId) return;

    const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:1357";

    const newSocket = io(backendUrl, {
      transports: ["websocket", "polling"],
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    newSocket.on("connect", () => {
      newSocket.emit("addUser", tutorId);
      dispatch(setSocketConnection(newSocket));
    });

    newSocket.on("getUsers", (users) => {
      setOnlineUsers(users);
    });

    newSocket.on("connect_error", (error) => {
      console.error("[SOCKET] Connection error:", error.message);
    });

    newSocket.on("error", (err) => {
      console.error("[SOCKET] Socket error:", err);
    });

    newSocket.on("disconnect", (reason) => {
      dispatch(setSocketConnection(null));
      setOnlineUsers([]);
    });

    newSocket.on("getMessage", (data) => {
      const myId = String(tutorId);
      if (!data?.conversationId) return;
      if (String(data.senderId) === myId) return;

      playIncomingMessageSound();

      const path = typeof window !== "undefined" ? window.location.pathname : "";
      const noMiniChat =
        path.startsWith("/messenger") ||
        path.startsWith("/admin") ||
        path.startsWith("/staff");
      if (noMiniChat) return;

      const conv = {
        _id: data.conversationId,
        members: [myId, String(data.senderId)],
        friendInfo: data.friendInfo || null,
      };
      dispatch(focusOrOpenChatWindow(conv));
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
      dispatch(setSocketConnection(null));
    };
  }, [tutorId, dispatch]);

  // Unlock Web Audio after first gesture (helps autoplay policy).
  useEffect(() => {
    if (!tutorId) return;
    const onFirstGesture = () => {
      resumeIncomingMessageSound();
    };
    document.addEventListener("click", onFirstGesture, { once: true });
    document.addEventListener("keydown", onFirstGesture, { once: true });
    return () => {
      document.removeEventListener("click", onFirstGesture);
      document.removeEventListener("keydown", onFirstGesture);
    };
  }, [tutorId]);

  return (
    <SocketContext.Provider value={{ socket, onlineUsers, connected: !!socket }}>
      {children}
    </SocketContext.Provider>
  );
};
