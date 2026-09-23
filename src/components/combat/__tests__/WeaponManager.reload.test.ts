import { describe, it, expect, vi, afterEach } from "vitest";
import { WeaponManager, WEAPONS } from "../WeaponManager";
import {
  SPAWN_POINTS,
  pickSafeSpawn,
} from "../../../lib/constants/spawnPoints";

describe("WeaponManager reloads, reserves and charging", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  function emptyMagazine(wm: WeaponManager, id: string, start = 0) {
    wm.equip(id);
    const cfg = WEAPONS[id];
    let t = start;
    for (let i = 0; i < (cfg.maxAmmo ?? 0); i++) {
      expect(wm.fire("me", t)).not.toBeNull();
      t += cfg.cooldownMs;
    }
    return t;
  }

  it("reports reserve ammo per weapon", () => {
    const wm = new WeaponManager();
    expect(wm.getReserveAmmo("nope")).toBeUndefined();
    expect(wm.getReserveAmmo("laser")).toBeNull();
    expect(wm.getReserveAmmo("smg")).toBe(200); // untracked → config default
    expect(wm.getAmmo("laser")).toBeNull();
  });

  it("runs a timed reload that blocks firing, then refills from reserves", () => {
    const wm = new WeaponManager();
    const t = emptyMagazine(wm, "shotgun");
    expect(wm.canFire("me", t)).toBe(false);

    expect(wm.startReload("shotgun", t)).toBe(true);
    expect(wm.startReload("shotgun", t)).toBe(false); // already reloading
    expect(wm.getReloadProgress("shotgun", t + 1_100)).toBeCloseTo(0.5);
    expect(wm.isReloading("shotgun", t + 1_100)).toBe(true);
    expect(wm.canFire("me", t + 1_100)).toBe(false);

    // canFire completes the finished reload.
    expect(wm.canFire("me", t + 2_200)).toBe(true);
    expect(wm.getAmmo("shotgun")).toBe(6);
    expect(wm.getReserveAmmo("shotgun")).toBe(24);
    expect(wm.getReloadProgress("shotgun", t + 2_200)).toBeNull();
  });

  it("refuses to reload a full, non-reloadable or reserve-less weapon", () => {
    const wm = new WeaponManager();
    wm.equip("shotgun");
    expect(wm.startReload("shotgun", 0)).toBe(false); // full
    expect(wm.startReload("laser", 0)).toBe(false); // no reload time
    expect(wm.getReloadProgress("laser")).toBeNull();

    // Drain all 30 reserve shells (five 6-round reloads).
    let t = 0;
    for (let mag = 0; mag < 5; mag++) {
      t = emptyMagazine(wm, "shotgun", t);
      wm.startReload("shotgun", t);
      wm.completeReloadNow("shotgun");
    }
    expect(wm.getReserveAmmo("shotgun")).toBe(0);
    t = emptyMagazine(wm, "shotgun", t);
    expect(wm.startReload("shotgun", t)).toBe(false);
  });

  it("only partially refills when reserves run low", () => {
    const wm = new WeaponManager();
    let t = 0;
    // Rocket: 3 in the mag, 9 in reserve.
    for (let mag = 0; mag < 3; mag++) {
      t = emptyMagazine(wm, "rocket", t);
      wm.startReload("rocket", t);
      wm.completeReloadNow("rocket");
    }
    expect(wm.getAmmo("rocket")).toBe(3);
    expect(wm.getReserveAmmo("rocket")).toBe(0);
    wm.fire("me", t);
    wm.refill("rocket");
    expect(wm.getAmmo("rocket")).toBe(2);
  });

  it("completeReloadNow is a no-op unless a reload is in progress", () => {
    const wm = new WeaponManager();
    const t = emptyMagazine(wm, "smg");
    wm.completeReloadNow("smg");
    expect(wm.getAmmo("smg")).toBe(0);
    wm.startReload("smg", t);
    wm.completeReloadNow("smg");
    expect(wm.getAmmo("smg")).toBe(40);
  });

  it("refill lazily initialises reserves and ignores infinite-ammo weapons", () => {
    const wm = new WeaponManager();
    wm.refill("laser");
    expect(wm.getAmmo("laser")).toBeNull();
    // Never equipped: the untracked magazine counts as empty, so a full
    // magazine is drawn from the lazily-initialised 9-round reserve.
    wm.refill("grenade");
    expect(wm.getAmmo("grenade")).toBe(3);
    expect(wm.getReserveAmmo("grenade")).toBe(6);
  });

  it("refills to max for weapons without tracked reserves", () => {
    const original = WEAPONS.shotgun.reserveAmmo;
    WEAPONS.shotgun.reserveAmmo = undefined;
    try {
      const wm = new WeaponManager();
      emptyMagazine(wm, "shotgun");
      wm.refill("shotgun");
      expect(wm.getAmmo("shotgun")).toBe(6);
      expect(wm.getReserveAmmo("shotgun")).toBeNull();
    } finally {
      WEAPONS.shotgun.reserveAmmo = original;
    }
  });

  it("restocks magazine and reserves, cancelling any reload", () => {
    const wm = new WeaponManager();
    const t = emptyMagazine(wm, "smg");
    wm.startReload("smg", t);
    wm.restock("smg");
    expect(wm.getAmmo("smg")).toBe(40);
    expect(wm.getReserveAmmo("smg")).toBe(200);
    expect(wm.isReloading("smg", t)).toBe(false);
    wm.restock("unknown"); // ignored
    wm.restock("laser"); // nothing to restock
    expect(wm.getAmmo("laser")).toBeNull();
  });

  it("auto-reloads weapons flagged autoReload when emptied", () => {
    WEAPONS.smg.autoReload = true;
    try {
      const wm = new WeaponManager();
      const t = emptyMagazine(wm, "smg");
      expect(wm.isReloading("smg", t)).toBe(true);
    } finally {
      delete WEAPONS.smg.autoReload;
    }
  });

  it("tracks grenade charge progress and duration", () => {
    const wm = new WeaponManager();
    wm.equip("grenade");
    expect(wm.getChargeProgress("grenade", 0)).toBe(0);
    expect(wm.stopCharge("grenade")).toBeNull();

    wm.startCharge("laser", 0); // not chargeable
    expect(wm.isCharging("laser")).toBe(false);
    expect(wm.getChargeProgress("laser", 0)).toBe(0);

    vi.spyOn(Date, "now").mockReturnValue(1_500);
    wm.startCharge("grenade", 1_000);
    expect(wm.isCharging("grenade")).toBe(true);
    expect(wm.getChargeProgress("grenade", 2_000)).toBeCloseTo(0.5);
    expect(wm.getChargeProgress("grenade", 9_000)).toBe(1);
    expect(wm.stopCharge("grenade")).toBe(500);
    expect(wm.isCharging("grenade")).toBe(false);

    // Unequipping mid-charge cancels the charge.
    wm.startCharge("grenade", 0);
    wm.unequip();
    expect(wm.isCharging("grenade")).toBe(false);
    wm.unequip(); // idempotent with nothing equipped
    expect(wm.fire("me", 0)).toBeNull();
  });
});

describe("pickSafeSpawn", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("picks a random spawn point when there are no enemies", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.99);
    expect(pickSafeSpawn([])).toBe(SPAWN_POINTS[SPAWN_POINTS.length - 1]);
  });

  it("picks the spawn point farthest from the nearest enemy", () => {
    // Enemies clustered on the +x side → spawn at the far -x point.
    expect(
      pickSafeSpawn([
        [12, 0, 0],
        [10, 0, 10],
        [10, 0, -10],
      ]),
    ).toEqual([-12, 0.5, 0]);
    // A single enemy at the north point → a far southern corner (24.2 away)
    // beats the south point (24 away); ties keep the first candidate.
    expect(pickSafeSpawn([[0, 0, -12]])).toEqual([-10, 0.5, 10]);
  });
});
