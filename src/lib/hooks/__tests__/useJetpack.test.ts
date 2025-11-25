import { describe, it, expect } from "vitest";
import {
  computeJetpackThrust,
  shouldActivateJetpackFromMobile,
} from "../useJetpack";

const constants = { JETPACK_MAX_HOLD_TIME: 2, JETPACK_HOLD_FORCE: 5 };

describe("useJetpack", () => {
  it("computes thrust correctly at start of hold", () => {
    const thrust = computeJetpackThrust(0, 0.1, constants);
    expect(thrust).toBeGreaterThan(0);
  });

  it("decays thrust as hold time increases", () => {
    const t1 = computeJetpackThrust(0.5, 0.1, constants);
    const t2 = computeJetpackThrust(1.5, 0.1, constants);
    expect(t2).toBeLessThan(t1);
  });

  it("returns zero when hold exceeded", () => {
    const t = computeJetpackThrust(3, 0.1, constants);
    expect(t).toBe(0);
  });

  it("activates jetpack for mobile double-tap", () => {
    expect(shouldActivateJetpackFromMobile(true)).toBe(true);
    expect(shouldActivateJetpackFromMobile(false)).toBe(false);
  });
});
