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
    if (!isLoggedIn) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      return;
    }

    // Connect same-origin; nginx sẽ proxy /socket.io/ đến backend
    // Token được Backend tự đọc từ HttpOnly Cookie
    //
    // reconnection: socket.io-client handles transient network drops by
    //   re-attempting the handshake. Without this, a single Wi-Fi blip
    //   permanently disconnects the user until full reload.
    // reconnectionAttempts: cap so we don't hammer a down server forever.
    // randomizationFactor: spread retries to avoid thundering herd on
    //   backend recovery.
    const socket = io("", {
      path: "/socket.io/",
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      randomizationFactor: 0.5,
      timeout: 20000,
    });

    socketRef.current = socket;

    socket.on("connect_error", (err) => {
      // Luôn log lỗi kết nối — không chứa dữ liệu nhạy cảm.
      console.error("[socket] connect_error:", err.message);
    });

    socket.on("notification", (data: Omit<Notification, "read">) => {
      setNotifications((prev) => [
        { ...data, read: false },
        ...prev.slice(0, 19),
      ]);
      // Invalidate the actual query keys the consuming hooks subscribe to.
      // Previously this listed don-nhap-hang / don-san-xuat / don-ban-hang,
      // which no hook uses — the resulting notifications updated the badge
      // but the lists themselves never refetched.
      queryClient.invalidateQueries({ queryKey: ["dieu-chinh-kho"] });
      queryClient.invalidateQueries({ queryKey: ["material-catalog"] });
      queryClient.invalidateQueries({ queryKey: ["material-stock"] });
      queryClient.invalidateQueries({ queryKey: ["nguyen-lieu-stock-map"] });
      queryClient.invalidateQueries({ queryKey: ["product-catalog"] });
      queryClient.invalidateQueries({ queryKey: ["product-stock"] });
      queryClient.invalidateQueries({ queryKey: ["purchase-receipts"] });
      queryClient.invalidateQueries({ queryKey: ["prod-receipts"] });
      queryClient.invalidateQueries({ queryKey: ["production-orders"] });
      queryClient.invalidateQueries({ queryKey: ["order-sale"] });
      queryClient.invalidateQueries({ queryKey: ["dash-chart"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-table"] });
      queryClient.invalidateQueries({ queryKey: ["audit-log"] });
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
