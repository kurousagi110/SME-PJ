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
import { useQueryClient } from "@tanstack/react-query";
import { useMyProfile } from "@/hooks/use-account";

export interface Notification {
  id: string;
  type:
    | "DCK_CREATED" | "DCK_APPROVED" | "DCK_REJECTED"
    | "DON_NHAP_CREATED" | "DON_NHAP_STATUS_UPDATED" | "DON_NHAP_DELETED"
    | "DON_SAN_XUAT_CREATED" | "DON_SAN_XUAT_STATUS_UPDATED" | "DON_SAN_XUAT_DELETED"
    | "DON_BAN_CREATED" | "DON_BAN_STATUS_UPDATED" | "DON_BAN_DELETED";
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
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const isLoggedIn = !!profile;

  useEffect(() => {
    console.log("🔥 Socket hook đã chạy Client-side!");

    if (!isLoggedIn) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      return;
    }

    console.log("Đang thử kết nối Socket (không truyền token thủ công)...");

    // Connect same-origin; nginx sẽ proxy /socket.io/ đến backend
    // Token được Backend tự đọc từ HttpOnly Cookie
    const socket = io("", {
      path: "/socket.io/",
      withCredentials: true,
    });

    socketRef.current = socket;

    socket.on("connect", () =>
      console.log("🟢 Socket CONNECTED với ID:", socket.id)
    );
    socket.on("connect_error", (err) =>
      console.error("🔴 Socket ERROR:", err)
    );
    socket.on("disconnect", (reason) =>
      console.log("⚫ Socket DISCONNECTED:", reason)
    );

    socket.on("notification", (data: Omit<Notification, "read">) => {
      console.log("Nhận được socket:", data);
      setNotifications((prev) => [
        { ...data, read: false },
        ...prev.slice(0, 19),
      ]);
      queryClient.invalidateQueries({ queryKey: ["dieu-chinh-kho"] });
      queryClient.invalidateQueries({ queryKey: ["san-pham"] });
      queryClient.invalidateQueries({ queryKey: ["nguyen-lieu"] });
      queryClient.invalidateQueries({ queryKey: ["don-nhap-hang"] });
      queryClient.invalidateQueries({ queryKey: ["don-san-xuat"] });
      queryClient.invalidateQueries({ queryKey: ["don-ban-hang"] });
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
