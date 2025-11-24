import React from "react";
import GameManager, { type GameState } from "../../../components/GameManager";
import type { Socket } from "socket.io-client";
import CollisionSystem from "../../../components/CollisionSystem";
import { Canvas } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import SpacemanModel from "../../../components/SpacemanModel";
import { BotCharacter } from "../../../components/characters/BotCharacter";
import { PlayerCharacter } from "../../../components/characters/PlayerCharacter";
import type { PlayerCharacterHandle } from "../../../components/characters/PlayerCharacter";
import type { BotConfig as BotAIConfig } from "../../../components/characters/useBotAI";

type RockPosition = { x: number; z: number; size: number; height: number };

type JoystickMove = { x: number; y: number };

type QualitySettings = {
  shadows: boolean;
  pixelRatio: number | [number, number];
  antialias: boolean;
};

// Use the authoritative BotConfig from useBotAI; allow partial incoming configs
type BotConfig = Partial<BotAIConfig>;

const DEFAULT_BOT_CONFIG: BotAIConfig = {
  botSpeed: 1.5,
  sprintSpeed: 4,
  fleeSpeed: 1.2,
  tagCooldown: 2000,
  tagDistance: 1.2,
  pauseAfterTag: 1500,
  sprintDuration: 800,
  sprintCooldown: 2000,
  chaseRadius: 8,
  initialPosition: [0, 0.5, 0],
  label: "Bot",
};

type MouseControls = {
  mouseX?: number;
  mouseY?: number;
  leftClick?: boolean;
  rightClick?: boolean;
} | null;

type Props = {
  qualitySettings: QualitySettings;
  rockPositions: RockPosition[];
  playerCharacterRef: React.RefObject<PlayerCharacterHandle | null>;
  keysPressedRef: React.RefObject<Record<string, boolean>>;
  socketClient: Socket | null;
  mouseControls: MouseControls;
  clients: Record<
    string,
    { position: [number, number, number]; rotation: [number, number, number] }
  >;
  gameManager: GameManager | null;
  currentPlayerId: string;
  joystickMove: JoystickMove;
  lastWalkSoundTimeRef: React.RefObject<number>;
  isPaused: boolean;
  onPositionUpdate: (p: [number, number, number]) => void;
  playerIsIt: boolean;
  setPlayerIsIt: (v: boolean) => void;
  setBotIsIt?: (v: boolean) => void;
  setBot1GotTagged: (t: number) => void;
  setBot2GotTagged: (t: number) => void;
  setGameState: (s: GameState) => void;
  botDebugMode: boolean;
  bot1Position: [number, number, number];
  bot2Position: [number, number, number];
  handleBot1PositionUpdate: (p: [number, number, number]) => void;
  handleBot2PositionUpdate: (p: [number, number, number]) => void;
  collisionSystemRef: React.RefObject<CollisionSystem>;
  // handleTag unused in this scene; left in props previously for cross-page wiring
  // handleTag: (taggerId: string, taggedId: string, message: string) => void;
  bot1GotTagged: number;
  bot2GotTagged: number;
  BOT1_CONFIG: BotConfig;
  BOT2_CONFIG: BotConfig;
};

export const SoloScene: React.FC<Props> = ({
  qualitySettings,
  rockPositions,
  playerCharacterRef,
  keysPressedRef,
  socketClient,
  mouseControls,
  clients,
  gameManager,
  currentPlayerId,
  joystickMove,
  lastWalkSoundTimeRef,
  isPaused,
  onPositionUpdate,
  playerIsIt,
  setPlayerIsIt,
  setBotIsIt,
  setBot1GotTagged,
  setBot2GotTagged,
  setGameState,
  botDebugMode,
  bot1Position,
  bot2Position,
  handleBot1PositionUpdate,
  handleBot2PositionUpdate,
  collisionSystemRef,
  bot1GotTagged,
  bot2GotTagged,
  BOT1_CONFIG,
  BOT2_CONFIG,
}) => {
  const effectiveBot1Config = {
    ...DEFAULT_BOT_CONFIG,
    ...BOT1_CONFIG,
  } as BotAIConfig;
  const effectiveBot2Config = {
    ...DEFAULT_BOT_CONFIG,
    ...BOT2_CONFIG,
  } as BotAIConfig;
  // When running in a Node/test environment there is no DOM. Avoid rendering
  // react-three-fiber Canvas and Three.js components which depend on browser
  // globals (document/window). Tests can still exercise non-3D logic.
  if (typeof document === "undefined") {
    return null;
  }
  return (
    <Canvas
      shadows={qualitySettings.shadows}
      camera={{ position: [0, 5, 10], fov: 60 }}
      dpr={qualitySettings.pixelRatio}
      gl={{ antialias: qualitySettings.antialias }}
    >
      <ambientLight intensity={0.3} />
      <directionalLight
        position={[10, 10, 5]}
        intensity={1}
        castShadow={qualitySettings.shadows}
      />

      <gridHelper args={[100, 100]} />

      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#888888" />
      </mesh>

      {rockPositions.map((rock, i) => (
        <mesh
          key={`rock-${i}`}
          position={[rock.x, rock.height / 2, rock.z]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[rock.size, rock.height, rock.size]} />
          <meshStandardMaterial color="#666666" />
        </mesh>
      ))}

      <PlayerCharacter
        ref={playerCharacterRef}
        keysPressedRef={keysPressedRef}
        socketClient={socketClient}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mouseControls={mouseControls as any}
        clients={clients}
        gameManager={gameManager}
        currentPlayerId={currentPlayerId}
        joystickMove={joystickMove}
        joystickCamera={{ x: 0, y: 0 }}
        lastWalkSoundTimeRef={lastWalkSoundTimeRef}
        isPaused={isPaused}
        onPositionUpdate={onPositionUpdate}
        playerIsIt={playerIsIt}
        setPlayerIsIt={setPlayerIsIt}
        setBotIsIt={setBotIsIt}
        setBot1GotTagged={setBot1GotTagged}
        setBot2GotTagged={setBot2GotTagged}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setGameState={setGameState as any}
        showHitboxes={false}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mobileJetpackTrigger={{ current: false } as any}
        onTagSuccess={() => {}}
      />

      <BotCharacter
        targetPosition={botDebugMode ? bot2Position : [0, 0.5, 0]}
        isIt={false}
        targetIsIt={false}
        isPaused={isPaused}
        onTagTarget={() => {}}
        onPositionUpdate={handleBot1PositionUpdate}
        // Minimal temporary gameState used for scene rendering in tests.
        // Intentionally narrow and will be typed properly in follow-up (L7-style justification).
        gameState={
          {
            mode: "none",
            isActive: false,
            timeRemaining: 0,
            scores: {},
          } as unknown as GameState
        }
        collisionSystem={collisionSystemRef}
        gotTaggedTimestamp={bot1GotTagged}
        config={effectiveBot1Config}
        color="#ff8888"
      />

      {botDebugMode && (
        <BotCharacter
          targetPosition={bot1Position}
          isIt={false}
          targetIsIt={false}
          isPaused={isPaused}
          onTagTarget={() => {}}
          onPositionUpdate={handleBot2PositionUpdate}
          // Minimal test gameState; cast to GameState until full typing is propagated.
          gameState={
            {
              mode: "none",
              isActive: false,
              timeRemaining: 0,
              scores: {},
            } as unknown as GameState
          }
          collisionSystem={collisionSystemRef}
          gotTaggedTimestamp={bot2GotTagged}
          config={effectiveBot2Config}
          color="#88ff88"
          labelColor="#00ff00"
        />
      )}

      {Object.entries(clients)
        .filter(([id]) => id !== "bot-1" && id !== "bot-2")
        .map(([id, client]) => {
          const player = gameManager?.getPlayers().get(id as string);
          const isIt = player?.isIt || false;

          return (
            <group key={id} position={client.position}>
              <SpacemanModel color={isIt ? "#ff4444" : "#4a90e2"} isIt={isIt} />
              <Text
                position={[0, 2, 0]}
                fontSize={0.3}
                color="white"
                anchorX="center"
                anchorY="middle"
              >
                {player?.name || (id as string).slice(-4)}
              </Text>
            </group>
          );
        })}
    </Canvas>
  );
};

export default SoloScene;
