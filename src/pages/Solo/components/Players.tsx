/* eslint-disable react-hooks/refs */
import React from "react";
import SpacemanModel from "../../../components/SpacemanModel";
import { Text } from "@react-three/drei";
import { PlayerCharacter } from "../../../components/characters/PlayerCharacter";
import type { SoloSceneProps } from "./SoloScene.types";

const Players: React.FC<
  Pick<
    SoloSceneProps,
    | "playerCharacterRef"
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
  >
> = (props) => {
  return (
    <>
      <PlayerCharacter
        ref={props.playerCharacterRef}
        keysPressedRef={props.keysPressedRef}
        socketClient={props.socketClient}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mouseControls={props.mouseControls as any}
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setGameState={props.setGameState as any}
        showHitboxes={false}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mobileJetpackTrigger={{ current: false } as any}
        onTagSuccess={() => {}}
      />

      {Object.entries(props.clients)
        .filter(([id]) => id !== "bot-1" && id !== "bot-2")
        .map(([id, client]) => {
          const player = props.gameManager?.getPlayers().get(id as string);
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
    </>
  );
};

export default Players;
