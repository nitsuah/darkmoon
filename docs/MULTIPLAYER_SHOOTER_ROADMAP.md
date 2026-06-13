# Multiplayer Shooter Roadmap — "Robot Conker's Bad Fur Day"

**Status:** Phase 1 (tag stabilization) complete. Phase A (pluggable game modes)
complete. Phase B (combat primitives) complete. Phase C (deathmatch) complete end to
end — backend, gameplay wiring, and bot combat AI. Phase D (CTF) backend and gameplay
wiring (`CTFMode`, flags, teams, pickup/capture, Solo "Start CTF", team/flag HUD) are
implemented — bot AI for CTF is next.

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

## Phase A — Pluggable Game Modes (prerequisite for everything else) ✅ done

**Implemented:** `src/components/gameModes/GameModeHandler.ts` defines the
`onStart`/`onTick`/`onAction`/`onPlayerRemoved`/`onEnd` interface;
`src/components/gameModes/TagMode.ts` holds all tag-specific rules
(`TAG_BACK_COOLDOWN_MS`, `TAG_FREEZE_MS`, `lastTaggedById`, IT-transfer scoring).
`GameManager` is now a thin host that owns `players`/`gameState` and delegates to the
active `GameModeHandler` — its public API (`startTagGame`, `tagPlayer`,
`updateGameTimer`, `endGame`, `removePlayer`, ...) is unchanged, so no caller updates
were needed.

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

- ✅ **`WeaponManager`** (`src/components/combat/WeaponManager.ts`): registry of weapon
  configs (`laser`: `damage`, `range`, `cooldownMs`), `equip(weaponId)`/`unequip()`,
  `canFire(shooterId, now)`/`fire(shooterId, now)` with per-shooter cooldown tracking.
  Plain TS, no Three.js scene mutation — that stays in the React layer.
- ✅ **Hit detection**: `CollisionSystem.checkProjectileHit(origin, direction, range,
players, shooterId)` casts a ray and returns the closest hit `{ hitPlayerId, distance }`
  (or `null`), excluding the shooter and anyone outside the cone/range.
- ✅ **`Player` additions** (`GameManager.ts`): `health?: number`, `maxHealth?: number`,
  `respawnAt?: number`. Damage/respawn flow (mutate player, fire callback, mirroring
  `tagPlayer`) is implemented by the mode that needs it (Phase C `DeathmatchMode`).
- **Remaining — vertical slice**: wire `WeaponManager` + `checkProjectileHit` into Solo
  mode as a visible laser-fire action (keybind, beam visual, hit feedback), reusing
  `SoundManager` for fire/hit SFX (`playTagSound`/`playTaggedSound` are good templates for
  `playWeaponFireSound`/`playHitSound`). This is the next increment.

**Acceptance:**

- ✅ `src/components/combat/__tests__/WeaponManager.test.ts` covers equip/cooldown/
  per-shooter tracking/unequip.
- ✅ `src/components/__tests__/CollisionSystem.test.ts` covers `checkProjectileHit`
  (direct hit, out-of-range, off-axis miss, behind-shooter, closest-of-multiple).

---

## Phase C — Deathmatch (maps to the build guide's `BeachMode`) ✅ done

- ✅ **`DeathmatchMode`** implements `GameModeHandler`: tracks kills via
  `gameState.scores`, a `killLimit`, and a respawn timer (`respawnAt` from Phase B).
- ✅ `onAction({ type: "hit", attackerId, targetId, damage })`: apply damage; on
  `health <= 0`, increment the attacker's kill score, set `respawnAt`, and the target
  sits out until the respawn delay elapses.
- ✅ **Gameplay wiring**: Solo mode's "Start Deathmatch" lobby button, live health/kill
  scoreboard in `GameUI.tsx`, and per-frame position sync (`GameManager.updatePlayerPosition`)
  so projectile hits land on moving targets.
- ✅ **Bot combat AI**: `useBotAI` gained a deathmatch branch — bots chase to
  `FIRE_RANGE`, fire lasers via a shared `WeaponManager` (authoritative cooldown), and
  sit out (pulsing) while downed awaiting respawn.

**Acceptance:** regression tests for kill tracking, respawn timing, end-of-game
results, gameplay wiring, and bot fire behavior all pass (`gameManager.deathmatch.test.ts`,
`usePlayerWeapon.test.ts`, `GameUI.test.tsx`, `useBotAI.unit.test.tsx`, `Bots.test.tsx`).

---

## Phase D — Capture the Flag (maps to the build guide's `HeistMode`)

- ✅ **Teams**: `Player.team?: "a" | "b"`. `CTFMode.onStart` assigns teams by
  alternating join order.
- ✅ **Flag entities**: `CTFFlag { team, position, basePosition, carrierId? }`, stored
  on `gameState.flags` (not on `Player`), one per team, spawned at `TEAM_A_BASE`/
  `TEAM_B_BASE`.
- ✅ **Pickup/capture**: `onAction({ type: "pickupFlag" | "captureFlag", playerId })` —
  pickup only succeeds for the _enemy_ team's unguarded flag within `PICKUP_RADIUS`;
  capture only succeeds while carrying the enemy flag and standing within
  `CAPTURE_RADIUS` of your own team's base, and increments `gameState.scores[team]`.
- ✅ **Carried-flag tracking**: `onTick` syncs a carried flag's position to its
  carrier; `onPlayerRemoved` returns a dropped flag to its base.
- ✅ **Gameplay wiring**: Solo mode's "Start CTF" lobby button (gated on 2+ players,
  mirroring "Start Deathmatch"), a team-colored HUD showing team assignment and
  team scores (`gameState.scores["a"]`/`["b"]`), a "carrying flag" indicator, and
  proximity-based pickup/capture (`GameManager.pickupFlag`/`captureFlag` called from
  `Solo.tsx`'s per-frame position sync).
- **Remaining — bot AI** (follow-up PR, mirrors Phase C's split): bots currently stand
  idle during CTF; add pickup/capture/defend behavior to `useBotAI` (e.g. chase the
  enemy flag when unguarded, return to base when carrying, defend the home flag
  otherwise).

**Acceptance:** ✅ `gameManager.ctf.test.ts` covers team assignment, flag spawning,
pickup (including the "can't capture your own team's flag" edge case via the
pickup-rejection check), range gating, flag-follows-carrier, capture/score/return,
carrier-disconnect, and end-of-game team-score results. ✅ `GameUI.test.tsx` covers the
"Start CTF" lobby button and the team/score/carrying-flag HUD.

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
