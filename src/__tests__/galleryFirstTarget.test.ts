import { describe, it, expect } from "vitest";
import {
  FIRST_TARGET_ID,
  pickTargetToRaise,
} from "../pages/Solo/components/ShootingGallery";

const down = ["r0c0", FIRST_TARGET_ID, "r2c4"].map((id) => ({ def: { id } }));

describe("pickTargetToRaise", () => {
  it("raises the straight-ahead target first, whatever the random value", () => {
    expect(pickTargetToRaise(down, FIRST_TARGET_ID, 0).def.id).toBe(
      FIRST_TARGET_ID,
    );
    expect(pickTargetToRaise(down, FIRST_TARGET_ID, 0.99).def.id).toBe(
      FIRST_TARGET_ID,
    );
  });

  it("picks at random after the first target", () => {
    expect(pickTargetToRaise(down, null, 0).def.id).toBe("r0c0");
    expect(pickTargetToRaise(down, null, 0.99).def.id).toBe("r2c4");
  });
});
