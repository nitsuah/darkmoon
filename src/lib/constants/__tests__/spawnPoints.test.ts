import { describe, it, expect, vi, afterEach } from "vitest";
import { SPAWN_POINTS, pickSafeSpawn } from "../spawnPoints";

describe("pickSafeSpawn", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("picks a random spawn point when there are no enemies", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.99);
    expect(pickSafeSpawn([])).toBe(SPAWN_POINTS[SPAWN_POINTS.length - 1]);
  });

  it("picks the spawn point farthest from the nearest enemy", () => {
    // Enemies clustered on the +x side → spawn at the far -x point.
    expect(
      pickSafeSpawn([
        [12, 0, 0],
        [10, 0, 10],
        [10, 0, -10],
      ]),
    ).toEqual([-12, 0.5, 0]);
    // A single enemy at the north point → a far southern corner (24.2 away)
    // beats the south point (24 away); ties keep the first candidate.
    expect(pickSafeSpawn([[0, 0, -12]])).toEqual([-10, 0.5, 10]);
  });
});
