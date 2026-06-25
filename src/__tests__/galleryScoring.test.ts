/**
 * Unit tests for computeGalleryAward — the pure scoring function extracted
 * from ShootingGallery.tsx to make combo × multiplier × bonus-round math
 * independently verifiable without any React or Three.js context.
 *
 * Test naming convention: "<scenario> → <expected pts>"
 */
import { describe, it, expect } from "vitest";
import { computeGalleryAward } from "../pages/Solo/components/ShootingGallery";

describe("computeGalleryAward — combo multipliers", () => {
  // ── Base multipliers ────────────────────────────────────────────────────
  it("combo 0 → multiplier 1 (no streak)", () => {
    const { awardedPts, multiplier } = computeGalleryAward(10, 0, false);
    expect(multiplier).toBe(1);
    expect(awardedPts).toBe(10);
  });

  it("combo 1 → multiplier 1", () => {
    const { multiplier } = computeGalleryAward(10, 1, false);
    expect(multiplier).toBe(1);
  });

  it("combo 2 → multiplier 1 (threshold not yet reached)", () => {
    const { multiplier } = computeGalleryAward(10, 2, false);
    expect(multiplier).toBe(1);
  });

  it("combo 3 → multiplier 2 (first threshold)", () => {
    const { awardedPts, multiplier } = computeGalleryAward(25, 3, false);
    expect(multiplier).toBe(2);
    expect(awardedPts).toBe(50);
  });

  it("combo 4 → multiplier 2", () => {
    const { multiplier } = computeGalleryAward(25, 4, false);
    expect(multiplier).toBe(2);
  });

  it("combo 5 → multiplier 3", () => {
    const { awardedPts, multiplier } = computeGalleryAward(10, 5, false);
    expect(multiplier).toBe(3);
    expect(awardedPts).toBe(30);
  });

  it("combo 6 → multiplier 3", () => {
    const { multiplier } = computeGalleryAward(10, 6, false);
    expect(multiplier).toBe(3);
  });

  it("combo 7 → multiplier 4 (max)", () => {
    const { awardedPts, multiplier } = computeGalleryAward(50, 7, false);
    expect(multiplier).toBe(4);
    expect(awardedPts).toBe(200);
  });

  it("combo 20 → multiplier 4 (capped at max)", () => {
    const { multiplier } = computeGalleryAward(10, 20, false);
    expect(multiplier).toBe(4);
  });

  // ── Bonus round doubles the total ───────────────────────────────────────
  it("bonus round doubles pts with no combo (1 × 2)", () => {
    const { awardedPts, multiplier } = computeGalleryAward(25, 0, true);
    expect(multiplier).toBe(1);
    expect(awardedPts).toBe(50);
  });

  it("bonus round + combo 3 → 2× combo × 2× bonus = 4× base", () => {
    const { awardedPts } = computeGalleryAward(10, 3, true);
    expect(awardedPts).toBe(40); // 10 × 2 × 2
  });

  it("bonus round + combo 5 → 3× combo × 2× bonus = 6× base", () => {
    const { awardedPts } = computeGalleryAward(10, 5, true);
    expect(awardedPts).toBe(60); // 10 × 3 × 2
  });

  it("bonus round + combo 7 → 4× combo × 2× bonus = 8× base (maximum)", () => {
    const { awardedPts } = computeGalleryAward(50, 7, true);
    expect(awardedPts).toBe(400); // 50 × 4 × 2
  });

  // ── Point values for each target type ───────────────────────────────────
  it("10pt back-row target with multiplier 4 → 40pts", () => {
    const { awardedPts } = computeGalleryAward(10, 7, false);
    expect(awardedPts).toBe(40);
  });

  it("25pt mid-row target with multiplier 2 → 50pts", () => {
    const { awardedPts } = computeGalleryAward(25, 3, false);
    expect(awardedPts).toBe(50);
  });

  it("50pt front-row target with no combo → 50pts", () => {
    const { awardedPts } = computeGalleryAward(50, 0, false);
    expect(awardedPts).toBe(50);
  });

  it("100pt bonus duck with no combo → 100pts", () => {
    const { awardedPts, multiplier } = computeGalleryAward(100, 0, false);
    expect(awardedPts).toBe(100);
    expect(multiplier).toBe(1);
  });

  // ── Multiplier boundary: one below each threshold ───────────────────────
  it("combo just below 3 (2) does NOT trigger x2", () => {
    const { multiplier } = computeGalleryAward(10, 2, false);
    expect(multiplier).toBe(1);
  });

  it("combo just below 5 (4) does NOT trigger x3", () => {
    const { multiplier } = computeGalleryAward(10, 4, false);
    expect(multiplier).toBe(2);
  });

  it("combo just below 7 (6) does NOT trigger x4", () => {
    const { multiplier } = computeGalleryAward(10, 6, false);
    expect(multiplier).toBe(3);
  });
});

describe("computeGalleryAward — return shape", () => {
  it("always returns both awardedPts and multiplier fields", () => {
    const result = computeGalleryAward(10, 0, false);
    expect(result).toHaveProperty("awardedPts");
    expect(result).toHaveProperty("multiplier");
    expect(typeof result.awardedPts).toBe("number");
    expect(typeof result.multiplier).toBe("number");
  });

  it("awardedPts is always a positive integer for positive inputs", () => {
    for (const pts of [10, 25, 50, 100]) {
      for (const combo of [0, 3, 5, 7]) {
        const { awardedPts } = computeGalleryAward(pts, combo, false);
        expect(awardedPts).toBeGreaterThan(0);
        expect(Number.isInteger(awardedPts)).toBe(true);
      }
    }
  });
});
