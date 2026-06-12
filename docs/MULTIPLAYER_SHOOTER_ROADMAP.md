# Multiplayer Shooter Roadmap — "Robot Conker's Bad Fur Day"

**Status:** Phase 1 (tag stabilization) complete. This document defines Phase 2+.

## Context

`docs/CONKER_BFD_BUILD_GUIDE.md` is a generic implementation spec for a Conker's Bad Fur
Day-style game (context-sensitive actions, weapons, deathmatch, CTF, race, etc.). This
document translates that guide's relevant systems (Sections 5 and 9: Combat & Weapons,
Multiplayer Modes) into concrete, Darkmoon-anchored next steps — i.e. what to actually
change in _this_ codebase, in what order, building on the tag-mode foundation that now
lives in `src/components/GameManager.ts` and `src/components/characters/useBotAI.ts`.

Each phase below is a candidate for its own session/PR. Phases are ordered by
dependency: A is a prerequisite for B–D; E can happen incrementally alongside B–D.

---

## Phase A — Pluggable Game Modes (prerequisite for everything else)

**Why first:** `GameManager.tagPlayer`/`startTagGame`/`endGame`/`pickNewItPlayer` currently
hardcode tag-specific rules (`TAG_BACK_COOLDOWN_MS`, `TAG_FREEZE_MS`, `lastTaggedById`,
IT-transfer scoring) directly inside `GameManager`. Adding deathmatch or CTF by extending
this class would tangle unrelated rule sets together, the same way the original tag-back
bug tangled IT-transfer with cooldown state.

**Plan:**

- Define a small `GameModeHandler` interface (new file, e.g.
  `src/components/gameModes/GameModeHandler.ts`):
  ```ts
  interface GameModeHandler {
    onStart(players: Map<string, Player>, gameState: GameState): void;
    onTick(deltaTime: number, gameState: GameState): void;
    onAction(action: GameAction, gameState: GameState): boolean; // returns handled/accepted
    onEnd(gameState: GameState): GameResult[];
  }
  ```
- Extract the current tag rules into `src/components/gameModes/TagMode.ts`, implementing
  `GameModeHandler`. `tagPlayer(taggerId, taggedId)` becomes an `onAction({ type: "tag",
taggerId, taggedId })` call routed through the active mode.
- `GameManager` becomes a thin host: owns `players`/`gameState`, holds the active
  `GameModeHandler`, and delegates `startTagGame`/`tagPlayer`/`updateGameTimer`/`endGame`
  to it. Keep the existing public method names/signatures so `Bots.tsx`,
  `PlayerCharacter.tsx`, and `Solo.tsx` callers don't need to change.
- `GameMode` union type (already `"none" | "tag" | "collectible" | "race" | "solo"`)
  becomes the registry key for mode handlers.

**Acceptance:**

- `src/__tests__/gameManager.core.test.ts` and `gameManager.edgeCases.test.ts` pass
  unchanged (or with mechanical updates only — no behavioral rewrites).
- `Bots.test.tsx`'s "blocks an immediate IT ping-pong..." test still passes, proving
  `TagMode` preserves the `lastTaggedById`/cooldown semantics from Phase 1.

---

## Phase B — Combat Primitives

**Goal:** introduce the minimum weapon/damage model needed by Phases C and D.

- **`WeaponManager`** (new: `src/components/combat/WeaponManager.ts`): registry of weapon
  configs (`damage`, `range`, `cooldownMs`, `projectileSpeed`), `equip(weaponId)`,
  `fire(originId, direction)`. Mirrors the registry pattern in the build guide's
  `WeaponManager` (Section 5.2) but as plain TS (no Three.js scene mutation — that stays
  in the React layer).
- **Hit detection**: extend `src/components/CollisionSystem.ts` with a
  `checkProjectileHit(origin, direction, range, players)` method that mirrors the existing
  `checkPlayerCollision`-style proximity check used by tag's `tagDistance`, generalized to
  a ray/cone instead of a fixed radius.
- **`Player` additions** (`GameManager.ts`): `health?: number`, `maxHealth?: number`,
  `respawnAt?: number`. Damage/respawn flow follows the same "mutate player, fire
  callback" pattern as `tagPlayer`.
- **Vertical slice**: one weapon (e.g. a short-range "stun blaster") wired into solo mode
  as a toggle, reusing `SoundManager` for fire/hit SFX (`playTagSound`/`playTaggedSound`
  are good templates for `playWeaponFireSound`/`playHitSound`).

**Acceptance:**

- New `src/__tests__/weaponManager.test.ts` covering cooldown/ammo/equip, following the
  `makePlayer()` factory pattern from `gameManager.edgeCases.test.ts`.
- New collision tests for `checkProjectileHit`, following the `mountHook`/collision-mock
  pattern from `useBotAI.unit.test.tsx`'s "clamps flee movement..." test.

---

## Phase C — Deathmatch (maps to the build guide's `BeachMode`)

- **`DeathmatchMode`** implements `GameModeHandler`: tracks `kills: Map<playerId,
number>`, a `killLimit`, and a respawn timer (`respawnAt` from Phase B).
- `onAction({ type: "hit", attackerId, targetId })`: apply damage via `WeaponManager`'s
  configured damage; on `health <= 0`, increment `kills`, set `respawnAt`, zero `health`
  for respawn.
- **Scoreboard**: extend `GameUI.tsx`'s existing score display (it already renders
  `gameState.scores`) to show `kills` per player when `mode === "deathmatch"`.

**Acceptance:** regression tests for kill tracking, respawn timing, and end-of-game
results, mirroring `endGame()`'s existing results-sorting test in
`gameManager.core.test.ts`.

---

## Phase D — Capture the Flag (maps to the build guide's `HeistMode`)

- **Teams**: add `team?: "a" | "b"` to `Player`. Team assignment happens in
  `onStart` (alternate players, or balance by join order).
- **Flag entities**: simple data objects `{ team: "a" | "b", position: [number, number,
number], carrierId?: string }`, stored in `CTFMode` state (not on `Player`).
- **Capture zones**: reuse the bounds-check pattern from the build guide's
  `TriggerVolume` (Section 3.4) — a simple `containsPoint`-style check against each team's
  base position, run in `onTick`.
- `onAction({ type: "pickupFlag" | "captureFlag", playerId })` mutates flag
  `carrierId`/`position` and increments `gameState.scores[team]` on capture.

**Acceptance:** regression tests for pickup/capture/return sequences and the
"can't capture your own team's flag" edge case.

---

## Phase E — Polish

Incremental, can run alongside B–D:

- **Camera**: `PlayerCharacter.tsx` already manages a follow camera; add an "aiming" mode
  (over-the-shoulder offset, per build guide Section 10) when a weapon is equipped.
- **Audio**: extend `musicLayers.ts`/`soundEffects.ts` with a combat music layer that
  cross-fades in when `WeaponManager` reports recent fire/hit events, following the
  existing layered-music approach in `SoundManager.startBackgroundMusic`.
- **HUD**: `GameUI.tsx` gains health/ammo/kill/flag-status displays, gated by
  `gameState.mode` so tag mode's HUD is unaffected.

---

## Server-side tag parity (must-fix before Multiplayer Tag ships)

`FEATURES.md` lists Multiplayer Tag as `[planned]` (not live), so this is **not** a
current blocker — but it must be resolved before that feature ships, since it would
otherwise reintroduce the exact class of bug Phase 1 just fixed.

**Found in `server/index.js`:**

- The `player-tagged` handler (~lines 362–379) only checks
  `data.taggerId === gameState.itPlayerId` and that both clients exist — it has **no**
  equivalent of `TAG_BACK_COOLDOWN_MS` or `TAG_FREEZE_MS`, and trusts `data.taggedId` from
  the client with no server-side distance/eligibility check.
- The `disconnect` handler (~lines 393–409) deletes the disconnecting client from
  `clients` but never checks whether `gameState.itPlayerId === client.id`. If the IT
  player disconnects, `itPlayerId` keeps pointing at a non-existent client — no one can be
  tagged again until `game-end`/`game-start` resets it.

**Fix direction:** once Phase A lands, the server should hold a server-side
`GameManager`/`TagMode` instance as the source of truth (mirrors the client-authoritative
→ server-authoritative shift most multiplayer tag implementations need anyway), so the
same cooldown/freeze/IT-reassignment logic runs in one place. At minimum, before shipping:
port the `lastTaggedById`/cooldown/freeze checks into the `player-tagged` handler, and
reassign or clear `itPlayerId` (mirroring `GameManager.pickNewItPlayer`'s zero-players
branch) in the `disconnect` handler.

---

## Suggested sequencing

`A → B → C → D`, with `E` woven in incrementally. Server-side tag parity should be
addressed either as part of Phase A (if `TagMode` becomes shared client/server code) or
as a standalone fix immediately before Multiplayer Tag moves from `[planned]` to
`[in-progress]` in `FEATURES.md`.
