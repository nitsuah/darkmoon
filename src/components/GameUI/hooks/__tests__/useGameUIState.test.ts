import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  useViewport,
  useStreakAnnouncement,
  useRespawnCountdown,
  useHitDirection,
  useDamageFlash,
  useHitMarker,
  useMousePosition,
  useGalleryHighScore,
  useBonusRound,
  useGalleryCombo,
  useCrosshairSpread,
  useScoreboard,
  usePickupToast,
  useKillAnnouncement,
} from "../useGameUIState";
import type { GameState } from "../../../GameManager";

const emit = (name: string, detail?: unknown) =>
  act(() => {
    window.dispatchEvent(new window.CustomEvent(name, { detail }));
  });

const setViewport = (width: number, height: number) => {
  Object.defineProperty(window, "innerWidth", {
    value: width,
    configurable: true,
  });
  Object.defineProperty(window, "innerHeight", {
    value: height,
    configurable: true,
  });
};

describe("useGameUIState hooks", () => {
  const originalSize = { w: window.innerWidth, h: window.innerHeight };

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    setViewport(originalSize.w, originalSize.h);
    localStorage.clear();
  });

  describe("useViewport", () => {
    it("tracks mobile/landscape on resize", () => {
      setViewport(1200, 800);
      const { result } = renderHook(() => useViewport());
      expect(result.current).toEqual({
        isMobile: false,
        isLandscape: true,
        isMinimal: false,
      });

      setViewport(700, 400);
      act(() => {
        window.dispatchEvent(new Event("resize"));
      });
      expect(result.current).toEqual({
        isMobile: true,
        isLandscape: true,
        isMinimal: true,
      });

      setViewport(400, 700);
      act(() => {
        window.dispatchEvent(new Event("resize"));
      });
      expect(result.current.isLandscape).toBe(false);
      expect(result.current.isMinimal).toBe(false);
    });
  });

  describe("useStreakAnnouncement", () => {
    it("mirrors the current streak and clears when it goes away", () => {
      const { result, rerender } = renderHook(
        ({ s }: { s: GameState["streakAnnouncement"] }) =>
          useStreakAnnouncement(s),
        { initialProps: { s: undefined as GameState["streakAnnouncement"] } },
      );
      expect(result.current).toBeNull();
      rerender({
        s: { killerName: "Ace", count: 3 } as GameState["streakAnnouncement"],
      });
      expect(result.current).toEqual({ killerName: "Ace", count: 3 });
      rerender({ s: undefined });
      expect(result.current).toBeNull();
    });
  });

  describe("useRespawnCountdown", () => {
    it("counts down whole seconds until respawn and clamps at zero", () => {
      vi.setSystemTime(10_000);
      const { result, rerender } = renderHook(
        ({ at }: { at: number | undefined }) => useRespawnCountdown(at),
        { initialProps: { at: undefined as number | undefined } },
      );
      expect(result.current).toBeNull();

      rerender({ at: 13_000 });
      act(() => {
        vi.advanceTimersByTime(100);
      });
      expect(result.current).toBe(3);

      act(() => {
        vi.advanceTimersByTime(4_000);
      });
      expect(result.current).toBe(0);

      rerender({ at: undefined });
      expect(result.current).toBeNull();
    });
  });

  describe("useHitDirection", () => {
    it("shows the hit angle briefly and ignores events without an angle", () => {
      const { result } = renderHook(() => useHitDirection());
      emit("player-damaged", {});
      expect(result.current).toBeNull();

      emit("player-damaged", { angle: 1.2 });
      expect(result.current).toBe(1.2);
      emit("player-damaged", { angle: -0.5 }); // replaces the pending timer
      expect(result.current).toBe(-0.5);

      act(() => {
        vi.advanceTimersByTime(900);
      });
      expect(result.current).toBeNull();
    });
  });

  describe("useDamageFlash", () => {
    it("flashes only when health drops, then fades", () => {
      const { result, rerender } = renderHook(
        ({ hp }: { hp: number | undefined }) => useDamageFlash(hp),
        { initialProps: { hp: 100 as number | undefined } },
      );
      expect(result.current).toBe(false);

      rerender({ hp: 80 });
      expect(result.current).toBe(true);
      act(() => {
        vi.advanceTimersByTime(500);
      });
      expect(result.current).toBe(false);

      rerender({ hp: 100 }); // healing doesn't flash
      expect(result.current).toBe(false);
      rerender({ hp: undefined });
      expect(result.current).toBe(false);
    });
  });

  describe("useHitMarker", () => {
    it("shows a hit marker and bumps the ring key on each landed hit", () => {
      const { result } = renderHook(() => useHitMarker());
      expect(result.current).toEqual({ hitMarker: false, hitRingKey: 0 });
      emit("player-hit-landed");
      emit("player-hit-landed");
      expect(result.current).toEqual({ hitMarker: true, hitRingKey: 2 });
      act(() => {
        vi.advanceTimersByTime(300);
      });
      expect(result.current.hitMarker).toBe(false);
    });
  });

  describe("useMousePosition", () => {
    afterEach(() => {
      Object.defineProperty(document, "pointerLockElement", {
        value: null,
        configurable: true,
      });
    });

    it("follows the cursor until pointer lock, then pins to the viewport centre", () => {
      setViewport(1000, 600);
      const { result } = renderHook(() => useMousePosition());
      expect(result.current).toEqual({ x: 500, y: 300 });

      act(() => {
        window.dispatchEvent(
          new MouseEvent("mousemove", { clientX: 10, clientY: 20 }),
        );
      });
      expect(result.current).toEqual({ x: 10, y: 20 });

      // Resize / lock-change without lock: ignored.
      act(() => {
        window.dispatchEvent(new Event("resize"));
        document.dispatchEvent(new Event("pointerlockchange"));
      });
      expect(result.current).toEqual({ x: 10, y: 20 });

      Object.defineProperty(document, "pointerLockElement", {
        value: document.body,
        configurable: true,
      });
      act(() => {
        document.dispatchEvent(new Event("pointerlockchange"));
      });
      expect(result.current).toEqual({ x: 500, y: 300 });

      act(() => {
        window.dispatchEvent(
          new MouseEvent("mousemove", { clientX: 1, clientY: 1 }),
        );
      });
      expect(result.current).toEqual({ x: 500, y: 300 });

      setViewport(800, 400);
      act(() => {
        window.dispatchEvent(new Event("resize"));
      });
      expect(result.current).toEqual({ x: 400, y: 200 });
    });
  });

  describe("useGalleryHighScore", () => {
    type HsState = Pick<GameState, "isActive" | "mode" | "gameResults">;
    const finished = (score: number): HsState =>
      ({
        isActive: false,
        mode: "shooting_gallery",
        gameResults: [{ playerId: "p1", playerName: "P", score }],
      }) as unknown as HsState;

    it("loads the stored high score and records a new record", () => {
      localStorage.setItem("darkmoon_gallery_highscore", "150");
      const { result, rerender } = renderHook(
        ({ s }: { s: HsState }) => useGalleryHighScore(s),
        {
          initialProps: {
            s: { isActive: true, mode: "shooting_gallery" } as HsState,
          },
        },
      );
      expect(result.current).toEqual({
        galleryHighScore: 150,
        isNewRecord: false,
      });

      rerender({ s: finished(100) });
      expect(result.current.isNewRecord).toBe(false);

      rerender({ s: finished(200) });
      expect(result.current).toEqual({
        galleryHighScore: 200,
        isNewRecord: true,
      });
      expect(localStorage.getItem("darkmoon_gallery_highscore")).toBe("200");

      rerender({ s: { isActive: true, mode: "shooting_gallery" } as HsState });
      expect(result.current.isNewRecord).toBe(false);
    });

    it("ignores other modes and treats a missing score as zero", () => {
      const { result, rerender } = renderHook(
        ({ s }: { s: HsState }) => useGalleryHighScore(s),
        {
          initialProps: {
            s: {
              isActive: false,
              mode: "deathmatch",
              gameResults: [{ score: 999 }],
            } as unknown as HsState,
          },
        },
      );
      expect(result.current.galleryHighScore).toBe(0);
      rerender({
        s: {
          isActive: false,
          mode: "shooting_gallery",
          gameResults: [{}],
        } as unknown as HsState,
      });
      expect(result.current.isNewRecord).toBe(false);
    });

    it("survives storage failures", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      vi.spyOn(window.Storage.prototype, "getItem").mockImplementation(() => {
        throw new Error("blocked");
      });
      const { result, rerender } = renderHook(
        ({ s }: { s: HsState }) => useGalleryHighScore(s),
        {
          initialProps: {
            s: { isActive: true, mode: "shooting_gallery" } as HsState,
          },
        },
      );
      expect(result.current.galleryHighScore).toBe(0);
      rerender({ s: finished(50) });
      expect(result.current.isNewRecord).toBe(false);
      expect(warn).toHaveBeenCalledTimes(2);
    });
  });

  describe("useBonusRound", () => {
    it("shows the bonus banner for three seconds", () => {
      const { result } = renderHook(() => useBonusRound());
      emit("gallery-bonus-round");
      emit("gallery-bonus-round");
      expect(result.current).toBe(true);
      act(() => {
        vi.advanceTimersByTime(3_000);
      });
      expect(result.current).toBe(false);
    });
  });

  describe("useGalleryCombo", () => {
    it("tracks combo/multiplier from valid events only", () => {
      const { result } = renderHook(() => useGalleryCombo());
      emit("gallery-combo", { combo: "x", multiplier: 2 });
      expect(result.current).toEqual({ galleryCombo: 0, galleryMultiplier: 1 });
      emit("gallery-combo", { combo: 4, multiplier: 2 });
      expect(result.current).toEqual({ galleryCombo: 4, galleryMultiplier: 2 });
    });
  });

  describe("useCrosshairSpread", () => {
    it("widens per weapon, caps at 24 and recovers over time", () => {
      const { result } = renderHook(() => useCrosshairSpread());
      emit("weapon-fired", { weaponId: 42 });
      expect(result.current).toBe(0);
      emit("weapon-fired", { weaponId: "laser" });
      expect(result.current).toBe(3);
      emit("weapon-fired", { weaponId: "shotgun" });
      expect(result.current).toBe(9);
      emit("weapon-fired", { weaponId: "smg" });
      emit("weapon-fired", { weaponId: "smg" });
      emit("weapon-fired", { weaponId: "smg" });
      expect(result.current).toBe(24);
      act(() => {
        vi.advanceTimersByTime(50 * 20);
      });
      expect(result.current).toBe(0);
    });
  });

  describe("useScoreboard", () => {
    it("shows while the I key is held, hides on release or blur, and is inert when disabled", () => {
      const { result, rerender } = renderHook(
        ({ on }: { on: boolean }) => useScoreboard(on),
        { initialProps: { on: true } },
      );
      const key = (type: string, code: string) =>
        act(() => {
          window.dispatchEvent(new KeyboardEvent(type, { code }));
        });

      key("keydown", "KeyX");
      expect(result.current).toBe(false);
      key("keydown", "KeyI");
      expect(result.current).toBe(true);
      key("keyup", "KeyX");
      expect(result.current).toBe(true);
      key("keyup", "KeyI");
      expect(result.current).toBe(false);

      key("keydown", "KeyI");
      act(() => {
        window.dispatchEvent(new Event("blur"));
      });
      expect(result.current).toBe(false);

      key("keydown", "KeyI");
      rerender({ on: false });
      expect(result.current).toBe(false);
      key("keydown", "KeyI");
      expect(result.current).toBe(false);
    });
  });

  describe("usePickupToast", () => {
    it("announces weapon and health pickups, then clears", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const { result } = renderHook(() => usePickupToast());

      emit("weapon-pickup", { weaponId: 7 });
      emit("health-pickup", { amount: "lots" });
      expect(result.current).toBeNull();

      emit("weapon-pickup", { weaponId: "shotgun" });
      expect(result.current).toBe("PICKED UP PULSE SHOTGUN");

      emit("weapon-pickup", { weaponId: "banana" });
      expect(result.current).toBe("PICKED UP BANANA");
      expect(warn).toHaveBeenCalled();

      emit("health-pickup", { amount: 25 });
      expect(result.current).toBe("+25 HEALTH");

      act(() => {
        vi.advanceTimersByTime(2_200);
      });
      expect(result.current).toBeNull();
    });
  });

  describe("useKillAnnouncement", () => {
    type Feed = NonNullable<GameState["killFeed"]>;
    const kill = (killerId: string, weaponId: string, timestamp: number) =>
      ({
        killerId,
        killerName: killerId,
        targetId: "t",
        targetName: "Target",
        weaponId,
        timestamp,
      }) as Feed[number];

    it("announces only the local player's new kills and clears after two seconds", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const { result, rerender, unmount } = renderHook(
        ({ feed }: { feed: Feed | undefined }) =>
          useKillAnnouncement(feed, "me"),
        { initialProps: { feed: undefined as Feed | undefined } },
      );
      expect(result.current).toBeNull();

      rerender({ feed: [kill("bot", "laser", 1)] });
      expect(result.current).toBeNull();

      const mine = [kill("me", "rocket", 2)];
      rerender({ feed: mine });
      expect(result.current).toBe("Target [Rocket Launcher]");

      // Let the announcement expire, then re-render the same entry with a new
      // array identity: it must not be announced again.
      act(() => {
        vi.advanceTimersByTime(2_000);
      });
      expect(result.current).toBeNull();
      rerender({ feed: [...mine] });
      expect(result.current).toBeNull();

      rerender({ feed: [...mine, kill("me", "spork", 3)] });
      expect(result.current).toBe("Target [spork]");
      expect(warn).toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(2_000);
      });
      expect(result.current).toBeNull();

      rerender({ feed: [kill("me", "smg", 4)] });
      unmount(); // clears the pending timer
    });
  });
});
