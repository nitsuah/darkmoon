import React from "react";
import { Canvas } from "@react-three/fiber";
import Environment from "./Environment";
import Players from "./Players";
import Bots from "./Bots";
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
        botDebugMode={botDebugMode}
        bot1Position={bot1Position}
        bot2Position={bot2Position}
        isPaused={isPaused}
        handleBot1PositionUpdate={handleBot1PositionUpdate}
        handleBot2PositionUpdate={handleBot2PositionUpdate}
        collisionSystemRef={collisionSystemRef}
        bot1GotTagged={bot1GotTagged}
        bot2GotTagged={bot2GotTagged}
        BOT1_CONFIG={BOT1_CONFIG}
        BOT2_CONFIG={BOT2_CONFIG}
      />
    </Canvas>
  );
};

export default SoloScene;
