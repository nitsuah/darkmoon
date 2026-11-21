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

interface DarkmoonTestProbe {
  getSnapshot: () => TestSnapshot;
  aimAt: (targetId: string) => void;
}

declare global {
  interface Window {
    __darkmoonTest?: DarkmoonTestProbe;
  }
}

export function installTestProbe(
  getSnapshot: GetSnapshot,
  enabled = import.meta.env.DEV === true,
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

  const aimAt = (targetId: string) => {
    const snap = getSnapshot();
    const target = snap.targets.find(t => t.id === targetId);
    if (!target) return;

    // Calculate direction vector from player to target
    const px = snap.position?.x ?? 0;
    const py = snap.position?.y ?? 0;
    const pz = snap.position?.z ?? 0;
    const tx = target.position.x;
    const ty = target.position.y;
    const tz = target.position.z;

    // Calculate yaw (horizontal rotation) and pitch (vertical rotation)
    const dx = tx - px;
    const dy = ty - py;
    const dz = tz - pz;

    const yaw = Math.atan2(dx, dz);
    const pitch = Math.atan2(dy, Math.sqrt(dx * dx + dz * dz));

    // Set camera orientation (dev-only)
    // In a real implementation, this would interface with the camera control system
    // For now, we'll just log the values as the actual camera control mechanism
    // is not specified in the provided codebase
    console.log(`Setting camera orientation: yaw=${yaw}, pitch=${pitch}`);
  };

  window.__darkmoonTest = {
    getSnapshot: getSnapshotFn,
    aimAt: aimAt,
  };

  return () => {
    const current = window.__darkmoonTest;
    if (current?.getSnapshot === getSnapshotFn) {
      delete window.__darkmoonTest;
    }
  };
}