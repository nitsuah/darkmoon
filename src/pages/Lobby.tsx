import * as React from "react";
import { useState, useEffect, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Text, Stats } from "@react-three/drei";
import { MeshNormalMaterial, BoxGeometry } from "three";
import { io } from "socket.io-client";
import type { Socket } from "socket.io-client";
import type { Clients } from "../types/socket";
import Footer from "../components/Footer";
import {
  clearSession,
  discoverWallets,
  getServerUrl,
  loadSession,
  signInWithWallet,
  type WalletOption,
  type WalletSession,
} from "../lib/wallet/walletAuth";
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

interface WalletGateProps {
  wallets: WalletOption[] | null;
  error: string | null;
  signingIn: boolean;
  onSignIn: (wallet: WalletOption) => void;
}

// Shown until the player has signed in with a wallet. Multiplayer needs a
// session token; the server refuses sockets without one.
const WalletGate: React.FC<WalletGateProps> = ({
  wallets,
  error,
  signingIn,
  onSignIn,
}) => (
  <div className="App">
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "12px",
        padding: "40px 16px",
      }}
    >
      <h2>Sign in with a wallet to play multiplayer</h2>
      <p>Solo play does not need a wallet.</p>
      {wallets === null && <p>Looking for wallets…</p>}
      {wallets?.length === 0 && (
        <p>No wallet found. Install a browser wallet and reload this page.</p>
      )}
      {wallets?.map((wallet) => (
        <button
          key={wallet.info.uuid}
          type="button"
          disabled={signingIn}
          onClick={() => onSignIn(wallet)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 20px",
            borderRadius: "12px",
            border: 0,
            cursor: "pointer",
            fontSize: "16px",
          }}
        >
          {wallet.info.icon && (
            <img src={wallet.info.icon} alt="" width={24} height={24} />
          )}
          {wallet.info.name}
        </button>
      ))}
      {error && <p role="alert">{error}</p>}
    </div>
    <Footer />
  </div>
);

const Lobby: React.FC = () => {
  const [session, setSession] = useState<WalletSession | null>(() =>
    loadSession(),
  );
  const [socketClient, setSocketClient] = useState<Socket | null>(null);
  const [clients, setClients] = useState<Clients>({});
  const [wallets, setWallets] = useState<WalletOption[] | null>(null);
  const [signInError, setSignInError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  // Without a session, list the injected wallets for the sign-in gate.
  useEffect(() => {
    if (session) return;
    let active = true;
    discoverWallets().then((found) => {
      if (active) setWallets(found);
    });
    return () => {
      active = false;
    };
  }, [session]);

  // Open the multiplayer socket only with a session token.
  useEffect(() => {
    if (!session) return;
    const socket = io(getServerUrl(), {
      transports: ["websocket"],
      auth: { token: session.token },
    });
    socket.on("connect_error", (err: Error) => {
      if (err.message === "wallet_auth_required") {
        clearSession();
        setSession(null);
        setSignInError("Your wallet session expired. Please sign in again.");
      }
    });
    setSocketClient(socket);
    // Dispose gracefully
    return () => {
      socket.disconnect();
      setSocketClient(null);
    };
  }, [session]);

  useEffect(() => {
    if (socketClient) {
      socketClient.on("move", (clients: Clients) => {
        setClients(clients);
      });
    }
  }, [socketClient]);

  const handleSignIn = async (wallet: WalletOption) => {
    setSignInError(null);
    setSigningIn(true);
    try {
      setSession(await signInWithWallet(wallet));
    } catch (err) {
      setSignInError(err instanceof Error ? err.message : "Sign-in failed.");
    } finally {
      setSigningIn(false);
    }
  };

  if (!session) {
    return (
      <WalletGate
        wallets={wallets}
        error={signInError}
        signingIn={signingIn}
        onSignIn={handleSignIn}
      />
    );
  }

  if (!socketClient) return null;

  return (
    <div className="App">
      <Canvas camera={{ position: [0, 1, -5], near: 0.1, far: 1000 }}>
        <Stats />
        {socketClient && <ControlsWrapper socket={socketClient} />}
        <gridHelper rotation={[0, 0, 0]} />
        {Object.keys(clients)
          .filter((clientKey) => clientKey !== socketClient.id)
          .map((client) => {
            const { position, rotation } = clients[client];
            return (
              <UserWrapper
                key={client}
                id={client}
                position={position}
                rotation={rotation}
              />
            );
          })}
      </Canvas>
      <Footer />
    </div>
  );
};

export default Lobby;
