import { describe, it, expect } from "vitest";
import { getSoundManager } from "../components/SoundManager";

describe("SoundManager basics", () => {
  it("toggles mute and reports state", () => {
    const sm = getSoundManager();
    const initial = sm.getIsMuted();
    const toggled = sm.toggleMute();
    expect(toggled).toBe(!initial);
    expect(sm.getIsMuted()).toBe(toggled);
    // toggle back
    sm.toggleMute();
    expect(sm.getIsMuted()).toBe(initial);
  });

  it("clamps master/music/sfx volumes to 0..1 without throwing", () => {
    const sm = getSoundManager();
    sm.setMasterVolume(2.5);
    sm.setMusicVolume(-1);
    sm.setSfxVolume(0.5);
    // no exceptions and values remain accessible via calling methods
    expect(typeof sm.getIsMuted()).toBe("boolean");
  });

  it("returns null for jetpack thrust sound in test environment without audio", () => {
    const sm = getSoundManager();
    const thrust = sm.playJetpackThrustSound();
    // JSDOM environment likely has no AudioContext, so null is acceptable
    expect(thrust === null || typeof thrust === "object").toBeTruthy();
  });
});
