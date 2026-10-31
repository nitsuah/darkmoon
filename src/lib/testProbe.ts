export interface TestSnapshot {
  position: { x: number; y: number; z: number } | null;
  health: number | null;
  ammo: number | null;
  score: number | null;
}

export type GetSnapshot = () => TestSnapshot;

interface DarkmoonTestProbe {
  getSnapshot: () => TestSnapshot;
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
    };
  };

  window.__darkmoonTest = {
    getSnapshot: getSnapshotFn,
  };

  return () => {
    const current = window.__darkmoonTest;
    if (current?.getSnapshot === getSnapshotFn) {
      delete window.__darkmoonTest;
    }
  };
}
