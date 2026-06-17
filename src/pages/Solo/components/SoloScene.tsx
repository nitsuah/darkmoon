import React from "react";
import { Canvas } from "@react-three/fiber";
import Environment from "./Environment";
import Players from "./Players";
import Bots from "./Bots";
import WeaponPickups from "../../../components/world/WeaponPickups";
import HealthPickups from "../../../components/world/HealthPickups";
import ExplosionVFX from "../../../components/world/ExplosionVFX";
import DamageNumbers from "../../../components/world/DamageNumbers";
import type { SoloSceneProps } from "./SoloScene.types";

type Props = SoloSceneProps;

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
  gameState,
  setGameState,
  botDebugMode,
  playerPositionRef,
  bot1PositionRef,
  bot2PositionRef,
  handleBot1PositionUpdate,
  handleBot2PositionUpdate,
  handleBot3PositionUpdate,
  collisionSystemRef,
  bot1GotTagged,
  bot2GotTagged,
  bot3GotTagged,
  BOT1_CONFIG,
  BOT2_CONFIG,
  BOT3_CONFIG,
}) => {
  // SoloScene now delegates most 3D children to smaller components.
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
      <Environment
        qualitySettings={qualitySettings}
        rockPositions={rockPositions}
      />

      <Players
        ref={playerCharacterRef}
        keysPressedRef={keysPressedRef}
        socketClient={socketClient}
        mouseControls={mouseControls}
        clients={clients}
        gameManager={gameManager}
        currentPlayerId={currentPlayerId}
        joystickMove={joystickMove}
        lastWalkSoundTimeRef={lastWalkSoundTimeRef}
        isPaused={isPaused}
        onPositionUpdate={onPositionUpdate}
        playerIsIt={playerIsIt}
        setPlayerIsIt={setPlayerIsIt}
        setBotIsIt={setBotIsIt}
        setBot1GotTagged={setBot1GotTagged}
        setBot2GotTagged={setBot2GotTagged}
        setGameState={setGameState}
      />

      <Bots
        gameManager={gameManager}
        gameState={gameState}
        setBot1GotTagged={setBot1GotTagged}
        setBot2GotTagged={setBot2GotTagged}
        botDebugMode={botDebugMode}
        currentPlayerId={currentPlayerId}
        playerIsIt={playerIsIt}
        playerPositionRef={playerPositionRef}
        bot1PositionRef={bot1PositionRef}
        bot2PositionRef={bot2PositionRef}
        isPaused={isPaused}
        handleBot1PositionUpdate={handleBot1PositionUpdate}
        handleBot2PositionUpdate={handleBot2PositionUpdate}
        handleBot3PositionUpdate={handleBot3PositionUpdate}
        collisionSystemRef={collisionSystemRef}
        bot1GotTagged={bot1GotTagged}
        bot2GotTagged={bot2GotTagged}
        bot3GotTagged={bot3GotTagged}
        BOT1_CONFIG={BOT1_CONFIG}
        BOT2_CONFIG={BOT2_CONFIG}
        BOT3_CONFIG={BOT3_CONFIG}
      />

      <WeaponPickups
        playerPositionRef={playerPositionRef}
        gameState={gameState}
      />
      <HealthPickups
        playerPositionRef={playerPositionRef}
        gameState={gameState}
      />
      <ExplosionVFX />
      <DamageNumbers />
    </Canvas>
  );
};

export default SoloScene;
