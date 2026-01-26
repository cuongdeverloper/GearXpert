import React, { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const tutorId = useSelector(state => state.user.account?.id);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!tutorId) return;
    const backendUrl = process.env.REACT_APP_BACKEND_URL
    const newSocket = io(backendUrl, {
      transports: ["websocket", "polling"],
      withCredentials: true,
    });
    newSocket.on("connect", () => {
      newSocket.emit("addUser", tutorId);
    });

    newSocket.on("getNotification", (notification) => {
      toast.info(notification.message);
    });

    newSocket.on("getMessage", (data) => {
      toast.info(`💬 Ai đó vừa nhắn tin cho bạn: "${data.text}"`, {
        autoClose: 4000,
      });
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [tutorId]);

  return (
    <SocketContext.Provider value={{ socket, connected: !!socket }}>
      {children}
    </SocketContext.Provider>
  );
};
