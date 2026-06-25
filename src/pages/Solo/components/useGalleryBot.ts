import * as React from "react";
import { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { createGalleryLogger } from "../../../lib/utils/logger";
import type { GalleryBotConfig } from "./GalleryBotConfig";
import type { TargetState } from "./ShootingGallery";

const log = createGalleryLogger("Bot");

/**
 * Gallery bot hook — runs inside the R3F Canvas (called from ShootingGallery).
 *
 * When enabled, the bot picks targets, computes a jittered aim ray, and
 * dispatches gallery-fire events just like a real player would. All logging
 * goes to the gallery namespace so you can filter in DevTools by "[GALLERY".
 *
 * Diagnostic info is logged per shot:
 *   ✅ HIT  r1c2 (25pts) dist=15.2m  jitter=1.8°  combo×2
 *   ❌ MISS r0c0 (10pts) dist=22.4m  jitter=5.4°  (intentional miss)
 */
export function useGalleryBot(
  targets: React.MutableRefObject<TargetState[]>,
  isActive: boolean,
  enabled: boolean,
  config: GalleryBotConfig,
): void {
  const { camera } = useThree();

  // When each target first became visible (rising or up) — reset on hide.
  const targetSeenAtRef = useRef<Map<string, number>>(new Map());
  // Timestamp of the last shot fired.
  const lastShotRef = useRef(0);
  // Info about the most-recent shot, used to correlate with gallery-combo events.
  const lastShotInfoRef = useRef<{
    targetId: string;
    pts: number;
    jitterDeg: number;
    intentionalMiss: boolean;
    firedAt: number;
  } | null>(null);

  // Listen to gallery-combo events to log hit/miss diagnostics.
  useEffect(() => {
    const onCombo = (e: unknown) => {
      const d = (
        e as { detail: { combo: number; pts: number; multiplier: number } }
      ).detail;
      const shot = lastShotInfoRef.current;
      // Ignore stale correlations (>300 ms old — event dispatch is synchronous but
      // useEffect listener fires next micro-task, so this window is generous).
      if (!shot || Date.now() - shot.firedAt > 300) return;

      if (d.pts > 0) {
        log(
          `✅ HIT  ${shot.targetId} (${shot.pts}pts → ${d.pts}pts)`,
          `jitter=${shot.jitterDeg.toFixed(1)}°`,
          `combo×${d.multiplier}`,
        );
      } else {
        log(
          `❌ MISS ${shot.targetId} (${shot.pts}pts)`,
          `jitter=${shot.jitterDeg.toFixed(1)}°`,
          shot.intentionalMiss ? "[forced miss]" : "[aim spread]",
        );
      }
      lastShotInfoRef.current = null;
    };
    window.addEventListener("gallery-combo", onCombo);
    return () => window.removeEventListener("gallery-combo", onCombo);
  }, []);

  useFrame(() => {
    if (!isActive || !enabled) return;

    const now = Date.now();

    // ── Update visibility tracking ───────────────────────────────────────
    const seen = targetSeenAtRef.current;
    targets.current.forEach((t) => {
      const visible = t.phase === "rising" || t.phase === "up";
      if (visible && !seen.has(t.def.id)) {
        seen.set(t.def.id, now);
      } else if (!visible) {
        seen.delete(t.def.id);
      }
    });

    // ── Rate-limit fire ─────────────────────────────────────────────────
    if (now - lastShotRef.current < config.shotIntervalMs) return;

    // ── Find targets the bot is ready to shoot ───────────────────────────
    const readyTargets = targets.current.filter((t) => {
      if (t.phase !== "up" && t.phase !== "rising") return false;
      const seenAt = seen.get(t.def.id) ?? now;
      return now - seenAt >= config.reactionMs;
    });

    if (readyTargets.length === 0) return;

    // Human hesitation: occasionally skip a frame to simulate indecision.
    if (config.hesitate && Math.random() < 0.15) return;

    // ── Pick a target ─────────────────────────────────────────────────────
    let target: TargetState;
    switch (config.targetStrategy) {
      case "highest_value":
        target = readyTargets.reduce((best, t) =>
          t.def.points > best.def.points ? t : best,
        );
        break;
      case "nearest": {
        const cx = camera.position.x;
        const cz = camera.position.z;
        target = readyTargets.reduce((best, t) => {
          const da = Math.hypot(t.def.x - cx, t.def.z - cz);
          const db = Math.hypot(best.def.x - cx, best.def.z - cz);
          return da < db ? t : best;
        });
        break;
      }
      case "front_first":
        // Highest Z = closest row to the camera (gallery is set forward of Z=0).
        target = readyTargets.reduce((best, t) =>
          t.def.z > best.def.z ? t : best,
        );
        break;
      default: // "random"
        target = readyTargets[Math.floor(Math.random() * readyTargets.length)];
    }

    // ── Compute aim direction ─────────────────────────────────────────────
    const targetPos = new THREE.Vector3(target.def.x, target.y, target.def.z);
    const cameraPos = camera.position.clone();
    const dist = cameraPos.distanceTo(targetPos);
    const perfectDir = targetPos.clone().sub(cameraPos).normalize();

    // Determine if this shot is an intentional miss (missChance fires).
    const intentionalMiss =
      config.missChance > 0 && Math.random() < config.missChance;

    let jitterRad = 0;
    let aimDir = perfectDir.clone();

    if (intentionalMiss) {
      // Force the ray to clear the hitbox: aim far enough sideways to miss.
      const hitboxHalfW = target.def.targetW;
      const hitboxAngle = Math.atan2(hitboxHalfW, Math.max(dist, 1));
      // 1.8–3× the hitbox half-angle guarantees a miss at this distance.
      jitterRad = hitboxAngle * (1.8 + Math.random() * 1.2);
    } else if (config.aimJitterRad > 0) {
      jitterRad = (Math.random() - 0.5) * 2 * config.aimJitterRad;
    }

    if (jitterRad !== 0) {
      // Independent horizontal + vertical jitter (more realistic than single-axis).
      const hJitter =
        jitterRad * (Math.random() < 0.5 ? 1 : -1) * Math.random();
      const vJitter =
        jitterRad * (Math.random() < 0.5 ? 1 : -1) * Math.random() * 0.6;
      const worldUp = new THREE.Vector3(0, 1, 0);
      const right = new THREE.Vector3()
        .crossVectors(perfectDir, worldUp)
        .normalize();
      aimDir = perfectDir.clone();
      aimDir.applyAxisAngle(worldUp, hJitter);
      aimDir.applyAxisAngle(right, vJitter);
      aimDir.normalize();
    }

    const jitterDeg = (Math.abs(jitterRad) * 180) / Math.PI;

    // ── Record shot info for diagnostic correlation ───────────────────────
    lastShotInfoRef.current = {
      targetId: target.def.id,
      pts: target.def.points,
      jitterDeg,
      intentionalMiss,
      firedAt: now,
    };

    log(
      `🎯 ${target.def.id} (${target.def.points}pts)`,
      `dist=${dist.toFixed(1)}m`,
      `jitter=${jitterDeg.toFixed(1)}°`,
      intentionalMiss ? "[forcing miss]" : "",
    );

    window.dispatchEvent(
      new window.CustomEvent("gallery-fire", {
        detail: {
          originX: cameraPos.x,
          originY: cameraPos.y,
          originZ: cameraPos.z,
          dirX: aimDir.x,
          dirY: aimDir.y,
          dirZ: aimDir.z,
          range: 80,
        },
      }),
    );

    lastShotRef.current = now;
  });
}
