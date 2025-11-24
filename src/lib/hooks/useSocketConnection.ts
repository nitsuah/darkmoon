import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

type UseSocketOptions = {
  serverUrl?: string;
  ioOptions?: Record<string, unknown>;
  autoConnect?: boolean;
};

/**
 * Lightweight reusable socket connection hook.
 * - Creates a Socket.IO client instance on first use.
 * - Optionally delays connecting until `connect()` is called.
 */
export const useSocketConnection = (opts: UseSocketOptions = {}) => {
  const { serverUrl, ioOptions = {}, autoConnect = true } = opts;
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const createSocket = useCallback(() => {
    if (socketRef.current) return socketRef.current;

    const resolvedUrl =
      serverUrl ||
      (import.meta.env.VITE_SOCKET_SERVER_URL as string) ||
      window.location.origin;

    const socket = io(resolvedUrl, {
      transports: ["websocket"],
      ...ioOptions,
    });

    socketRef.current = socket;

    socket.on("connect", () => setIsConnected(true));
    socket.on("disconnect", () => setIsConnected(false));

    return socket;
  }, [serverUrl, ioOptions]);

  const connect = useCallback(() => {
    const socket = createSocket();
    // Only call connect if socket exists and isn't already connected
    if (socket && !socket.connected) socket.connect();
    return socket;
  }, [createSocket]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      try {
        socketRef.current.disconnect();
      } catch {
        // ignore
      }
      socketRef.current = null;
    }
    setIsConnected(false);
  }, []);

  useEffect(() => {
    if (autoConnect) {
      createSocket();
    }

    return () => {
      if (socketRef.current) {
        try {
          socketRef.current.removeAllListeners();
          socketRef.current.disconnect();
        } catch {
          // ignore during teardown
        }
      }
      socketRef.current = null;
    };
  }, [autoConnect, createSocket]);

  const getSocket = useCallback(() => socketRef.current, []);

  return {
    getSocket,
    isConnected,
    connect,
    disconnect,
  } as const;
};
