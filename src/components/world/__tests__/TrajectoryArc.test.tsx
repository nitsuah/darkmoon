import * as React from "react";
import { describe, it, expect, vi } from "vitest";
import * as THREE from "three";
import { TrajectoryArc } from "../vfx/TrajectoryArc";
import { renderR3F } from "../../../__tests__/r3f.test.utils";

type LineProps = { points: THREE.Vector3[]; color: THREE.Color };
const lineRenders: LineProps[] = [];

// Replace drei's Line with a spy that records the props it was rendered with.
vi.mock("@react-three/drei", () => ({
  Line: (props: LineProps) => {
    lineRenders.push(props);
    return null;
  },
}));

const origin = new THREE.Vector3(0, 1.5, 0);
const forward = new THREE.Vector3(0, 0, -1);

async function arcFor(
  props: Partial<React.ComponentProps<typeof TrajectoryArc>>,
) {
  lineRenders.length = 0;
  const renderer = await renderR3F(
    <TrajectoryArc
      origin={origin}
      direction={forward}
      chargeProgress={0.5}
      isVisible
      {...props}
    />,
  );
  await renderer.unmount();
  return lineRenders.at(-1);
}

describe("TrajectoryArc", () => {
  it("renders nothing when hidden or uncharged", async () => {
    expect(await arcFor({ isVisible: false })).toBeUndefined();
    expect(await arcFor({ chargeProgress: 0 })).toBeUndefined();
  });

  it("plots a forward parabola that starts at the origin and stops at the ground", async () => {
    const arc = await arcFor({ chargeProgress: 1 });
    expect(arc).toBeDefined();
    const pts = arc!.points;
    expect(pts.length).toBeGreaterThan(2);
    expect(pts.length).toBeLessThanOrEqual(25);
    expect(pts[0].toArray()).toEqual([0, 1.5, 0]);
    // Moves forward along -z and never dips below ground.
    expect(pts[pts.length - 1].z).toBeLessThan(0);
    expect(pts.every((p) => p.y >= 0)).toBe(true);
    // Rises before it falls.
    expect(Math.max(...pts.map((p) => p.y))).toBeGreaterThan(1.5);
  });

  it("blends color from green to red with charge", async () => {
    const low = await arcFor({ chargeProgress: 0.01 });
    const full = await arcFor({ chargeProgress: 1 });
    expect(low!.color.g).toBeGreaterThan(low!.color.r);
    expect(full!.color.getHexString()).toBe("ff0000");
  });

  it("clamps very steep downward aim to a minimum launch angle", async () => {
    const arc = await arcFor({ chargeProgress: 1, cameraVertical: -10 });
    expect(arc!.points.length).toBeGreaterThan(1);
  });
});
