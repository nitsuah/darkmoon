import React from "react";
import SpacemanModel from "../../../components/SpacemanModel";
import { Text } from "@react-three/drei";
import { PlayerCharacter } from "../../../components/characters/PlayerCharacter";
import type { SoloSceneProps } from "./SoloScene.types";
import type { PlayerCharacterHandle } from "../../../components/characters/PlayerCharacter";

type PlayersProps = Pick<
  SoloSceneProps,
  | "keysPressedRef"
  | "socketClient"
  | "mouseControls"
  | "clients"
  | "gameManager"
  | "currentPlayerId"
  | "joystickMove"
  | "lastWalkSoundTimeRef"
  | "isPaused"
  | "onPositionUpdate"
  | "playerIsIt"
  | "setPlayerIsIt"
  | "setBotIsIt"
  | "setBot1GotTagged"
  | "setBot2GotTagged"
  | "setGameState"
>;

const Players = React.forwardRef<PlayerCharacterHandle | null, PlayersProps>(
  (props, ref) => {
    // Ensure mouseControls is always provided to PlayerCharacter (non-nullable in PlayerCharacter)
    const mouseControls = props.mouseControls ?? {
      mouseX: 0,
      mouseY: 0,
      leftClick: false,
      rightClick: false,
      middleClick: false,
    };

    // Provide a stable ref for mobileJetpackTrigger if parent didn't provide one
    const mobileJetpackTriggerRef = React.useRef<boolean>(false);

    return (
      <>
        <PlayerCharacter
          ref={ref}
          keysPressedRef={props.keysPressedRef}
          socketClient={props.socketClient}
          mouseControls={mouseControls}
          clients={props.clients}
          gameManager={props.gameManager}
          currentPlayerId={props.currentPlayerId}
          joystickMove={props.joystickMove}
          joystickCamera={{ x: 0, y: 0 }}
          lastWalkSoundTimeRef={props.lastWalkSoundTimeRef}
          isPaused={props.isPaused}
          onPositionUpdate={props.onPositionUpdate}
          playerIsIt={props.playerIsIt}
          setPlayerIsIt={props.setPlayerIsIt}
          setBotIsIt={props.setBotIsIt}
          setBot1GotTagged={props.setBot1GotTagged}
          setBot2GotTagged={props.setBot2GotTagged}
          setGameState={props.setGameState}
          showHitboxes={false}
          mobileJetpackTrigger={mobileJetpackTriggerRef}
          onTagSuccess={() => {}}
        />

        {Object.entries(props.clients)
          .filter(([id]) => id !== "bot-1" && id !== "bot-2")
          .map(([id, client]) => {
            const player = props.gameManager?.getPlayers().get(id as string);
            const isIt = player?.isIt || false;

            return (
              <group key={id} position={client.position}>
                <SpacemanModel
                  color={isIt ? "#ff4444" : "#4a90e2"}
                  isIt={isIt}
                />
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
      </>
    );
  }
);

Players.displayName = "Players";

export default Players;
