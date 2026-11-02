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
    for (const key of keys) await page.keyboard.down(key);
    try {
      await page.waitForTimeout(1400);
    } finally {
      for (const key of [...keys].reverse()) await page.keyboard.up(key);
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
    };
    samples.push(sample);
    return sample;
  };

  const expected = {
    holdMs: 1400,
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

    const cardinalMagnitude = Math.max(w.magnitude, d.magnitude);
    expect(diagonal.magnitude).toBeLessThanOrEqual(
      cardinalMagnitude * expected.maximumDiagonalToCardinalRatio,
    );
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
