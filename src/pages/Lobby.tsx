import * as React from "react";
import { useState, useEffect, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Text, Stats } from "@react-three/drei";
import { MeshNormalMaterial, BoxGeometry } from "three";
import { io } from "socket.io-client";
import type { Socket } from "socket.io-client";
import type { Clients } from "../types/socket";
import Footer from "../components/Footer";
import "../styles/App.css";

interface ControlsWrapperProps {
  socket: Socket;
}

const ControlsWrapper = ({ socket }: ControlsWrapperProps) => {
  type ControlsRefAny = {
    object?: {
      position?: { toArray: (arr: number[]) => void };
      rotation?: { toArray: (arr: number[]) => void };
    };
    addEventListener?: (event: string, fn: (e: unknown) => void) => void;
    removeEventListener?: (event: string, fn: (e: unknown) => void) => void;
  } | null;

  const controlsRef = useRef<ControlsRefAny>(null);

  useEffect(() => {
    const onControlsChange = () => {
      const controls = controlsRef.current;
      if (!controls) return;
      // OrbitControls exposes a target and an object; we can pull camera position/rotation
      const camera = controls.object as {
        position: { toArray: (arr: number[]) => void };
        rotation: { toArray: (arr: number[]) => void };
      };
      const { position, rotation } = camera;
      const { id } = socket;
      const posArray: number[] = [];
      const rotArray: number[] = [];
      position.toArray(posArray);
      rotation.toArray(rotArray);
      socket.emit("move", {
        id,
        rotation: rotArray,
        position: posArray,
      });
    };
    const current = controlsRef.current;
    // OrbitControls proxies events via addEventListener on the controls instance
    if (current && typeof current.addEventListener === "function") {
      current.addEventListener("change", onControlsChange);
      return () => {
        if (typeof current.removeEventListener === "function") {
          current.removeEventListener("change", onControlsChange);
        }
      };
    }
    return () => {};
  }, [socket]);
  return (
    <OrbitControls
      ref={(instance) => {
        // Capture the underlying orbit controls instance into our narrow ref
        controlsRef.current = instance as ControlsRefAny;
      }}
    />
  );
};

interface UserWrapperProps {
  position: [number, number, number];
  rotation: [number, number, number];
  id: string;
}
const UserWrapper: React.FC<UserWrapperProps> = ({
  position,
  rotation,
  id,
}) => {
  return (
    <mesh
      position={position}
      rotation={rotation}
      geometry={new BoxGeometry()}
      material={new MeshNormalMaterial()}
    >
      {/* Optionally show the ID above the user's mesh */}
      <Text
        position={[0, 1.0, 0]}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        {id}
      </Text>
    </mesh>
  );
};

const Lobby: React.FC = () => {
  const [socketClient, setSocketClient] = useState<Socket | null>(null);
  const [clients, setClients] = useState<Clients>({});

  useEffect(() => {
    // On mount initialize the socket connection
    const serverUrl =
      import.meta.env.VITE_SOCKET_SERVER_URL || window.location.origin;
    const socket = io(serverUrl, { transports: ["websocket"] });
    setSocketClient(socket);
    // Dispose gracefully
    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (socketClient) {
      socketClient.on("move", (clients: Clients) => {
        setClients(clients);
      });
    }
  }, [socketClient]);

  if (!socketClient) return null;

  return React.createElement(
    React.Fragment,
    null,
    React.createElement(
      "div",
      { className: "App" },
      React.createElement(
        Canvas,
        { camera: { position: [0, 1, -5], near: 0.1, far: 1000 } },
        React.createElement(Stats, null),
        React.createElement(ControlsWrapper, { socket: socketClient }),
        React.createElement("gridHelper", { rotation: [0, 0, 0] }),
        Object.keys(clients)
          .filter((clientKey) => clientKey !== socketClient.id)
          .map((client) => {
            const { position, rotation } = clients[client];
            return React.createElement(UserWrapper, {
              key: client,
              id: client,
              position: position,
              rotation: rotation,
            });
          })
      ),
      React.createElement(Footer, null)
    )
  );
};

export default Lobby;
