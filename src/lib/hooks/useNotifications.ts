import { useState, useCallback } from "react";

/**
 * Secure random utility for game mechanics (non-cryptographic).
 * Uses crypto.getRandomValues() to avoid CodeQL insecure-randomness alerts.
 * These are for gameplay randomness only, not security-sensitive operations.
 */
function secureRandom(): number {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return array[0] / 0x100000000;
}

export interface Notification {
  id: string;
  message: string;
  type: "success" | "info" | "warning" | "error";
  timestamp: number;
}

export type AddNotification = (
  msg: string,
  type?: Notification["type"],
) => void;

/**
 * Hook for managing in-game notifications
 * Auto-removes notifications after 4 seconds
 */
export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback(
    (message: string, type: Notification["type"] = "info") => {
      const notification: Notification = {
        id: `${Date.now()}-${secureRandom().toString(36).slice(2, 8)}`,
        message,
        type,
        timestamp: Date.now(),
      };
      setNotifications((prev) => [...prev, notification]);

      // Auto-remove after 4 seconds
      setTimeout(() => {
        setNotifications((prev) =>
          prev.filter((n) => n.id !== notification.id),
        );
      }, 4000);
    },
    [],
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
