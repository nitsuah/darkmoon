import * as React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
import KillFeed from "../KillFeed";
import { KillEvent } from "../../../GameManager";
import { WEAPONS } from "../../../combat/WeaponManager";

const makeKill = (overrides: Partial<KillEvent> = {}): KillEvent => ({
  killerId: "k1",
  killerName: "Killer",
  targetId: "t1",
  targetName: "Target",
  weaponId: "laser",
  timestamp: Date.now(),
  ...overrides,
});

describe("KillFeed", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("renders nothing when kills array is empty", () => {
    const { container } = render(<KillFeed kills={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("shows killer name, weapon display name in brackets, arrow, and target name for weapon kill", () => {
    const kill = makeKill({ weaponId: "smg" });
    const { container } = render(<KillFeed kills={[kill]} />);
    const text = container.textContent ?? "";
    expect(text).toContain("Killer");
    expect(text).toContain(`[${WEAPONS.smg.name}]`);
    expect(text).toContain("→");
    expect(text).toContain("Target");
    expect(text).not.toContain("tagged");
  });

  it("shows 'tagged' between names for tag weapon, no brackets", () => {
    const kill = makeKill({ weaponId: "tag" });
    const { container } = render(<KillFeed kills={[kill]} />);
    const text = container.textContent ?? "";
    expect(text).toContain("Killer");
    expect(text).toContain("tagged");
    expect(text).toContain("Target");
    expect(text).not.toContain("[");
    expect(text).not.toContain("]");
  });

  it("falls back to weaponId in brackets for unknown weapon", () => {
    const kill = makeKill({ weaponId: "mystery" });
    const { container } = render(<KillFeed kills={[kill]} />);
    const text = container.textContent ?? "";
    expect(text).toContain("[mystery]");
  });

  it("renders three entries for three kills", () => {
    const kills = [
      makeKill({ timestamp: 1000 }),
      makeKill({ timestamp: 2000, targetName: "Target2" }),
      makeKill({ timestamp: 3000, targetName: "Target3" }),
    ];
    const { container } = render(<KillFeed kills={kills} />);
    const root = container.firstChild as HTMLElement;
    const entries = root?.children ?? [];
    expect(entries.length).toBe(3);
  });

  it("renders both kills with same killer/target but different timestamps (distinct keys, no React key warning)", () => {
    const kills = [
      makeKill({ timestamp: 1000 }),
      makeKill({ timestamp: 2000 }),
    ];
    render(<KillFeed kills={kills} />);
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });
});
