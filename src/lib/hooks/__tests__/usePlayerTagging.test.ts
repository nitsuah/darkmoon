import { describe, it, expect, vi, beforeEach } from "vitest";
import * as THREE from "three";
import { processTagging } from "../usePlayerTagging";
import GameManager from "../../../components/GameManager";

// Mock the sound manager so playTagSound doesn't throw during tests
vi.mock("../../../components/SoundManager", () => ({
  getSoundManager: () => ({ playTagSound: vi.fn() }),
}));

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

    // Force p1 to be IT for test determinism
    const itId = gameManager.getGameState().itPlayerId as string;
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
    expect(socketClient!.emit).toHaveBeenCalled();
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
      "tagPlayer",
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
    expect(socketClient!.emit).toHaveBeenCalled();
  });

  it("records cooldown/freeze state on GameManager so the newly-tagged bot can't immediately tag back", () => {
    gameManager.startTagGame(60);

    // Force p1 to be IT for test determinism
    const itId = gameManager.getGameState().itPlayerId as string;
    gameManager.updatePlayer(itId, { isIt: false });
    gameManager.updatePlayer("p1", { isIt: true });
    gameManager.getGameState().itPlayerId = "p1";

    clients = {
      "bot-1": { position: [0.4, 0, 0] },
    };

    const tagged = processTagging({
      resolvedPosition: new THREE.Vector3(0, 0, 0),
      clients,
      myId: "p1",
      gameManager,
      lastTagCheckRef,
      playerIsIt: true,
      setPlayerIsIt: vi.fn(),
      setBotIsIt: vi.fn(),
      setBot1GotTagged: vi.fn(),
      setBot2GotTagged: undefined,
      setGameState: vi.fn(),
      onTagSuccess: undefined,
      socketClient:
        socketClient as unknown as import("socket.io-client").Socket,
    });

    expect(tagged).toBe(true);

    const p1 = gameManager.getPlayers().get("p1")!;
    const bot1 = gameManager.getPlayers().get("bot-1")!;
    expect(p1.isIt).toBe(false);
    expect(bot1.isIt).toBe(true);
    expect(bot1.lastTaggedById).toBe("p1");
    expect(bot1.lastTagTime).toBeDefined();

    // Bot-1 immediately tagging p1 back must be rejected by the freeze
    // window - otherwise the player gets incorrectly frozen right after
    // performing a successful tag.
    expect(gameManager.tagPlayer("bot-1", "p1")).toBe(false);
  });

  it("does not update React state when GameManager rejects the tag (e.g. tagged player still frozen)", () => {
    gameManager.startTagGame(60);

    const itId = gameManager.getGameState().itPlayerId as string;
    gameManager.updatePlayer(itId, { isIt: false });
    gameManager.updatePlayer("p1", { isIt: true });
    gameManager.getGameState().itPlayerId = "p1";

    // bot-1 was tagged moments ago and is still within TAG_FREEZE_MS
    gameManager.updatePlayer("bot-1", { lastTagTime: Date.now() });

    clients = {
      "bot-1": { position: [0.4, 0, 0] },
    };

    const setPlayerIsIt = vi.fn();
    const setBotIsIt = vi.fn();

    const tagged = processTagging({
      resolvedPosition: new THREE.Vector3(0, 0, 0),
      clients,
      myId: "p1",
      gameManager,
      lastTagCheckRef,
      playerIsIt: true,
      setPlayerIsIt,
      setBotIsIt,
      setBot1GotTagged: vi.fn(),
      setBot2GotTagged: undefined,
      setGameState: vi.fn(),
      onTagSuccess: undefined,
      socketClient:
        socketClient as unknown as import("socket.io-client").Socket,
    });

    expect(tagged).toBe(false);
    expect(setPlayerIsIt).not.toHaveBeenCalled();
    expect(setBotIsIt).not.toHaveBeenCalled();
    expect(gameManager.getPlayers().get("p1")!.isIt).toBe(true);
  });
});
