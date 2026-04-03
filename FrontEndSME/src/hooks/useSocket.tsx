"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from "react";
import { io, Socket } from "socket.io-client";
import { useMyProfile } from "@/hooks/use-account";

export interface Notification {
  id: string;
  type: "DCK_CREATED" | "DCK_APPROVED" | "DCK_REJECTED";
  message: string;
  data?: any;
  createdAt: string;
  read: boolean;
}

interface SocketContextValue {
  notifications: Notification[];
  unreadCount: number;
  markAllRead: () => void;
}

const SocketContext = createContext<SocketContextValue>({
  notifications: [],
  unreadCount: 0,
  markAllRead: () => {},
});

export function SocketProvider({ children }: { children: ReactNode }) {
  const { data: profile } = useMyProfile();
  const socketRef = useRef<Socket | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const isLoggedIn = !!profile;

  useEffect(() => {
    if (!isLoggedIn) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      return;
    }

    // Connect same-origin; nginx sẽ proxy /socket.io/ đến backend
    const socket = io("", {
      withCredentials: true,
      transports: ["websocket", "polling"],
      path: "/socket.io/",
    });

    socketRef.current = socket;

    socket.on("notification", (data: Omit<Notification, "read">) => {
      setNotifications((prev) => [
        { ...data, read: false },
        ...prev.slice(0, 19),
      ]);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isLoggedIn]);

  const markAllRead = () =>
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <SocketContext.Provider value={{ notifications, unreadCount, markAllRead }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
