import * as React from "react";
import { useRef, useEffect, useCallback } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type GameManager from "../../../components/GameManager";

// ─── Target layout ────────────────────────────────────────────────────────────
// Three rows: back (large/10pt), mid (medium/25pt), front (small/50pt).
// Plus a rare bonus target (gold/100pt) that slowly moves across the middle.

interface TargetDef {
  id: string;
  row: 0 | 1 | 2;
  col: number;
  x: number;
  z: number;
  counterY: number; // top of the counter panel
  targetH: number; // target height (half-extent)
  targetW: number; // target width (half-extent)
  points: 10 | 25 | 50 | 100;
  color: string;
}

const ROWS: {
  z: number;
  xs: number[];
  counterY: number;
  h: number;
  w: number;
  pts: 10 | 25 | 50;
  color: string;
}[] = [
  // back row — large red targets, 10 pts
  {
    z: -20,
    xs: [-12, -6, 0, 6, 12],
    counterY: 1.6,
    h: 0.7,
    w: 0.45,
    pts: 10,
    color: "#ff3322",
  },
  // mid row — medium orange targets, 25 pts
  {
    z: -15,
    xs: [-9, -4.5, 0, 4.5, 9],
    counterY: 1.6,
    h: 0.5,
    w: 0.32,
    pts: 25,
    color: "#ff9933",
  },
  // front row — small yellow targets, 50 pts
  {
    z: -10,
    xs: [-6, -3, 0, 3, 6],
    counterY: 1.6,
    h: 0.35,
    w: 0.22,
    pts: 50,
    color: "#ffee00",
  },
];

function buildTargetDefs(): TargetDef[] {
  const defs: TargetDef[] = [];
  ROWS.forEach((row, ri) => {
    row.xs.forEach((x, ci) => {
      defs.push({
        id: `r${ri}c${ci}`,
        row: ri as 0 | 1 | 2,
        col: ci,
        x,
        z: row.z,
        counterY: row.counterY,
        targetH: row.h,
        targetW: row.w,
        points: row.pts,
        color: row.color,
      });
    });
  });
  return defs;
}

const TARGET_DEFS = buildTargetDefs();

// ─── Runtime target state ─────────────────────────────────────────────────────

interface TargetState {
  def: TargetDef;
  phase: "down" | "rising" | "up" | "falling" | "hit";
  y: number; // current world Y of target centre
  yDown: number; // hidden Y (below counter)
  yUp: number; // fully-visible Y
  phaseStartTime: number;
  upDuration: number; // how long this target stays up (ms)
  hitFlashUntil?: number; // timestamp when white flash should end
}

function makeTargetState(def: TargetDef, now: number): TargetState {
  const yDown = def.counterY - def.targetH - 0.02;
  const yUp = def.counterY + def.targetH + 0.05;
  return {
    def,
    phase: "down",
    y: yDown,
    yDown,
    yUp,
    phaseStartTime: now,
    upDuration: 2500,
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  gameManager: GameManager | null;
  currentPlayerId: string;
  isActive: boolean;
}

const ANIM_DURATION = 280; // ms for rising/falling transition
const MAX_UP = 5; // max targets simultaneously visible
const SPAWN_INTERVAL_MS = 900; // how often a new target pops up

const ShootingGallery: React.FC<Props> = ({
  gameManager,
  currentPlayerId,
  isActive,
}) => {
  const targets = useRef<TargetState[]>([]);
  const meshRefs = useRef<Map<string, THREE.Mesh>>(new Map()); // hitbox + material flash
  const groupRefs = useRef<Map<string, THREE.Group>>(new Map()); // position / visibility / scale
  const lastSpawnRef = useRef(0);
  const initialized = useRef(false);

  // Combo/streak tracking — resets on miss or after COMBO_BREAK_MS of inactivity.
  const comboRef = useRef(0);
  const comboLastHitRef = useRef(0);
  const COMBO_BREAK_MS = 3500;

  // Bonus duck that slides across the mid row
  const bonusMeshRef = useRef<THREE.Mesh | null>(null);
  const bonusX = useRef(-16);
  const bonusUp = useRef(false);
  const bonusY = useRef(0);
  const bonusYDown = ROWS[1].counterY - 0.5 - 0.02;
  const bonusYUp = ROWS[1].counterY + 0.5 + 0.05;
  const bonusLastAppear = useRef(0);
  const BONUS_INTERVAL = 12000; // appear every 12s

  // Initialize target states once
  const init = useCallback(
    (now: number) => {
      targets.current = TARGET_DEFS.map((def) => makeTargetState(def, now));
      meshRefs.current.clear();
      groupRefs.current.clear();
      bonusX.current = -16;
      bonusUp.current = false;
      bonusY.current = bonusYDown;
      bonusLastAppear.current = now + 4000; // first bonus after 4s
    },
    [bonusYDown],
  );

  useEffect(() => {
    if (!isActive) {
      initialized.current = false;
      return;
    }
    if (!initialized.current) {
      init(Date.now());
      initialized.current = true;
    }
  }, [isActive, init]);

  // Difficulty: as score grows, targets stay up for less time
  const getUpDuration = useCallback((): number => {
    const score = gameManager
      ? (gameManager.getGameState().scores[currentPlayerId] ?? 0)
      : 0;
    // starts at 2500ms, bottoms out at 1000ms at 500 pts
    return Math.max(1000, 2500 - score * 3);
  }, [gameManager, currentPlayerId]);

  // Raycasting hit detection — stored in a ref so mutations are allowed
  const raycasterRef = useRef(new THREE.Raycaster());

  const checkHit = useCallback(
    (originV: THREE.Vector3, dirV: THREE.Vector3, range: number): number => {
      raycasterRef.current.set(originV, dirV.clone().normalize());
      raycasterRef.current.far = range;

      const visibleMeshes: THREE.Mesh[] = [];
      targets.current.forEach((t) => {
        if (t.phase !== "up" && t.phase !== "rising") return;
        const mesh = meshRefs.current.get(t.def.id);
        if (mesh) visibleMeshes.push(mesh);
      });

      // Also check bonus duck
      if (bonusUp.current && bonusMeshRef.current) {
        visibleMeshes.push(bonusMeshRef.current);
      }

      const hits = raycasterRef.current.intersectObjects(visibleMeshes, false);
      if (hits.length === 0) return 0;

      const first = hits[0];
      const hitMesh = first.object as THREE.Mesh;

      // Bonus duck?
      if (hitMesh === bonusMeshRef.current) {
        bonusUp.current = false;
        if (gameManager) gameManager.recordGalleryShot(currentPlayerId, 100);
        window.dispatchEvent(new window.Event("player-hit-landed"));
        window.dispatchEvent(
          new window.CustomEvent("damage-number", {
            detail: {
              x: bonusX.current,
              y: bonusYUp + 0.3,
              z: ROWS[1].z,
              damage: 100,
            },
          }),
        );
        return 100;
      }

      // Normal target
      const hitId = [...meshRefs.current.entries()].find(
        ([, m]) => m === hitMesh,
      )?.[0];
      if (!hitId) return 0;

      const targetState = targets.current.find((t) => t.def.id === hitId);
      if (
        !targetState ||
        (targetState.phase !== "up" && targetState.phase !== "rising")
      )
        return 0;

      const pts = targetState.def.points;
      targetState.phase = "hit";
      targetState.phaseStartTime = Date.now();
      targetState.hitFlashUntil = Date.now() + 80;

      // Combo streak — counts consecutive hits; breaks on miss or 3.5s gap.
      if (Date.now() - comboLastHitRef.current > COMBO_BREAK_MS) {
        comboRef.current = 0;
      }
      comboRef.current++;
      comboLastHitRef.current = Date.now();
      const multiplier =
        comboRef.current >= 7
          ? 4
          : comboRef.current >= 5
            ? 3
            : comboRef.current >= 3
              ? 2
              : 1;
      const awardedPts = pts * multiplier;

      if (gameManager)
        gameManager.recordGalleryShot(currentPlayerId, awardedPts);
      window.dispatchEvent(new window.Event("player-hit-landed"));
      window.dispatchEvent(
        new window.CustomEvent("damage-number", {
          detail: {
            x: targetState.def.x,
            y: targetState.yUp + 0.3,
            z: targetState.def.z,
            damage: awardedPts,
          },
        }),
      );
      window.dispatchEvent(
        new window.CustomEvent("gallery-combo", {
          detail: { combo: comboRef.current, multiplier, pts: awardedPts },
        }),
      );
      return awardedPts;
    },
    [gameManager, currentPlayerId, bonusYUp],
  );

  // Listen for gallery-fire events dispatched by PlayerCharacter
  useEffect(() => {
    const onFire = (e: Event) => {
      if (!isActive) return;
      const d = (
        e as CustomEvent<{
          originX: number;
          originY: number;
          originZ: number;
          dirX: number;
          dirY: number;
          dirZ: number;
          range: number;
        }>
      ).detail;
      const origin = new THREE.Vector3(d.originX, d.originY, d.originZ);
      const dir = new THREE.Vector3(d.dirX, d.dirY, d.dirZ);
      const pts = checkHit(origin, dir, d.range);
      if (pts === 0 && gameManager) {
        // miss — count shot and break combo
        gameManager.recordGalleryShot(currentPlayerId, 0);
        comboRef.current = 0;
        window.dispatchEvent(
          new window.CustomEvent("gallery-combo", {
            detail: { combo: 0, multiplier: 1, pts: 0 },
          }),
        );
      }
    };
    window.addEventListener("gallery-fire", onFire);
    return () => window.removeEventListener("gallery-fire", onFire);
  }, [isActive, checkHit, gameManager, currentPlayerId]);

  useFrame(() => {
    if (!isActive || !initialized.current) return;
    const now = Date.now();

    // ── Animate existing targets ──────────────────────────────────────────
    targets.current.forEach((t) => {
      const mesh = meshRefs.current.get(t.def.id);
      const group = groupRefs.current.get(t.def.id);
      if (!mesh || !group) return;

      const elapsed = now - t.phaseStartTime;
      const frac = Math.min(1, elapsed / ANIM_DURATION);

      if (t.phase === "rising") {
        t.y = THREE.MathUtils.lerp(t.yDown, t.yUp, frac);
        if (frac >= 1) {
          t.phase = "up";
          t.phaseStartTime = now;
        }
      } else if (t.phase === "up") {
        t.y = t.yUp;
        if (elapsed >= t.upDuration) {
          t.phase = "falling";
          t.phaseStartTime = now;
        }
      } else if (t.phase === "falling" || t.phase === "hit") {
        t.y = THREE.MathUtils.lerp(t.yUp, t.yDown, frac);
        if (frac >= 1) {
          t.phase = "down";
          t.phaseStartTime = now;
        }
      } else {
        t.y = t.yDown;
      }

      group.position.y = t.y;
      group.visible = t.phase !== "down";

      // Scale pop on hit: briefly enlarge then let the fall animation take over.
      if (t.phase === "hit" && elapsed < 80) {
        const popT = elapsed / 80;
        group.scale.setScalar(1 + 0.4 * Math.sin(popT * Math.PI));
      } else {
        group.scale.setScalar(1);
      }

      // White flash when hit — mutate material color directly on the body mesh.
      if (t.hitFlashUntil) {
        const mat = mesh.material as THREE.MeshStandardMaterial;
        if (now < t.hitFlashUntil) {
          mat.color.set("#ffffff");
          mat.emissive.set("#ffffff");
          mat.emissiveIntensity = 2;
        } else {
          mat.color.set(t.def.color);
          mat.emissive.set(t.def.color);
          mat.emissiveIntensity = 0.4;
          t.hitFlashUntil = undefined;
        }
      }
    });

    // ── Spawn new targets ────────────────────────────────────────────────
    const upCount = targets.current.filter(
      (t) => t.phase === "up" || t.phase === "rising",
    ).length;
    if (upCount < MAX_UP && now - lastSpawnRef.current > SPAWN_INTERVAL_MS) {
      const down = targets.current.filter((t) => t.phase === "down");
      if (down.length > 0) {
        const pick = down[Math.floor(Math.random() * down.length)];
        pick.phase = "rising";
        pick.phaseStartTime = now;
        pick.upDuration = getUpDuration();
        lastSpawnRef.current = now;
      }
    }

    // ── Bonus duck ────────────────────────────────────────────────────────
    const bonusMesh = bonusMeshRef.current;
    if (bonusMesh) {
      if (!bonusUp.current) {
        if (now >= bonusLastAppear.current) {
          bonusUp.current = true;
          bonusX.current = -16;
          bonusLastAppear.current = now + BONUS_INTERVAL;
        }
        bonusY.current = THREE.MathUtils.lerp(bonusY.current, bonusYDown, 0.15);
      } else {
        bonusX.current += 0.05;
        bonusY.current = THREE.MathUtils.lerp(bonusY.current, bonusYUp, 0.12);
        if (bonusX.current > 16) {
          bonusUp.current = false;
        }
      }
      bonusMesh.position.set(bonusX.current, bonusY.current, ROWS[1].z);
      bonusMesh.visible = bonusUp.current || bonusY.current > bonusYDown + 0.05;
    }
  });

  if (!isActive) return null;

  return (
    <group>
      {/* ── Back wall ─────────────────────────────────────────────────── */}
      <mesh position={[0, 3, -22]} receiveShadow>
        <boxGeometry args={[32, 6, 0.3]} />
        <meshStandardMaterial color="#2a1a0a" roughness={0.9} />
      </mesh>

      {/* ── Side walls ───────────────────────────────────────────────── */}
      <mesh position={[-16, 3, -15]} receiveShadow>
        <boxGeometry args={[0.3, 6, 14]} />
        <meshStandardMaterial color="#2a1a0a" roughness={0.9} />
      </mesh>
      <mesh position={[16, 3, -15]} receiveShadow>
        <boxGeometry args={[0.3, 6, 14]} />
        <meshStandardMaterial color="#2a1a0a" roughness={0.9} />
      </mesh>

      {/* ── Counters (one per row) ────────────────────────────────────── */}
      {ROWS.map((row, ri) => (
        <group key={`counter-${ri}`}>
          {/* Counter top */}
          <mesh position={[0, row.counterY, row.z]} receiveShadow castShadow>
            <boxGeometry args={[32, 0.15, 0.6]} />
            <meshStandardMaterial color="#6b4e2e" roughness={0.7} />
          </mesh>
          {/* Counter front panel */}
          <mesh position={[0, row.counterY / 2, row.z + 0.3]} receiveShadow>
            <boxGeometry args={[32, row.counterY, 0.1]} />
            <meshStandardMaterial color="#4a331a" roughness={0.8} />
          </mesh>
        </group>
      ))}

      {/* ── Gallery floor strip ──────────────────────────────────────── */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.01, -15]}
        receiveShadow
      >
        <planeGeometry args={[32, 14]} />
        <meshStandardMaterial color="#1a1008" roughness={1} />
      </mesh>

      {/* ── Targets — silhouette groups (body + head) ───────────────── */}
      {TARGET_DEFS.map((def) => {
        const headR = def.row === 0 ? 0.3 : def.row === 1 ? 0.22 : 0.15;
        return (
          <group
            key={def.id}
            ref={(el) => {
              if (el) groupRefs.current.set(def.id, el);
              else groupRefs.current.delete(def.id);
            }}
            position={[def.x, def.counterY - def.targetH, def.z]}
            visible={false}
          >
            {/* Hitbox + body — used by raycaster */}
            <mesh
              ref={(el) => {
                if (el) meshRefs.current.set(def.id, el);
                else meshRefs.current.delete(def.id);
              }}
              castShadow
            >
              <boxGeometry args={[def.targetW * 2, def.targetH * 2, 0.12]} />
              <meshStandardMaterial
                color={def.color}
                emissive={def.color}
                emissiveIntensity={0.4}
                roughness={0.5}
              />
            </mesh>
            {/* Head sphere — classic carnival silhouette look */}
            <mesh position={[0, def.targetH + headR * 0.9, 0]} castShadow>
              <sphereGeometry args={[headR, 10, 8]} />
              <meshStandardMaterial
                color={def.color}
                emissive={def.color}
                emissiveIntensity={0.5}
                roughness={0.5}
              />
            </mesh>
          </group>
        );
      })}

      {/* Bonus duck (gold, wider, slides across mid row) */}
      <mesh
        ref={(el) => {
          bonusMeshRef.current = el;
        }}
        position={[-16, bonusYDown, ROWS[1].z]}
        visible={false}
        castShadow
      >
        <boxGeometry args={[0.55, 0.9, 0.14]} />
        <meshStandardMaterial
          color="#ffd700"
          emissive="#ffd700"
          emissiveIntensity={0.6}
          roughness={0.3}
          metalness={0.4}
        />
      </mesh>

      {/* ── Point labels (static signs above each row) ───────────────── */}
      {ROWS.map((row, ri) => (
        <mesh key={`sign-${ri}`} position={[14.5, row.counterY + 0.9, row.z]}>
          <boxGeometry args={[1.6, 0.55, 0.04]} />
          <meshStandardMaterial color="#111" roughness={1} />
        </mesh>
      ))}

      {/* ── Gallery lighting ─────────────────────────────────────────── */}
      {/* args=[color,intensity,distance] avoids react/no-unknown-property on 'distance' */}
      <pointLight args={["#fff8e7", 1.5, 20]} position={[0, 4, -15]} />
      <pointLight args={["#fff8e7", 0.8, 15]} position={[-10, 3.5, -18]} />
      <pointLight args={["#fff8e7", 0.8, 15]} position={[10, 3.5, -18]} />
    </group>
  );
};

export default ShootingGallery;
