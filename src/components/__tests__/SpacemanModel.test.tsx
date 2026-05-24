import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import SpacemanModel from "../SpacemanModel";

vi.mock("@react-three/fiber", () => ({
  useFrame: vi.fn(),
}));

describe("SpacemanModel", () => {
  it("renders baseline geometry without jetpack flames", () => {
    const { container } = render(
      <SpacemanModel isIt={false} isJetpackActive={false} />,
    );

    const meshes = container.querySelectorAll("mesh");
    const cones = container.querySelectorAll("conegeometry");

    expect(meshes.length).toBeGreaterThan(10);
    expect(cones.length).toBe(0);
  });

  it("renders jetpack flames and it-glow branches", () => {
    const { container } = render(
      <SpacemanModel
        isIt={true}
        isJetpackActive={true}
        isSprinting={true}
        velocity={[2, 0, 1]}
        cameraRotation={0.8}
        color="#ff4444"
      />,
    );

    const cones = container.querySelectorAll("conegeometry");
    const materials = container.querySelectorAll("meshbasicmaterial");

    expect(cones.length).toBeGreaterThanOrEqual(6);
    expect(materials.length).toBeGreaterThan(3);
  });
});
