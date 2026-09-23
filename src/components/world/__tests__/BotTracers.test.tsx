import * as React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import type * as THREE from "three";
import BotTracers from "../BotTracers";
import CTFBases from "../CTFBases";
import { TEAM_A_BASE, TEAM_B_BASE } from "../../gameModes/CTFMode";
import { renderR3F, inAct } from "../../../__tests__/r3f.test.utils";

const shot = (
  from: [number, number, number],
  to: [number, number, number],
  weaponId: string,
) =>
  window.dispatchEvent(
    new window.CustomEvent("bot-shot-fired", {
      detail: {
        fromX: from[0],
        fromY: from[1],
        fromZ: from[2],
        toX: to[0],
        toY: to[1],
        toZ: to[2],
        weaponId,
      },
    }),
  );

describe("BotTracers", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("draws a tracer at the shot midpoint, colored by weapon, and removes it shortly after", async () => {
    vi.useFakeTimers();
    const renderer = await renderR3F(<BotTracers />);
    expect(renderer.scene.children).toHaveLength(0);

    await inAct(() => shot([0, 0, 0], [0, 0, 10], "smg"));
    expect(renderer.scene.children).toHaveLength(1);
    const tracer = renderer.scene.children[0].instance as THREE.Group;
    expect(tracer.position.toArray()).toEqual([0, 0, 5]);
    const core = tracer.children[0] as THREE.Mesh;
    expect(
      (core.material as THREE.MeshBasicMaterial).color.getHexString(),
    ).toBe("ff44cc");

    await inAct(() => {
      vi.advanceTimersByTime(250);
    });
    expect(renderer.scene.children).toHaveLength(0);
    await renderer.unmount();
  });

  it("falls back to white for unknown weapons and ignores zero-length shots", async () => {
    vi.useFakeTimers();
    const renderer = await renderR3F(<BotTracers />);
    await inAct(() => {
      shot([1, 1, 1], [1, 1, 1], "laser"); // too short — ignored
      shot([0, 0, 0], [3, 0, 4], "mystery");
    });
    expect(renderer.scene.children).toHaveLength(1);
    const core = (renderer.scene.children[0].instance as THREE.Group)
      .children[0] as THREE.Mesh;
    expect(
      (core.material as THREE.MeshBasicMaterial).color.getHexString(),
    ).toBe("ffffff");
    await renderer.unmount();
  });

  it("caps the number of simultaneous tracers at thirty", async () => {
    vi.useFakeTimers();
    const renderer = await renderR3F(<BotTracers />);
    await inAct(() => {
      for (let i = 0; i < 35; i++) shot([0, 0, 0], [i + 1, 0, 0], "laser");
    });
    expect(renderer.scene.children).toHaveLength(30);
    await renderer.unmount();
  });
});

describe("CTFBases", () => {
  it("renders one base per team at the team base positions", async () => {
    const renderer = await renderR3F(<CTFBases />);
    const bases = renderer.scene.children.map((c) => c.instance as THREE.Group);
    expect(bases).toHaveLength(2);
    expect(bases[0].position.toArray()).toEqual([...TEAM_A_BASE]);
    expect(bases[1].position.toArray()).toEqual([...TEAM_B_BASE]);
    expect(bases[0].children).toHaveLength(4);
    await renderer.unmount();
  });
});
