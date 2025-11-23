import { useState, useCallback } from "react";

export interface Notification {
  id: string;
  message: string;
  type: "success" | "info" | "warning" | "error";
  timestamp: number;
}

/**
 * Hook for managing in-game notifications
 * Auto-removes notifications after 4 seconds
 */
export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback(
    (message: string, type: Notification["type"] = "info") => {
      const notification: Notification = {
        id: `${Date.now()}-${Math.random()}`,
        message,
        type,
        timestamp: Date.now(),
      };
      setNotifications((prev) => [...prev, notification]);

      // Auto-remove after 4 seconds
      setTimeout(() => {
        setNotifications((prev) =>
          prev.filter((n) => n.id !== notification.id)
        );
      }, 4000);
    },
    []
  );

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  return {
    notifications,
    addNotification,
    removeNotification,
  };
};
