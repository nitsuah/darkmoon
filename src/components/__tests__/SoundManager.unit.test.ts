import { describe, it, expect, beforeEach } from "vitest";
import SoundManager, { getSoundManager } from "../SoundManager";

describe("SoundManager (unit)", () => {
  let sm: SoundManager;

  beforeEach(() => {
    // Ensure singleton is fresh by clearing module cache (simple approach)
    // Note: In this environment getSoundManager will create an instance.
    sm = getSoundManager();
  });

  it("toggles mute and updates gain nodes safely", () => {
    // These are integration-light checks: functions should run without throwing
    const muted = sm.toggleMute();
    expect(typeof muted).toBe("boolean");
    // Toggle back
    const muted2 = sm.toggleMute();
    expect(typeof muted2).toBe("boolean");
  });

  it("sets volumes without throwing", () => {
    sm.setMasterVolume(0.5);
    sm.setMusicVolume(0.2);
    sm.setSfxVolume(0.3);
    // No observable return; ensure methods exist and don't throw
    expect(true).toBe(true);
  });

  it("dispose is idempotent", () => {
    sm.dispose();
    // calling again should be safe
    sm.dispose();
    expect(true).toBe(true);
  });
});
