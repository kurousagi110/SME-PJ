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
import {
  fetchNotificationsAction,
  markAllNotificationsReadAction,
} from "@/app/actions/notification";

export interface Notification {
  id: string;
  type: string;
  message: string;
  data?: any;
  createdAt: string;
  read: boolean;
}

interface SocketContextValue {
  notifications: Notification[];
  unreadCount: number;
  markAllRead: () => void;
  refreshNotifications: () => void;
}

const SocketContext = createContext<SocketContextValue>({
  notifications: [],
  unreadCount: 0,
  markAllRead: () => {},
  refreshNotifications: () => {},
});

export function SocketProvider({ children }: { children: ReactNode }) {
  const { data: profile } = useMyProfile();
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const isLoggedIn = !!profile;

  // Load initial notifications from DB
  const loadNotifications = async () => {
    try {
      const res = await fetchNotificationsAction({ limit: 30 });
      if (res.success && res.data) {
        setNotifications(
          res.data.map((item: any) => ({
            id: String(item._id || item.ma_tb),
            type: item.loai || "SYSTEM_NOTIFICATION",
            message: item.noi_dung || item.tieu_de,
            data: item.du_lieu || item,
            createdAt: item.created_at || new Date().toISOString(),
            read: !!item.da_doc,
          }))
        );
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      loadNotifications();
    }
  }, [isLoggedIn]);

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

    socket.on("notification", (raw: any) => {
      if (!raw) return;

      const id = String(raw.id || raw._id || `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`);
      const type = String(raw.type || "SYSTEM_NOTIFICATION");
      const createdAt =
        raw.createdAt && !isNaN(new Date(raw.createdAt).getTime())
          ? raw.createdAt
          : new Date().toISOString();

      let message = raw.message;
      if (!message) {
        const user =
          raw.created_by?.ho_ten ||
          raw.created_by?.tai_khoan ||
          raw.updated_by?.ho_ten ||
          raw.updated_by?.tai_khoan ||
          "Người dùng";
        const code = raw.ma_dh || raw.ten_hang || (raw.id ? String(raw.id).slice(-6) : "");

        if (type.includes("SALE")) {
          message = `Đơn bán hàng ${code} có cập nhật từ ${user}`;
        } else if (type.includes("PURCHASE")) {
          message = `Đơn nhập mua ${code} có cập nhật từ ${user}`;
        } else if (type.includes("PROD_RECEIPT")) {
          message = `Phiếu nhập thành phẩm ${code} có cập nhật từ ${user}`;
        } else if (type.includes("DCK")) {
          message = `Phiếu điều chỉnh kho ${code} có thay đổi`;
        } else {
          message = `Thông báo mới từ hệ thống (${type})`;
        }
      }

      const item: Notification = {
        id,
        type,
        message,
        data: raw,
        createdAt,
        read: false,
      };

      setNotifications((prev) => [item, ...prev.slice(0, 19)]);

      // Selective query invalidation based on notification type
      if (type.includes("SALE")) {
        queryClient.invalidateQueries({ queryKey: ["order-sale"] });
        queryClient.invalidateQueries({ queryKey: ["dash-chart"] });
        queryClient.invalidateQueries({ queryKey: ["dashboard-table"] });
      } else if (type.includes("PURCHASE")) {
        queryClient.invalidateQueries({ queryKey: ["purchase-receipts"] });
        queryClient.invalidateQueries({ queryKey: ["material-stock"] });
        queryClient.invalidateQueries({ queryKey: ["product-stock"] });
      } else if (type.includes("PROD_RECEIPT") || type.includes("SX")) {
        queryClient.invalidateQueries({ queryKey: ["prod-receipts"] });
        queryClient.invalidateQueries({ queryKey: ["production-orders"] });
        queryClient.invalidateQueries({ queryKey: ["material-stock"] });
        queryClient.invalidateQueries({ queryKey: ["product-stock"] });
      } else if (type.includes("DCK")) {
        queryClient.invalidateQueries({ queryKey: ["dieu-chinh-kho"] });
        queryClient.invalidateQueries({ queryKey: ["material-stock"] });
        queryClient.invalidateQueries({ queryKey: ["product-stock"] });
      } else {
        queryClient.invalidateQueries({ queryKey: ["audit-log"] });
      }
      queryClient.invalidateQueries({ queryKey: ["pending-approvals"] });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isLoggedIn]);

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    markAllNotificationsReadAction().catch(() => {});
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <SocketContext.Provider
      value={{
        notifications,
        unreadCount,
        markAllRead,
        refreshNotifications: loadNotifications,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
