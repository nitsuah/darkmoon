import { test, expect } from "@playwright/test";

type Position = { x: number; y: number; z: number };
type MovementSample = {
  scenario: string;
  keys: string[];
  start: Position;
  end: Position;
  delta: Position;
  magnitude: number;
  stopStart: Position;
  stopEnd: Position;
  residual: number;
  /** Steady-state speed in world units per second, from timestamped samples. */
  speed: number;
};

test("WASD movement changes position, stops after release, and normalizes diagonals", async ({
  page,
}, testInfo) => {
  test.setTimeout(90000);

  const pageErrors: string[] = [];
  page.on("pageerror", (error) => {
    // Ignore only the known container-only Vite HMR WebSocket error.
    if (error.stack?.includes("/@vite/client")) return;
    pageErrors.push(`${error.message}\n${error.stack ?? ""}`);
  });

  await page.addInitScript(() => {
    window.localStorage.setItem("darkmoon-tutorial-complete", "true");
  });
  await page.goto("/solo");

  const canvas = page.locator("canvas").first();
  await expect(canvas).toBeVisible({ timeout: 10000 });

  const hasPositionProbe = async () =>
    page.evaluate(() => {
      const probe = (
        window as Window & {
          __darkmoonTest?: {
            getSnapshot: () => { position: Position | null };
          };
        }
      ).__darkmoonTest;
      return Boolean(probe?.getSnapshot()?.position);
    });
  await expect.poll(hasPositionProbe, { timeout: 15000 }).toBe(true);

  const readPosition = async (): Promise<Position> => {
    const position = await page.evaluate(() => {
      const probe = (
        window as Window & {
          __darkmoonTest?: {
            getSnapshot: () => { position: Position | null };
          };
        }
      ).__darkmoonTest;
      return probe?.getSnapshot()?.position ?? null;
    });
    if (!position) throw new Error("Darkmoon test probe has no player position");
    return position;
  };

  // The solo scene spawns the player above ground. Wait for landing before
  // measuring release behavior: airborne momentum is intentionally preserved.
  await expect
    .poll(async () => (await readPosition()).y, { timeout: 15000 })
    .toBeLessThanOrEqual(0.01);
  await page.waitForTimeout(250);
  const groundedStart = await readPosition();
  await page.waitForTimeout(250);
  const groundedEnd = await readPosition();
  expect(
    Math.abs(groundedEnd.y - groundedStart.y),
    `player should remain grounded before movement: ${JSON.stringify({ groundedStart, groundedEnd })}`,
  ).toBeLessThanOrEqual(0.01);

  // Position plus a page-side timestamp, so speed does not depend on how long
  // the CI runner took to deliver each CDP round-trip.
  const readTimedPosition = async (): Promise<{ position: Position; t: number }> => {
    return page.evaluate(() => {
      const position = (
        window as Window & {
          __darkmoonTest?: { getSnapshot: () => { position: Position | null } };
        }
      ).__darkmoonTest?.getSnapshot()?.position;
      if (!position) throw new Error("Darkmoon test probe has no player position");
      return { position, t: performance.now() };
    });
  };

  const displacement = (start: Position, end: Position): Position => ({
    x: end.x - start.x,
    y: end.y - start.y,
    z: end.z - start.z,
  });
  const magnitude = (vector: Position) =>
    Math.hypot(vector.x, vector.y, vector.z);
  const cosine = (a: Position, b: Position) => {
    const denominator = magnitude(a) * magnitude(b);
    if (denominator === 0) return 0;
    return (a.x * b.x + a.y * b.y + a.z * b.z) / denominator;
  };

  const samples: MovementSample[] = [];
  const measure = async (
    scenario: string,
    keys: string[],
  ): Promise<MovementSample> => {
    const start = await readPosition();
    // Send multi-key chords without awaiting each CDP round-trip in between.
    // Sequential awaits let the first key move alone for one input latency
    // (~1 frame in CI's software-GL Chromium), which inflates the diagonal
    // sample and made the normalization check depend on render speed.
    await Promise.all(keys.map((key) => page.keyboard.down(key)));
    let speed = 0;
    try {
      // Let acceleration finish, then measure speed over a window that is
      // timestamped on the page: the game integrates with dt, so speed (units/s)
      // is frame-rate independent while displacement after a fixed wait is not.
      await page.waitForTimeout(800);
      const a = await readTimedPosition();
      await page.waitForTimeout(600);
      const b = await readTimedPosition();
      const horizontal = displacement(a.position, b.position);
      speed = Math.hypot(horizontal.x, horizontal.z) / ((b.t - a.t) / 1000);
    } finally {
      await Promise.all(
        [...keys].reverse().map((key) => page.keyboard.up(key)),
      );
    }

    // Allow the existing movement deceleration to settle, then sample twice.
    await page.waitForTimeout(500);
    const stopStart = await readPosition();
    await page.waitForTimeout(300);
    const stopEnd = await readPosition();

    const delta = displacement(start, stopStart);
    const sample: MovementSample = {
      scenario,
      keys,
      start,
      end: stopStart,
      delta,
      magnitude: magnitude(delta),
      stopStart,
      stopEnd,
      residual: magnitude(displacement(stopStart, stopEnd)),
      speed,
    };
    samples.push(sample);
    return sample;
  };

  const expected = {
    minimumCardinalMagnitude: 0.5,
    oppositeCosineMaximum: -0.9,
    perpendicularAbsoluteCosineMaximum: 0.3,
    maximumResidualAfterRelease: 0.05,
    maximumDiagonalToCardinalRatio: 1.05,
  };

  try {
    const w = await measure("W", ["w"]);
    const s = await measure("S", ["s"]);
    const a = await measure("A", ["a"]);
    const d = await measure("D", ["d"]);
    const diagonal = await measure("W+D", ["w", "d"]);

    for (const sample of [w, s, a, d, diagonal]) {
      expect(
        sample.magnitude,
        `${sample.scenario} displacement: ${JSON.stringify(sample)}`,
      ).toBeGreaterThanOrEqual(expected.minimumCardinalMagnitude);
      expect(
        sample.residual,
        `${sample.scenario} residual movement after release: ${JSON.stringify(sample)}`,
      ).toBeLessThanOrEqual(expected.maximumResidualAfterRelease);
    }

    expect(cosine(w.delta, s.delta)).toBeLessThan(
      expected.oppositeCosineMaximum,
    );
    expect(cosine(a.delta, d.delta)).toBeLessThan(
      expected.oppositeCosineMaximum,
    );
    expect(Math.abs(cosine(w.delta, a.delta))).toBeLessThan(
      expected.perpendicularAbsoluteCosineMaximum,
    );

    // Diagonal input must not be faster than a cardinal one (compare speeds,
    // not displacements, so a slow or fast render loop cannot decide the result).
    const cardinalSpeed = Math.max(w.speed, d.speed);
    expect(
      diagonal.speed,
      `diagonal speed vs cardinal: ${JSON.stringify({ w: w.speed, d: d.speed, diagonal: diagonal.speed })}`,
    ).toBeLessThanOrEqual(cardinalSpeed * expected.maximumDiagonalToCardinalRatio);
    expect(pageErrors, "uncaught application errors during movement").toEqual(
      [],
    );
  } catch (error) {
    await testInfo.attach("movement-report.json", {
      body: Buffer.from(
        JSON.stringify(
          {
            scenario: "WASD displacement, release-stop, and diagonal normalization",
            inputs: samples.map(({ scenario, keys }) => ({ scenario, keys })),
            expected,
            actual: samples,
            pageErrors,
          },
          null,
          2,
        ),
      ),
      contentType: "application/json",
    });
    throw error;
  } finally {
    for (const key of ["w", "a", "s", "d"]) {
      await page.keyboard.up(key).catch(() => {});
    }
  }
});
