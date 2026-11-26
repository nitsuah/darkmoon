export const MAP_PX = 180;
export const ARENA = 50;

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function toMapCoord(worldVal: number): number {
  return ((worldVal + ARENA) / (ARENA * 2)) * MAP_PX;
}
