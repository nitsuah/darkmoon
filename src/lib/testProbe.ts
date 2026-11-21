import { testControl, resetTestControl } from "./gameInput";

export interface TestTarget {
  id: string;
  position: { x: number; y: number; z: number };
  health: number | null;
}

export interface TestSnapshot {
  position: { x: number; y: number; z: number } | null;
  health: number | null;
  ammo: number | null;
  score: number | null;
  targets: TestTarget[];
}

export type GetSnapshot = () => TestSnapshot;

export type Vec3 = { x: number; y: number; z: number };

/** Game-side actions the probe needs that a snapshot cannot provide. */
export interface TestProbeActions {
  /** Move a target (a bot) to a world position; returns false if unknown. */
  placeTarget?: (targetId: string, position: Vec3) => boolean;
}

export interface DarkmoonTestProbe {
  getSnapshot: () => TestSnapshot;
  /** Aim the player's shots at a target's live position until cleared. */
  aimAt: (targetId: string) => boolean;
  /** Aim the player's shots at a fixed world point until cleared. */
  aimAtPoint: (point: Vec3) => void;
  clearAim: () => void;
  /** Equip a weapon by id on the next frame (e.g. "smg"). */
  setLoadout: (weaponId: string) => void;
  /** Pull the trigger once on the next frame (respects cooldown and ammo). */
  fire: () => void;
  /** Freeze bot AI: no movement, no firing. */
  freezeBots: (frozen: boolean) => void;
  /** Stop weapon pickups from swapping the player's weapon. */
  disablePickups: (disabled: boolean) => void;
  placeTarget: (targetId: string, position: Vec3) => boolean;
}

declare global {
  interface Window {
    __darkmoonTest?: DarkmoonTestProbe;
  }
}

export function installTestProbe(
  getSnapshot: GetSnapshot,
  enabled = import.meta.env.DEV === true,
  actions: TestProbeActions = {},
): () => void {
  if (!enabled || typeof window === "undefined") {
    return () => {};
  }

  const getSnapshotFn = () => {
    const snap = getSnapshot();
    return {
      position: snap.position ? { ...snap.position } : null,
      health: snap.health,
      ammo: snap.ammo,
      score: snap.score,
      targets: snap.targets.map((target) => ({
        ...target,
        position: { ...target.position },
      })),
    };
  };

  const findTarget = (targetId: string) =>
    getSnapshot().targets.find((target) => target.id === targetId) ?? null;

  window.__darkmoonTest = {
    getSnapshot: getSnapshotFn,
    aimAt: (targetId) => {
      if (!findTarget(targetId)) return false;
      // Resolve every frame so a moving target stays under the aim.
      testControl.aimPoint = () => {
        const target = findTarget(targetId);
        return target ? { ...target.position } : null;
      };
      return true;
    },
    aimAtPoint: (point) => {
      const fixed = { x: point.x, y: point.y, z: point.z };
      testControl.aimPoint = () => fixed;
    },
    clearAim: () => {
      testControl.aimPoint = null;
    },
    setLoadout: (weaponId) => {
      testControl.equip = weaponId;
    },
    fire: () => {
      testControl.fire = true;
    },
    freezeBots: (frozen) => {
      testControl.botsFrozen = frozen;
    },
    disablePickups: (disabled) => {
      testControl.pickupsDisabled = disabled;
    },
    placeTarget: (targetId, position) =>
      actions.placeTarget?.(targetId, { ...position }) ?? false,
  };

  return () => {
    const current = window.__darkmoonTest;
    if (current?.getSnapshot === getSnapshotFn) {
      delete window.__darkmoonTest;
      resetTestControl();
    }
  };
}
