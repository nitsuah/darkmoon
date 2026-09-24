import * as React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as THREE from "three";
import ShootingGallery from "../ShootingGallery";
import type GameManager from "../../../../components/GameManager";
import type { GalleryBotConfig } from "../GalleryBotConfig";
import {
  renderR3F,
  inAct,
  advance,
  mockNow,
  type MockClock,
  type R3FRenderer,
} from "../../../../__tests__/r3f.test.utils";

// Scene layout inside the gallery's root group: back wall, 2 side walls,
// 3 counters, floor, then the 15 target groups, the bonus duck, signs, lights.
const FIRST_TARGET = 7;
const TARGET_COUNT = 15;
const BONUS_INDEX = FIRST_TARGET + TARGET_COUNT;

const root = (r: R3FRenderer) => r.scene.children[0].instance as THREE.Group;
const targetGroup = (r: R3FRenderer, i: number) =>
  root(r).children[FIRST_TARGET + i] as THREE.Group;
const bodyMaterial = (g: THREE.Group) =>
  (g.children[0] as THREE.Mesh).material as THREE.MeshStandardMaterial;
const bonusGroup = (r: R3FRenderer) =>
  root(r).children[BONUS_INDEX] as THREE.Group;

function makeGameManager(score = 0) {
  return {
    getGameState: vi.fn(() => ({ scores: { p1: score } })),
    recordGalleryShot: vi.fn(),
  };
}

/** Fire a gallery shot straight down -z through the world position of `obj`. */
async function shootAt(r: R3FRenderer, obj: THREE.Object3D) {
  root(r).updateMatrixWorld(true);
  const p = obj.getWorldPosition(new THREE.Vector3());
  await inAct(() =>
    window.dispatchEvent(
      new window.CustomEvent("gallery-fire", {
        detail: {
          originX: p.x,
          originY: p.y,
          originZ: 0,
          dirX: 0,
          dirY: 0,
          dirZ: -1,
          range: 80,
        },
      }),
    ),
  );
}

async function shootAtNothing() {
  await inAct(() =>
    window.dispatchEvent(
      new window.CustomEvent("gallery-fire", {
        detail: {
          originX: 0,
          originY: 50,
          originZ: 0,
          dirX: 0,
          dirY: 1,
          dirZ: 0,
          range: 80,
        },
      }),
    ),
  );
}

function recordEvents(...names: string[]) {
  const seen: Record<string, unknown[]> = {};
  const handlers = names.map((n) => {
    seen[n] = [];
    const h = (e: Event) => seen[n].push((e as CustomEvent).detail);
    window.addEventListener(n, h);
    return () => window.removeEventListener(n, h);
  });
  return { seen, stop: () => handlers.forEach((off) => off()) };
}

describe("ShootingGallery (rendered)", () => {
  let clock: MockClock;

  beforeEach(() => {
    clock = mockNow(100_000);
    // Always pick the first "down" target so spawns are deterministic (r0c0).
    vi.spyOn(Math, "random").mockReturnValue(0);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /** Spawn r0c0 and let it finish rising. */
  async function raiseFirstTarget(r: R3FRenderer) {
    clock.tick(1_000);
    await advance(r); // spawn → rising
    clock.tick(300);
    await advance(r); // rising → up
  }

  it("renders nothing while inactive", async () => {
    const renderer = await renderR3F(
      <ShootingGallery
        gameManager={null}
        currentPlayerId="p1"
        isActive={false}
      />,
    );
    expect(renderer.scene.children).toHaveLength(0);
    await advance(renderer);
    await renderer.unmount();
  });

  it("builds the gallery with hidden targets and pops one up on the spawn interval", async () => {
    const renderer = await renderR3F(
      <ShootingGallery gameManager={null} currentPlayerId="p1" isActive />,
    );
    expect(root(renderer).children.length).toBeGreaterThan(BONUS_INDEX);
    const first = targetGroup(renderer, 0);
    expect(first.visible).toBe(false);

    clock.tick(1_000);
    await advance(renderer); // spawned: marked rising
    clock.tick(100);
    await advance(renderer);
    expect(first.visible).toBe(true); // mid-rise
    expect(first.position.y).toBeLessThan(1.6 + 0.7 + 0.05);

    clock.tick(300);
    await advance(renderer);
    // Fully up: centre sits above the counter top.
    expect(first.position.y).toBeCloseTo(1.6 + 0.7 + 0.05);

    // Stays up for its duration, then falls back down out of sight.
    clock.tick(2_600);
    await advance(renderer); // up → falling
    clock.tick(300);
    await advance(renderer); // falling → down
    expect(first.position.y).toBeCloseTo(1.6 - 0.7 - 0.02);
    await renderer.unmount();
  });

  it("scores a hit, flashes and pops the target, and reports the combo", async () => {
    const gm = makeGameManager();
    const events = recordEvents(
      "damage-number",
      "gallery-combo",
      "player-hit-landed",
    );
    const renderer = await renderR3F(
      <ShootingGallery
        gameManager={gm as unknown as GameManager}
        currentPlayerId="p1"
        isActive
      />,
    );
    await raiseFirstTarget(renderer);
    const target = targetGroup(renderer, 0);

    await shootAt(renderer, target);
    expect(gm.recordGalleryShot).toHaveBeenCalledWith("p1", 10);
    expect(events.seen["player-hit-landed"]).toHaveLength(1);
    expect(events.seen["gallery-combo"]).toEqual([
      { combo: 1, multiplier: 1, pts: 10 },
    ]);
    expect(events.seen["damage-number"][0]).toMatchObject({
      damage: 10,
      color: "#ffd700",
      positive: true,
    });

    // Within the 80ms flash window: white and enlarged.
    clock.tick(40);
    await advance(renderer);
    expect(bodyMaterial(target).color.getHexString()).toBe("ffffff");
    expect(target.scale.x).toBeGreaterThan(1);

    // After the flash the original colour is restored.
    clock.tick(100);
    await advance(renderer);
    expect(bodyMaterial(target).color.getHexString()).toBe("ff3322");
    expect(target.scale.x).toBe(1);

    events.stop();
    await renderer.unmount();
  });

  it("builds a multiplier over consecutive hits and resets it on a miss", async () => {
    const gm = makeGameManager();
    const events = recordEvents("damage-number", "gallery-combo");
    const renderer = await renderR3F(
      <ShootingGallery
        gameManager={gm as unknown as GameManager}
        currentPlayerId="p1"
        isActive
      />,
    );

    for (let i = 0; i < 5; i++) {
      await raiseFirstTarget(renderer);
      await shootAt(renderer, targetGroup(renderer, 0));
    }
    const combos = events.seen["gallery-combo"] as {
      combo: number;
      multiplier: number;
      pts: number;
    }[];
    expect(combos.map((c) => c.multiplier)).toEqual([1, 1, 2, 2, 3]);
    expect(combos[4].pts).toBe(30);
    const colors = (events.seen["damage-number"] as { color: string }[]).map(
      (d) => d.color,
    );
    expect(colors[2]).toBe("#ffdd00");
    expect(colors[4]).toBe("#ff8800");

    await shootAtNothing();
    expect(gm.recordGalleryShot).toHaveBeenLastCalledWith("p1", 0);
    expect(combos[combos.length - 1]).toEqual({
      combo: 0,
      multiplier: 1,
      pts: 0,
    });

    events.stop();
    await renderer.unmount();
  });

  it("breaks the combo after a long pause between hits", async () => {
    const gm = makeGameManager();
    const events = recordEvents("gallery-combo");
    const renderer = await renderR3F(
      <ShootingGallery
        gameManager={gm as unknown as GameManager}
        currentPlayerId="p1"
        isActive
      />,
    );
    await raiseFirstTarget(renderer);
    await shootAt(renderer, targetGroup(renderer, 0));
    clock.tick(4_000);
    await raiseFirstTarget(renderer);
    await shootAt(renderer, targetGroup(renderer, 0));
    expect(
      (events.seen["gallery-combo"] as { combo: number }[]).map((c) => c.combo),
    ).toEqual([1, 1]);
    events.stop();
    await renderer.unmount();
  });

  it("ignores gallery-fire events while inactive and misses without a game manager", async () => {
    const events = recordEvents("gallery-combo");
    const renderer = await renderR3F(
      <ShootingGallery gameManager={null} currentPlayerId="p1" isActive />,
    );
    await shootAtNothing(); // no game manager: miss is not recorded
    expect(events.seen["gallery-combo"]).toHaveLength(0);

    await renderer.update(
      <ShootingGallery
        gameManager={null}
        currentPlayerId="p1"
        isActive={false}
      />,
    );
    await shootAtNothing();
    expect(events.seen["gallery-combo"]).toHaveLength(0);
    events.stop();
    await renderer.unmount();
  });

  it("fires a one-off bonus round when the clock crosses 30s and doubles points during it", async () => {
    const gm = makeGameManager(400); // high score → shorter stay-up time
    const events = recordEvents("gallery-bonus-round", "damage-number");
    const props = {
      gameManager: gm as unknown as GameManager,
      currentPlayerId: "p1",
      isActive: true,
    };
    const renderer = await renderR3F(
      <ShootingGallery {...props} timeRemaining={31} />,
    );
    await renderer.update(<ShootingGallery {...props} timeRemaining={30} />);
    expect(events.seen["gallery-bonus-round"]).toEqual([{ duration: 8000 }]);

    // Only fires once per game.
    await renderer.update(<ShootingGallery {...props} timeRemaining={45} />);
    await renderer.update(<ShootingGallery {...props} timeRemaining={20} />);
    expect(events.seen["gallery-bonus-round"]).toHaveLength(1);

    await raiseFirstTarget(renderer);
    await shootAt(renderer, targetGroup(renderer, 0));
    expect(gm.recordGalleryShot).toHaveBeenCalledWith("p1", 20);
    expect((events.seen["damage-number"] as { color: string }[])[0].color).toBe(
      "#ff44ff",
    );

    // Deactivating resets so the next game can trigger it again.
    await renderer.update(
      <ShootingGallery {...props} isActive={false} timeRemaining={31} />,
    );
    await renderer.update(<ShootingGallery {...props} timeRemaining={31} />);
    await renderer.update(<ShootingGallery {...props} timeRemaining={29} />);
    expect(events.seen["gallery-bonus-round"]).toHaveLength(2);

    events.stop();
    await renderer.unmount();
  });

  it("sends the bonus duck across the range and awards 100 points for hitting it", async () => {
    const gm = makeGameManager();
    const events = recordEvents("damage-number");
    const renderer = await renderR3F(
      <ShootingGallery
        gameManager={gm as unknown as GameManager}
        currentPlayerId="p1"
        isActive
      />,
    );
    const duck = bonusGroup(renderer);
    expect(duck.visible).toBe(false);

    clock.tick(4_000); // first duck appears 4s after start
    await advance(renderer);
    await advance(renderer, 40);
    expect(duck.visible).toBe(true);
    expect(duck.position.x).toBeGreaterThan(-16);

    await shootAt(renderer, duck.children[0]);
    expect(gm.recordGalleryShot).toHaveBeenCalledWith("p1", 100);
    expect(events.seen["damage-number"][0]).toMatchObject({
      damage: 100,
      color: "#ffd700",
    });

    // Once shot it sinks back out of view.
    await advance(renderer, 60);
    expect(duck.visible).toBe(false);
    events.stop();
    await renderer.unmount();
  });

  it("retires the bonus duck when it reaches the far side", async () => {
    const renderer = await renderR3F(
      <ShootingGallery gameManager={null} currentPlayerId="p1" isActive />,
    );
    clock.tick(4_000);
    await advance(renderer);
    await advance(renderer, 700); // 0.05/frame across 32 units
    await advance(renderer, 60);
    expect(bonusGroup(renderer).visible).toBe(false);
    await renderer.unmount();
  });

  it("shows hitbox wireframes in debug mode", async () => {
    const config: GalleryBotConfig = {
      name: "Idle",
      reactionMs: 1e9,
      shotIntervalMs: 1e9,
      aimJitterRad: 0,
      missChance: 0,
      targetStrategy: "random",
      hesitate: false,
    };
    const renderer = await renderR3F(
      <ShootingGallery
        gameManager={null}
        currentPlayerId="p1"
        isActive
        debugMode
        botConfig={config}
      />,
    );
    // body + wireframe + head
    expect(targetGroup(renderer, 0).children).toHaveLength(3);
    await renderer.unmount();
  });
});
