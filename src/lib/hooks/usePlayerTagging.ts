import * as THREE from "three";
import { Socket } from "socket.io-client";
import GameManager, { GameState } from "../../components/GameManager";
import { getSoundManager } from "../../components/SoundManager";

export interface ClientsMap {
  [id: string]: { position: [number, number, number] };
}

export interface TaggingParams {
  resolvedPosition: THREE.Vector3;
  clients: ClientsMap;
  myId: string;
  gameManager: GameManager | null;
  lastTagCheckRef: { current: number };
  playerIsIt?: boolean;
  setPlayerIsIt?: (isIt: boolean) => void;
  setBotIsIt?: (isIt: boolean) => void;
  setBot1GotTagged?: (ts: number) => void;
  setBot2GotTagged?: (ts: number) => void;
  setGameState?: (updater: (prev: GameState) => GameState) => void;
  onTagSuccess?: () => void;
  socketClient?: Socket | null;
}

/**
 * Process tagging logic that was previously embedded in PlayerCharacter.
 * Returns true if any tagging occurred.
 */
export function processTagging(params: TaggingParams): boolean {
  const {
    resolvedPosition,
    clients,
    myId,
    gameManager,
    lastTagCheckRef,
    playerIsIt,
    setPlayerIsIt,
    setBotIsIt,
    setBot1GotTagged,
    setBot2GotTagged,
    setGameState,
    onTagSuccess,
    socketClient,
  } = params;

  if (!gameManager) return false;

  const gameState = gameManager.getGameState();
  const now = Date.now();

  let tagged = false;

  for (const [clientId, clientData] of Object.entries(clients)) {
    if (clientId === myId) continue;

    const otherPlayerPos = new THREE.Vector3(...clientData.position);
    const distance = resolvedPosition.distanceTo(otherPlayerPos);

    // Bot tagging (solo mode)
    if (
      (clientId === "bot-1" || clientId === "bot-2") &&
      gameState.mode === "tag" &&
      gameState.isActive &&
      playerIsIt &&
      distance < 1.0 &&
      now - lastTagCheckRef.current > 3000
    ) {
      if (setPlayerIsIt) setPlayerIsIt(false);
      if (setBotIsIt) setBotIsIt(true);
      lastTagCheckRef.current = now;

      if (gameManager) {
        gameManager.updatePlayer(myId, { isIt: false });
        gameManager.updatePlayer(clientId, { isIt: true });
      }

      if (setGameState) {
        setGameState((prev) => ({ ...prev, itPlayerId: clientId }));
      }

      if (clientId === "bot-1" && setBot1GotTagged) setBot1GotTagged(now);
      if (clientId === "bot-2" && setBot2GotTagged) setBot2GotTagged(now);

      try {
        const soundMgr = getSoundManager();
        if (soundMgr) soundMgr.playTagSound();
      } catch (e) {
        // Sound manager may not be ready during initialization
        if (import.meta.env.DEV) {
          console.warn("Failed to play tag sound:", e);
        }
      }

      onTagSuccess?.();

      // Notify server if socket present
      if (socketClient) {
        socketClient.emit("player-tagged", {
          taggerId: myId,
          taggedId: clientId,
        });
      }

      tagged = true;
      lastTagCheckRef.current = now;
    }

    // Multiplayer tagging
    const currentPlayer = gameManager.getPlayers().get(myId);
    if (
      gameState.isActive &&
      gameState.mode === "tag" &&
      currentPlayer?.isIt &&
      distance < 1.0 &&
      now - lastTagCheckRef.current > 1000
    ) {
      if (gameManager.tagPlayer(myId, clientId)) {
        try {
          const soundMgr = getSoundManager();
          if (soundMgr) soundMgr.playTagSound();
        } catch (e) {
          void e;
        }

        if (socketClient) {
          socketClient.emit("player-tagged", {
            taggerId: myId,
            taggedId: clientId,
          });
        }

        lastTagCheckRef.current = now;
        tagged = true;
      }
    }
  }

  return tagged;
}

export default function usePlayerTagging() {
  return { processTagging };
}
