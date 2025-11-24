/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React from "react";
import GameManager, {
  type GameState,
  type Player,
} from "../../../components/GameManager";
import CollisionSystem from "../../../components/CollisionSystem";
import { Canvas } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import SpacemanModel from "../../../components/SpacemanModel";
import { BotCharacter } from "../../../components/characters/BotCharacter";
import { PlayerCharacter } from "../../../components/characters/PlayerCharacter";

type Props = {
  qualitySettings: any;
  rockPositions: Array<{ x: number; z: number; size: number; height: number }>;
  playerCharacterRef: any;
  keysPressedRef: any;
  socketClient: any;
  mouseControls: any;
  clients: Record<string, any>;
  gameManager: any;
  currentPlayerId: string;
  joystickMove: { x: number; y: number };
  lastWalkSoundTimeRef: any;
  isPaused: boolean;
  onPositionUpdate: (p: [number, number, number]) => void;
  playerIsIt: boolean;
  setPlayerIsIt: (v: boolean) => void;
  setBotIsIt?: (v: boolean) => void;
  setBot1GotTagged: (t: number) => void;
  setBot2GotTagged: (t: number) => void;
  setGameState: (s: any) => void;
  botDebugMode: boolean;
  bot1Position: [number, number, number];
  bot2Position: [number, number, number];
  handleBot1PositionUpdate: (p: [number, number, number]) => void;
  handleBot2PositionUpdate: (p: [number, number, number]) => void;
  collisionSystemRef: any;
  handleTag: (...args: any[]) => void;
  bot1GotTagged: number;
  bot2GotTagged: number;
  BOT1_CONFIG: any;
  BOT2_CONFIG: any;
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
  handleTag,
  bot1GotTagged,
  bot2GotTagged,
  BOT1_CONFIG,
  BOT2_CONFIG,
}) => {
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
        mouseControls={mouseControls}
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
        setGameState={setGameState}
        showHitboxes={false}
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
        gameState={
          { mode: "none", isActive: false, timeRemaining: 0, scores: {} } as any
        }
        collisionSystem={collisionSystemRef}
        gotTaggedTimestamp={bot1GotTagged}
        config={BOT1_CONFIG}
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
          gameState={
            {
              mode: "none",
              isActive: false,
              timeRemaining: 0,
              scores: {},
            } as any
          }
          collisionSystem={collisionSystemRef}
          gotTaggedTimestamp={bot2GotTagged}
          config={BOT2_CONFIG}
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
