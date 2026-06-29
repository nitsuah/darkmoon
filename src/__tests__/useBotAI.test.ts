import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import CollisionSystem from "../components/CollisionSystem";
import { GameManager } from "../components/GameManager";
import { useBotAI, BotConfig } from "../components/characters/useBotAI";
import { SPAWN_POINTS } from "../../lib/constants/spawnPoints"; // Import SPAWN_POINTS

// Mock @react-three/fiber's useFrame
vi.mock("@react-three/fiber", () => ({
  useFrame: vi.fn(),
}));

// Mock Date.now() for consistent time in tests
const MOCK_START_TIME = 1000000;
let mockNow = MOCK_START_TIME;
vi.spyOn(Date, "now").mockImplementation(() => mockNow);

describe("useBotAI", () => {
  let mockMeshRef: React.RefObject<THREE.Group>;
  let mockTargetPositionRef: React.RefObject<[number, number, number]>;
  let mockOnTagTarget: ReturnType<typeof vi.fn>;
  let mockOnFireAtTarget: ReturnType<typeof vi.fn>;
  let mockOnPositionUpdate: ReturnType<typeof vi.fn>;
  let mockCollisionSystem: React.RefObject<CollisionSystem | null>;
  let mockGameState: GameManager["gameState"];
  let defaultBotConfig: BotConfig;
  let randomSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mockNow = MOCK_START_TIME; // Reset time for each test
    mockMeshRef = { current: new THREE.Group() };
    mockMeshRef.current.position.set(0, 0, 0); // Default bot position
    mockTargetPositionRef = { current: [0, 0, 0] }; // Default target position
    mockOnTagTarget = vi.fn();
    mockOnFireAtTarget = vi.fn();
    mockOnPositionUpdate = vi.fn();
    mockCollisionSystem = {
      current: {
        checkCollision: vi.fn((_curr, next) => next),
      },
    };
    mockGameState = {
      mode: "tag",
      isActive: true,
      players: {},
      timeRemaining: 60000,
      roundTime: 60000,
      maxRounds: 3,
      currentRound: 1,
      tagCooldown: 0,
      freezeDuration: 0,
      spawnProtection: 0,
      killLimit: 0,
      scoreLimit: 0,
      scores: {},
      flags: [],
    };
    defaultBotConfig = {
      botSpeed: 1,
      sprintSpeed: 2,
      fleeSpeed: 1, // FLEE_SPEED_MULTIPLIER (0.7) will be applied in the hook
      tagCooldown: 0,
      tagDistance: 0.5,
      pauseAfterTag: 1000,
      sprintDuration: 500,
      sprintCooldown: 2000,
      chaseRadius: 5,
      initialPosition: [0, 0, 0],
      label: "TestBot",
      missChance: 0, // Ensure no miss chance for predictable firing
    };

    // Reset useFrame mock before each test
    (useFrame as ReturnType<typeof vi.fn>).mockClear();
    vi.clearAllMocks(); // Clear mocks for consistency
    randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.5); // Default mock for Math.random
  });

  afterEach(() => {
    vi.clearAllMocks();
    randomSpy.mockRestore(); // Restore Math.random after each test
  });

  const advanceTime = (ms: number) => {
    mockNow += ms;
  };

  const simulateFrame = (delta: number = 0.016) => {
    const frameHandler = (useFrame as ReturnType<typeof vi.fn>).mock.calls[
      (useFrame as ReturnType<typeof vi.fn>).mock.calls.length - 1
    ][0];
    act(() => frameHandler(null, delta));
  };

  it("should initialize with default values", () => {
    const { result } = renderHook(() =>
      useBotAI({
        targetPositionRef: mockTargetPositionRef,
        isPaused: false,
        isIt: false,
        targetIsIt: false,
        onTagTarget: mockOnTagTarget,
        onPositionUpdate: mockOnPositionUpdate,
        gameState: mockGameState,
        collisionSystem: mockCollisionSystem,
        config: defaultBotConfig,
        meshRef: mockMeshRef,
      }),
    );

    expect(result.current.velocity.current).toEqual([0, 0, 0]);
    expect(result.current.isSprinting.current).toBe(false);
  });

  it("should not move if paused", () => {
    mockMeshRef.current!.position.set(0, 0, 0);
    mockTargetPositionRef.current = [10, 0, 0];
    mockGameState.mode = "tag";
    mockGameState.isActive = true;

    renderHook(() =>
      useBotAI({
        targetPositionRef: mockTargetPositionRef,
        isPaused: true,
        isIt: true, // Bot is IT, should chase
        targetIsIt: false,
        onTagTarget: mockOnTagTarget,
        onPositionUpdate: mockOnPositionUpdate,
        gameState: mockGameState,
        collisionSystem: mockCollisionSystem,
        config: defaultBotConfig,
        meshRef: mockMeshRef,
      }),
    );

    simulateFrame();

    expect(mockMeshRef.current!.position.x).toBeCloseTo(0);
    expect(mockOnPositionUpdate).not.toHaveBeenCalled();
  });

  describe("Tag Mode", () => {
    it("should chase target if bot is IT and distance is greater than tagDistance", () => {
      mockMeshRef.current!.position.set(0, 0, 0);
      mockTargetPositionRef.current = [10, 0, 0]; // Target 10 units away
      mockGameState.mode = "tag";
      mockGameState.isActive = true;

      renderHook(() =>
        useBotAI({
          targetPositionRef: mockTargetPositionRef,
          isPaused: false,
          isIt: true, // Bot is IT, should chase
          targetIsIt: false,
          onTagTarget: mockOnTagTarget,
          onPositionUpdate: mockOnPositionUpdate,
          gameState: mockGameState,
          collisionSystem: mockCollisionSystem,
          config: { ...defaultBotConfig, botSpeed: 5 }, // Faster bot for clearer movement
          meshRef: mockMeshRef,
        }),
      );

      simulateFrame(1); // Simulate 1 second

      // Bot should have moved 5 units towards the target (speed 5 * delta 1)
      expect(mockMeshRef.current!.position.x).toBeCloseTo(5);
      expect(mockOnPositionUpdate).toHaveBeenCalledWith([5, 0, 0]);
    });

    it("should attempt to tag target if bot is IT and within tagDistance", () => {
      mockMeshRef.current!.position.set(0, 0, 0);
      mockTargetPositionRef.current = [0.1, 0, 0]; // Target within tagDistance (0.5)
      mockGameState.mode = "tag";
      mockGameState.isActive = true;

      renderHook(() =>
        useBotAI({
          targetPositionRef: mockTargetPositionRef,
          isPaused: false,
          isIt: true, // Bot is IT
          targetIsIt: false,
          onTagTarget: mockOnTagTarget,
          onPositionUpdate: mockOnPositionUpdate,
          gameState: mockGameState,
          collisionSystem: mockCollisionSystem,
          config: defaultBotConfig,
          meshRef: mockMeshRef,
        }),
      );

      simulateFrame();
      expect(mockOnTagTarget).toHaveBeenCalledTimes(1);

      // Advance time less than TAG_RETRY_INTERVAL_MS (200)
      advanceTime(100);
      simulateFrame();
      expect(mockOnTagTarget).toHaveBeenCalledTimes(1); // Should not tag again yet

      // Advance time more than TAG_RETRY_INTERVAL_MS
      advanceTime(200);
      simulateFrame();
      expect(mockOnTagTarget).toHaveBeenCalledTimes(2); // Should tag again
    });

    it("should flee from target if target is IT and within chaseRadius", () => {
      mockMeshRef.current!.position.set(0, 0, 0);
      mockTargetPositionRef.current = [1, 0, 0]; // Target 1 unit away, within chaseRadius (5)
      mockGameState.mode = "tag";
      mockGameState.isActive = true;

      renderHook(() =>
        useBotAI({
          targetPositionRef: mockTargetPositionRef,
          isPaused: false,
          isIt: false, // Bot is NOT IT
          targetIsIt: true, // Target IS IT
          onTagTarget: mockOnTagTarget,
          onPositionUpdate: mockOnPositionUpdate,
          gameState: mockGameState,
          collisionSystem: mockCollisionSystem,
          config: { ...defaultBotConfig, fleeSpeed: 1 }, // Set fleeSpeed to 1 for calculation
          meshRef: mockMeshRef,
        }),
      );

      simulateFrame(1); // Simulate 1 second

      // Bot should have moved away from the target
      // Flee speed is config.fleeSpeed * FLEE_SPEED_MULTIPLIER (0.7)
      // So, 1 * 0.7 * 1 = 0.7 units away
      expect(mockMeshRef.current!.position.x).toBeCloseTo(-0.7);
      expect(mockOnPositionUpdate).toHaveBeenCalledWith([-0.7, 0, 0]);
    });

    it("should pause after being tagged", () => {
      mockMeshRef.current!.position.set(0, 0, 0);
      mockTargetPositionRef.current = [10, 0, 0];
      mockGameState.mode = "tag";
      mockGameState.isActive = true;

      const { rerender } = renderHook(() =>
        useBotAI({
          targetPositionRef: mockTargetPositionRef,
          isPaused: false,
          isIt: false,
          targetIsIt: true,
          onTagTarget: mockOnTagTarget,
          onPositionUpdate: mockOnPositionUpdate,
          gameState: mockGameState,
          collisionSystem: mockCollisionSystem,
          config: defaultBotConfig,
          meshRef: mockMeshRef,
          gotTaggedTimestamp: mockNow, // Bot just got tagged
        }),
      );

      // Bot should be paused and not move
      simulateFrame(0.1);
      expect(mockMeshRef.current!.position.x).toBeCloseTo(0);

      // Advance time by pauseAfterTag duration
      advanceTime(defaultBotConfig.pauseAfterTag + 10); // +10 to ensure it's past the pauseEndTime

      rerender(); // Re-render to trigger useEffect for timestamp change (if needed)

      simulateFrame(0.1);
      // After pause, if target is IT and within range, bot should flee
      // Target is at [10,0,0], bot at [0,0,0], target is IT -> bot flees
      expect(mockMeshRef.current!.position.x).toBeLessThan(0); // Should have moved away
    });
  });

  describe("Deathmatch Mode", () => {
    beforeEach(() => {
      mockGameState.mode = "deathmatch";
      mockGameState.isActive = true;
      mockTargetPositionRef.current = [10, 0, 0];
    });

    it("should advance towards target if outside fire range", () => {
      mockMeshRef.current!.position.set(0, 0, 0);

      renderHook(() =>
        useBotAI({
          targetPositionRef: mockTargetPositionRef,
          isPaused: false,
          isIt: false,
          targetIsIt: false,
          onTagTarget: mockOnTagTarget,
          onFireAtTarget: mockOnFireAtTarget,
          onPositionUpdate: mockOnPositionUpdate,
          gameState: mockGameState,
          collisionSystem: mockCollisionSystem,
          config: { ...defaultBotConfig, botSpeed: 5 },
          meshRef: mockMeshRef,
        }),
      );

      simulateFrame(1); // Simulate 1 second

      expect(mockMeshRef.current!.position.x).toBeCloseTo(5);
      expect(mockOnFireAtTarget).not.toHaveBeenCalled();
    });

    it("should fire at target if within fire range", () => {
      mockMeshRef.current!.position.set(0, 0, 0);
      mockTargetPositionRef.current = [1, 0, 0]; // Within FIRE_RANGE (10)

      renderHook(() =>
        useBotAI({
          targetPositionRef: mockTargetPositionRef,
          isPaused: false,
          isIt: false,
          targetIsIt: false,
          onTagTarget: mockOnTagTarget,
          onFireAtTarget: mockOnFireAtTarget,
          onPositionUpdate: mockOnPositionUpdate,
          gameState: mockGameState,
          collisionSystem: mockCollisionSystem,
          config: defaultBotConfig,
          meshRef: mockMeshRef,
        }),
      );

      simulateFrame();
      expect(mockOnFireAtTarget).toHaveBeenCalledTimes(1);

      // Advance time less than FIRE_RETRY_INTERVAL_MS (200)
      advanceTime(100);
      simulateFrame();
      expect(mockOnFireAtTarget).toHaveBeenCalledTimes(1); // Should not tag again yet

      // Advance time more than FIRE_RETRY_INTERVAL_MS
      advanceTime(200);
      simulateFrame();
      expect(mockOnFireAtTarget).toHaveBeenCalledTimes(2); // Should tag again
    });

    it("should strafe while in fire range", () => {
      mockMeshRef.current!.position.set(0, 0, 0);
      mockTargetPositionRef.current = [1, 0, 0]; // Within FIRE_RANGE (10)

      renderHook(() =>
        useBotAI({
          targetPositionRef: mockTargetPositionRef,
          isPaused: false,
          isIt: false,
          targetIsIt: false,
          onTagTarget: mockOnTagTarget,
          onFireAtTarget: mockOnFireAtTarget,
          onPositionUpdate: mockOnPositionUpdate,
          gameState: mockGameState,
          collisionSystem: mockCollisionSystem,
          config: { ...defaultBotConfig, botSpeed: 5 },
          meshRef: mockMeshRef,
        }),
      );

      simulateFrame(0.1); // Simulate a short frame
      const initialY = mockMeshRef.current!.position.y; // Should be 0

      // After first frame, bot should have moved laterally due to strafing
      expect(mockMeshRef.current!.position.x).toBeCloseTo(0); // Should not move towards target significantly
      expect(mockMeshRef.current!.position.z).not.toBeCloseTo(0); // Should have strafed
      expect(mockMeshRef.current!.position.y).toBeCloseTo(initialY); // Y position should remain unchanged
    });

    it("should jump occasionally", () => {
      mockMeshRef.current!.position.set(0, 0, 0);
      mockTargetPositionRef.current = [10, 0, 0]; // Far away to focus on jumping

      // Mock Math.random to always trigger jump direction and timing
      randomSpy.mockReturnValueOnce(0.1) // for steerSign if it gets stuck, which it won't here
                 .mockReturnValueOnce(0.1); // for nextJumpTime calc

      const { rerender } = renderHook(() =>
        useBotAI({
          targetPositionRef: mockTargetPositionRef,
          isPaused: false,
          isIt: false,
          targetIsIt: false,
          onTagTarget: mockOnTagTarget,
          onFireAtTarget: mockOnFireAtTarget,
          onPositionUpdate: mockOnPositionUpdate,
          gameState: mockGameState,
          collisionSystem: mockCollisionSystem,
          config: defaultBotConfig,
          meshRef: mockMeshRef,
        }),
      );

      // Advance time past initial jump cooldown
      advanceTime(2600); // nextJumpTime is 2500 + Math.random()*2000, which with 0.1 is 2500 + 200 = 2700
      simulateFrame(0.1); // Trigger a jump

      expect(mockMeshRef.current!.position.y).toBeGreaterThan(0); // Bot should have jumped
    });

    it("should be downed and respawn at a random spawn point", () => {
      mockMeshRef.current!.position.set(1, 1, 1); // Start at a custom position

      const { rerender } = renderHook(() =>
        useBotAI({
          targetPositionRef: mockTargetPositionRef,
          isPaused: false,
          isIt: false,
          targetIsIt: false,
          onTagTarget: mockOnTagTarget,
          onFireAtTarget: mockOnFireAtTarget,
          onPositionUpdate: mockOnPositionUpdate,
          gameState: mockGameState,
          collisionSystem: mockCollisionSystem,
          config: defaultBotConfig,
          meshRef: mockMeshRef,
          isDowned: true, // Bot is downed
        }),
      );

      // Bot should be pulsing when downed (visual indicator, not physical movement)
      simulateFrame(0.1);
      expect(mockMeshRef.current!.scale.x).not.toBeCloseTo(1);

      // Simulate respawn (isDowned becomes false)
      rerender({ ...rerender.current.props, isDowned: false }); // Pass all current props, just change isDowned
      simulateFrame(0.1);

      // Bot should have teleported to a spawn point
      // (exact point depends on Math.random, so just check it's not the original (1,1,1) or current (0,0,0) (initialPosition))
      const currentPos = mockMeshRef.current!.position;
      expect(currentPos.x).not.toBeCloseTo(1);
      expect(currentPos.y).not.toBeCloseTo(1);
      expect(currentPos.z).not.toBeCloseTo(1);
      expect(currentPos.equals(new THREE.Vector3(...defaultBotConfig.initialPosition))).toBe(false); // Should not be initial position either
      // Add a more specific check for spawn points
      const spawnPointsVecs = SPAWN_POINTS.map(p => new THREE.Vector3(...p));
      const isAtSpawnPoint = spawnPointsVecs.some(sp => sp.distanceTo(currentPos) < 0.01);
      expect(isAtSpawnPoint).toBe(true);
    });
  });

  describe("CTF Mode", () => {
    beforeEach(() => {
      mockGameState.mode = "ctf";
      mockGameState.isActive = true;
      mockGameState.flags = [
        { team: "a", position: [10, 0, 10], basePosition: [10, 0, 10], carrierId: undefined },
        { team: "b", position: [-10, 0, -10], basePosition: [-10, 0, -10], carrierId: undefined },
      ];
      mockTargetPositionRef.current = [0, 0, 0]; // Default target for firing
    });

    it("should move towards enemy flag if not carrying flag and enemy flag is free", () => {
      mockMeshRef.current!.position.set(0, 0, 0);

      renderHook(() =>
        useBotAI({
          targetPositionRef: mockTargetPositionRef,
          isPaused: false,
          isIt: false,
          targetIsIt: false,
          onTagTarget: mockOnTagTarget,
          onFireAtTarget: mockOnFireAtTarget,
          onPositionUpdate: mockOnPositionUpdate,
          gameState: mockGameState,
          collisionSystem: mockCollisionSystem,
          config: { ...defaultBotConfig, botSpeed: 5 },
          meshRef: mockMeshRef,
          team: "a", // Bot is on team A
          isCarryingFlag: false,
          targetTeam: "b", // Target is on enemy team
        }),
      );

      simulateFrame(1); // Simulate 1 second

      // Bot (team A) should move towards enemy flag (team B's flag at [-10, 0, -10])
      expect(mockMeshRef.current!.position.x).toBeCloseTo(-3.535); // Moved towards -10, -10
      expect(mockMeshRef.current!.position.z).toBeCloseTo(-3.535);
      expect(mockOnPositionUpdate).toHaveBeenCalled();
    });

    it("should move towards own base if carrying enemy flag", () => {
      mockMeshRef.current!.position.set(0, 0, 0);
      // Simulate bot (team A) carrying team B's flag.
      // So the enemy flag should be considered 'carried' and not a target
      mockGameState.flags![1].carrierId = "test-bot-id";

      renderHook(() =>
        useBotAI({
          targetPositionRef: mockTargetPositionRef,
          isPaused: false,
          isIt: false,
          targetIsIt: false,
          onTagTarget: mockOnTagTarget,
          onFireAtTarget: mockOnFireAtTarget,
          onPositionUpdate: mockOnPositionUpdate,
          gameState: mockGameState,
          collisionSystem: mockCollisionSystem,
          config: { ...defaultBotConfig, botSpeed: 5 },
          meshRef: mockMeshRef,
          team: "a", // Bot is on team A
          isCarryingFlag: true, // Bot is carrying the flag
          targetTeam: "b",
        }),
      );

      simulateFrame(1); // Simulate 1 second

      // Bot (team A) should move towards its own base (team A's base at [10, 0, 10])
      expect(mockMeshRef.current!.position.x).toBeCloseTo(3.535);
      expect(mockMeshRef.current!.position.z).toBeCloseTo(3.535);
      expect(mockOnPositionUpdate).toHaveBeenCalled();
    });

    it("should fire at enemy target if within range, even while moving to objective", () => {
      mockMeshRef.current!.position.set(0, 0, 0);
      mockTargetPositionRef.current = [1, 0, 0]; // Enemy target within FIRE_RANGE

      renderHook(() =>
        useBotAI({
          targetPositionRef: mockTargetPositionRef,
          isPaused: false,
          isIt: false,
          targetIsIt: false,
          onTagTarget: mockOnTagTarget,
          onFireAtTarget: mockOnFireAtTarget,
          onPositionUpdate: mockOnPositionUpdate,
          gameState: mockGameState,
          collisionSystem: mockCollisionSystem,
          config: defaultBotConfig,
          meshRef: mockMeshRef,
          team: "a",
          isCarryingFlag: false,
          targetTeam: "b", // Target is an enemy
        }),
      );

      simulateFrame();
      expect(mockOnFireAtTarget).toHaveBeenCalledTimes(1);
      expect(mockMeshRef.current!.position.x).not.toBeCloseTo(0); // Should still move
    });
  });

  describe("Collision and Obstacle Avoidance", () => {
    it("should call checkCollision on movement", () => {
      mockMeshRef.current!.position.set(0, 0, 0);
      mockTargetPositionRef.current = [10, 0, 0];
      mockGameState.mode = "tag";
      mockGameState.isActive = true;

      renderHook(() =>
        useBotAI({
          targetPositionRef: mockTargetPositionRef,
          isPaused: false,
          isIt: true,
          targetIsIt: false,
          onTagTarget: mockOnTagTarget,
          onPositionUpdate: mockOnPositionUpdate,
          gameState: mockGameState,
          collisionSystem: mockCollisionSystem,
          config: defaultBotConfig,
          meshRef: mockMeshRef,
        }),
      );

      simulateFrame();
      expect(mockCollisionSystem.current?.checkCollision).toHaveBeenCalled();
    });

    it("should trigger obstacle avoidance if stuck", () => {
      mockMeshRef.current!.position.set(0, 0, 0);
      mockTargetPositionRef.current = [10, 0, 0];
      mockGameState.mode = "tag";
      mockGameState.isActive = true;

      // Mock checkCollision to always return the current position, simulating being stuck
      (mockCollisionSystem.current!.checkCollision as ReturnType<typeof vi.fn>).mockImplementation(
        (current) => current,
      );

      renderHook(() =>
        useBotAI({
          targetPositionRef: mockTargetPositionRef,
          isPaused: false,
          isIt: true,
          targetIsIt: false,
          onTagTarget: mockOnTagTarget,
          onPositionUpdate: mockOnPositionUpdate,
          gameState: mockGameState,
          collisionSystem: mockCollisionSystem,
          config: { ...defaultBotConfig, botSpeed: 5 },
          meshRef: mockMeshRef,
        }),
      );

      const initialRotationY = mockMeshRef.current!.rotation.y;

      // Simulate being stuck for multiple frames
      simulateFrame(0.1); // Stuck frame 1
      simulateFrame(0.1); // Stuck frame 2
      simulateFrame(0.1); // Stuck frame 3 - should trigger steering

      // Bot should have changed its rotation to steer around the obstacle
      expect(mockMeshRef.current!.rotation.y).not.toBeCloseTo(initialRotationY);

      // After steering, movement should attempt to resolve
      (mockCollisionSystem.current!.checkCollision as ReturnType<typeof vi.fn>).mockImplementation(
        (_curr, next) => next, // Allow movement again
      );
      simulateFrame(0.1);
      expect(mockMeshRef.current!.position.x).not.toBeCloseTo(0); // Should have moved
    });
  });

  describe("Sprint Bursts", () => {
    it("IT bot should sprint periodically", () => {
      mockMeshRef.current!.position.set(0, 0, 0);
      mockTargetPositionRef.current = [10, 0, 0];
      mockGameState.mode = "tag";
      mockGameState.isActive = true;

      const { result } = renderHook(() =>
        useBotAI({
          targetPositionRef: mockTargetPositionRef,
          isPaused: false,
          isIt: true, // Bot is IT
          targetIsIt: false,
          onTagTarget: mockOnTagTarget,
          onPositionUpdate: mockOnPositionUpdate,
          gameState: mockGameState,
          collisionSystem: mockCollisionSystem,
          config: { ...defaultBotConfig, botSpeed: 1, sprintSpeed: 5, sprintDuration: 500, sprintCooldown: 1000 },
          meshRef: mockMeshRef,
        }),
      );

      // Initially not sprinting
      simulateFrame(0.016);
      expect(result.current.isSprinting.current).toBe(false);

      // Advance time to trigger sprint
      advanceTime(defaultBotConfig.sprintCooldown + 1); // Enough time for sprint cooldown to pass
      simulateFrame(0.016);
      expect(result.current.isSprinting.current).toBe(true);

      // Advance time through sprint duration
      advanceTime(defaultBotConfig.sprintDuration);
      simulateFrame(0.016);
      expect(result.current.isSprinting.current).toBe(false);

      // Advance time less than sprint cooldown
      advanceTime(defaultBotConfig.sprintCooldown / 2);
      simulateFrame(0.016);
      expect(result.current.isSprinting.current).toBe(false);

      // Advance time past sprint cooldown again
      advanceTime(defaultBotConfig.sprintCooldown / 2 + 1);
      simulateFrame(0.016);
      expect(result.current.isSprinting.current).toBe(true);
    });
  });
});
