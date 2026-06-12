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

    // Unified tagging logic for solo and multiplayer (player <-> bot, bot <-> player, player <-> player)
    const currentPlayer = gameManager.getPlayers().get(myId);
    const targetPlayer = gameManager.getPlayers().get(clientId);
    const canTag =
      gameState.isActive &&
      gameState.mode === "tag" &&
      currentPlayer?.isIt &&
      !targetPlayer?.isIt &&
      distance < 1.0 &&
      now - lastTagCheckRef.current > 1000;

    if (canTag) {
      // GameManager.tagPlayer is the authoritative gate: it enforces the
      // tag-back cooldown and tagged-player freeze window, and (on success)
      // updates isIt/lastTagTime/lastTaggedById/itPlayerId itself. Call it
      // first and only sync local state if it actually transferred "it" -
      // otherwise a cooldown-blocked attempt would desync React state from
      // GameManager (e.g. marking the player not-IT while GameManager still
      // considers them IT).
      if (
        typeof gameManager.tagPlayer !== "function" ||
        !gameManager.tagPlayer(myId, clientId)
      ) {
        continue;
      }

      if (setGameState) {
        setGameState((prev) => ({ ...prev, itPlayerId: clientId }));
      }

      // Update IT state for React state sync (for test and UI correctness)
      if (clientId === "bot-1") {
        if (setBot1GotTagged) setBot1GotTagged(now);
        if (setPlayerIsIt) setPlayerIsIt(false);
        if (setBotIsIt) setBotIsIt(true);
      }
      if (clientId === "bot-2") {
        if (setBot2GotTagged) setBot2GotTagged(now);
        if (setPlayerIsIt) setPlayerIsIt(false);
        if (setBotIsIt) setBotIsIt(true);
      }

      try {
        const soundMgr = getSoundManager();
        if (soundMgr) soundMgr.playTagSound();
      } catch (e) {
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

      lastTagCheckRef.current = now;
      tagged = true;
    }
  }

  return tagged;
}

export default function usePlayerTagging() {
  return { processTagging };
}
