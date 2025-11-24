import { describe, it, expect, vi, beforeEach } from "vitest";
import * as THREE from "three";
import { processTagging } from "../usePlayerTagging";
import GameManager from "../../../components/GameManager";

describe("usePlayerTagging.processTagging", () => {
  let gameManager: GameManager;
  let clients: Record<string, { position: [number, number, number] }>;
  let lastTagCheckRef: { current: number };
  let socketClient: { emit: ReturnType<typeof vi.fn> } | null;

  beforeEach(() => {
    gameManager = new GameManager();
    clients = {};
    lastTagCheckRef = { current: 0 };
    socketClient = { emit: vi.fn() };

    // Create players in game manager
    gameManager.addPlayer({
      id: "p1",
      name: "P1",
      position: [0, 0, 0],
      rotation: [0, 0, 0],
    });
    gameManager.addPlayer({
      id: "bot-1",
      name: "Bot 1",
      position: [0.5, 0, 0],
      rotation: [0, 0, 0],
    });
    gameManager.addPlayer({
      id: "p2",
      name: "P2",
      position: [5, 0, 0],
      rotation: [0, 0, 0],
    });
  });

  it("tags a bot when player is IT and within distance", () => {
    // Setup tag game
    gameManager.startTagGame(60);

    // Ensure p1 is IT
    const itId = gameManager.getGameState().itPlayerId as string;
    // Force it to be p1 for test determinism
    gameManager.updatePlayer(itId, { isIt: false });
    gameManager.updatePlayer("p1", { isIt: true });
    gameManager.getGameState().itPlayerId = "p1";

    // Place bot close to p1
    clients = {
      "bot-1": { position: [0.4, 0, 0] },
    };

    const setPlayerIsIt = vi.fn();
    const setBotIsIt = vi.fn();
    const setBot1GotTagged = vi.fn();
    const setGameState = vi.fn();

    const tagged = processTagging({
      resolvedPosition: new THREE.Vector3(0, 0, 0),
      clients,
      myId: "p1",
      gameManager,
      lastTagCheckRef,
      playerIsIt: true,
      setPlayerIsIt,
      setBotIsIt,
      setBot1GotTagged,
      setBot2GotTagged: undefined,
      setGameState,
      onTagSuccess: undefined,
      socketClient:
        socketClient as unknown as import("socket.io-client").Socket,
    });

    expect(tagged).toBe(true);
    expect(setPlayerIsIt).toHaveBeenCalledWith(false);
    expect(setBotIsIt).toHaveBeenCalledWith(true);
    expect(setBot1GotTagged).toHaveBeenCalled();
    expect(socketClient!.emit.mock.calls.length).toBeGreaterThanOrEqual(1);
  });

  it("multiplayer tagging calls gameManager.tagPlayer and emits event", () => {
    // Configure game state
    const gs = gameManager.getGameState();
    gs.mode = "tag";
    gs.isActive = true;

    // Make p1 be IT
    gameManager.updatePlayer("p1", { isIt: true });

    // Place p2 near p1
    clients = {
      p2: { position: [0.5, 0, 0] },
    };

    // Ensure lastTagCheckRef is old
    lastTagCheckRef.current = 0;

    // Spy on tagPlayer
    const tagSpy = vi.spyOn(
      gameManager as unknown as { tagPlayer?: (...args: unknown[]) => boolean },
      "tagPlayer"
    );
    tagSpy.mockImplementation(() => true);

    const tagged = processTagging({
      resolvedPosition: new THREE.Vector3(0, 0, 0),
      clients,
      myId: "p1",
      gameManager,
      lastTagCheckRef,
      playerIsIt: true,
      setPlayerIsIt: undefined,
      setBotIsIt: undefined,
      setBot1GotTagged: undefined,
      setBot2GotTagged: undefined,
      setGameState: undefined,
      onTagSuccess: undefined,
      socketClient:
        socketClient as unknown as import("socket.io-client").Socket,
    });

    expect(tagged).toBe(true);
    expect(tagSpy).toHaveBeenCalled();
    expect(socketClient!.emit.mock.calls.length).toBeGreaterThanOrEqual(1);
  });
});
