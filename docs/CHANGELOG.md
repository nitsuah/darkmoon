# Changelog

> 🧭 [darkmoon](../README.md) · [Features](./FEATURES.md) · [Roadmap](./ROADMAP.md) · [Tasks](./TASKS.md) · **Changelog** · [Metrics](./METRICS.md) <!-- nav -->

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Kill-and-score E2E** — `e2e/kill-score.spec.ts` plays a deathmatch round through the dev-only probe: a lethal burst at a placed, frozen bot awards the player exactly one kill and downs the target, and further shots into the respawn window change neither score nor health. Assertions are on outcomes (score, health, ammo), never on fixed waits (#481).
- **Movement E2E measures speed, not displacement** — the diagonal-normalization check in `e2e/movement.spec.ts` now compares page-timestamped speeds (units/s) instead of distance after a fixed 1.4 s hold, which flaked when the software-GL runner dropped frames (#481).
- **Nightly live crawl** — `.github/workflows/live-crawl.yml` runs `tests/live/crawl.spec.ts` (config `config/playwright.live.config.ts`, `BASE_URL` overridable) against https://darkmoon.dev through the shared journeys harness: `/` 200 with HSTS and nosniff, `/qa-junk-path` a real 404, `/health` JSON, hashed `/assets/*.js` immutable, and a clean landing load. Failures become deduplicated `bot:journey` issues (#543).
- **Cloudflare Pages edge config** — `public/_headers` adds HSTS and `X-Content-Type-Options` everywhere and serves hashed `/assets/*` as `public, max-age=31536000, immutable`; `public/404.html` plus `public/_redirects` (`/play`, `/solo`) make unknown paths a real 404 instead of the SPA shell; `functions/health.js` answers `GET /health` with JSON instead of `index.html`. Covered by `src/__tests__/pagesConfig.test.ts` (nitsuah/darkmoon#535).
- **Nightly journeys** — `.github/workflows/journeys.yml` runs `tests/journeys` (landing → solo start, shooting gallery, theme persistence) nightly in the pinned Playwright image against `vite preview` of the production build, with DOM-step baselines; failures become deduplicated `bot:journey` issues. `promo/spots.json` records the feature map for the showcase standard.
- **SEO basics** — `index.html` declares `https://darkmoon.dev/` as canonical, and `public/robots.txt` plus `public/sitemap.xml` point crawlers at it; the stale Netlify status badge is gone from the README (#536).
- **CI e2e runs every spec** — the `e2e` job now runs the `e2e/` directory instead of naming `smoke` and `movement`, so new `e2e/*.spec.ts` files run without a workflow edit.
- **Darkmoon dev test probe** — exposes other players/bots with finite positions and health for deterministic aim/fire E2E assertions; remains development-only (#532).
- **Reticle vs firing-ray E2E** — `e2e/aim-reticle.spec.ts` asserts the on-screen reticle centre and the camera ray through NDC (0, 0) are the same ray after the mouse moves, the camera rotates and the viewport resizes, and that a shot along that ray hits while one off it misses, with no aim override. The dev-only probe gains `getAimRays()` (the weapon publishes the camera in dev builds only) and the reticle has a `data-testid`. Real-mouse feel under pointer lock still needs a human (#482, #481).
- **Aim/fire/damage E2E** — `e2e/aim-fire.spec.ts` starts deathmatch and checks a hit (1 ammo, SMG damage), a miss 90° off (1 ammo, no damage) and an empty magazine (no damage). The dev-only test probe gains `aimAt`, `aimAtPoint`, `clearAim`, `setLoadout`, `fire`, `freezeBots`, `disablePickups` and `placeTarget`; shots still go through the real weapon and hit path, and the probe stays out of production builds (#497).
- **Mobile wallet sign-in via WalletConnect** — when `VITE_WALLETCONNECT_PROJECT_ID` is set, the `/play` sign-in gate also offers phone wallets through a QR code. The provider loads only when chosen.
- **Wallet sign-in for multiplayer** — the `/play` lobby asks the player to sign a one-time message with any injected browser wallet (EIP-6963 or `window.ethereum`). The server verifies the signature (`viem`) and issues a session token, and refuses any socket without one. Endpoints: `POST /auth/nonce`, `POST /auth/verify`; optional `WALLET_AUTH_SECRET`. See `docs/API.md` → Wallet sign-in. Covered by `server/walletAuth.js` and `src/lib/wallet/walletAuth.ts` tests.
- **Multiplayer readiness gate** (PR #418) — `server/logger.js` (structured JSON logging), `server/cors.js` (shared HTTP/WebSocket origin allowlist), `server/health.js`, `server/port.js`, and `server/tagAuthorization.js`; SIGTERM graceful shutdown; 96 new server tests. See `docs/projects/multi/MULTIPLAYER_GATE.md`.
- **Mobile controls overhaul** (PR #417) — reworked touch joystick, aim assist, and responsive HUD; mobile input verified functional via browser emulation.
- **E2E how-to in README** — README documents running a single Playwright scenario in the `solo` container, reading `test-results/e2e-report.json`, opening traces, and downloading the `darkmoon-e2e-diagnostics` CI artifact (#498).
- **Dependabot grouping** — `minor`/`patch` npm updates and GitHub Actions updates now group into single PRs instead of one-per-dependency.

### Removed

- Dead web3 wallet CSS (`.poly-wallet`, `.neutral-wallet`, `.connect-wallet-container`, `.connect-wallet-button`, `.eth-wallet`) left in `src/styles/App.css` after the wallet auth was removed; no markup referenced these classes.

### Fixed

- The crosshair is locked to the viewport centre on desktop without pointer lock too, so the firing direction matches the reticle (#482).
- CORS wildcard matcher escaping and single-DNS-label scoping; bare `ALLOWED_ORIGINS=*` no longer combines with `credentials: true`.
- `/health` SPA-fallback ordering and `maxPlayers` validation.
- `player-tagged` socket handler now binds `taggerId` to the authenticated socket instead of trusting client-supplied IDs.
- **Server-side multiplayer tag parity** — `server/tagAuthorization.js` ports `TagMode.applyTag`'s cooldown/freeze rules (`TAG_BACK_COOLDOWN_MS`/`TAG_FREEZE_MS`/`lastTaggedById` pairing) into the server's `player-tagged` handler; a new `server/itHandoff.js` reassigns `itPlayerId` to a remaining player (or ends the round if none remain) on disconnect instead of leaving it pointing at a disconnected client.
- **`.husky/pre-push` validating a stale Docker test image** — `docker compose run` without `--build` reused whatever `darkmoon-test:latest` image already existed locally regardless of source changes; added `--build` so the image rebuilds first (fast via layer cache when nothing changed) whenever Docker is available. When Docker isn't available, the hook prints that same command as a manual fallback and exits 1 rather than running it.
- **P0: downed player could still move** — `PlayerMovement.tsx` now checks `respawnAt` and freezes movement/jump/jetpack for a player awaiting respawn, matching the existing weapon/tag lockout for that state; also clears any in-flight jetpack thrust (flame, sound, velocity) so a player downed mid-thrust doesn't resume with stale physics after respawning.
- **Grenade charge/throw used two different buttons** — charging was bound to `rightClick` in `PlayerCharacter.tsx` while the throw fired on `leftClick` held in `PlayerWeapon.tsx`. Consolidated hold-to-charge/release-to-throw into `PlayerWeapon.tsx`, keyed on `leftClick` throughout.
- **Rocket/grenade splash damage missing in Tag mode** — `TagMode` didn't apply `splashRadius`/`splashDamage` to bystanders the way `DeathmatchMode`/`CTFMode` do, and even after adding it, splash was skipped whenever the direct hit came from the IT player (the tag-transfer branch returned before splash ran). Both paths now apply splash.
- **Mobile joystick camera inversion** — the touch camera joystick's vertical axis used `+=` while both mouse-look paths use `-=` for the same screen-space delta convention, inverting vertical look for touch users relative to desktop.
- **Desktop jetpack double-jump missing** — a second SPACE press while airborne now activates the jetpack (rising-edge detection with a 600ms window), mirroring the existing mobile double-tap flow.
- **Shooting-gallery bot forced misses** now actually clear the hitbox (#457).
- **Home page bottom cards clipped on desktop** — an unconditional `.App { overflow: hidden }` rule outranked the mobile-only scroll fix at equal specificity, clipping content on any viewport once it exceeded one screen's height. `.App` now scrolls vertically.

### Security

- Patched transitive `js-yaml` to 4.3.2 for CVE-2026-84375 (#451).

### Changed

- CI: repo-health shared kit pinned to `nitsuah/.github@a0df883` (was `7d3c243`), which no longer ships the stale `msgpack` advisory row.
- **Changed:** `netlify.toml` gains a production-only `ignore` command, so a push to `main` deploys only when something outside docs, tests, CI config or promo assets changed. Each production deploy costs 15 Netlify credits, and docs/test-only merges no longer spend them. Deploy previews are unaffected, and a missing `CACHED_COMMIT_REF` makes the check fail open so the build still runs.
- Solo mode runs offline and no longer connects to the multiplayer server, so the server's wallet gate cannot be bypassed by connecting as solo.
- Agent instructions (`.github/copilot-instructions.md`) now require closing tracked work in the same PR: update `docs/TASKS.md`, `docs/ROADMAP.md` and this changelog before the last push, and confirm `git diff origin/main...HEAD --stat` includes them before merge; added `.github/pull_request_template.md` with a "Closes TASKS item(s)" checklist.
- Test coverage raised from ~74% to ~96% lines (#456).
- Dependabot now ignores `eslint` semver-major updates until `eslint-plugin-jsx-a11y` supports eslint 10 (#446); stops the recurring eslint 10 PR that fails `npm ci` with ERESOLVE.
- Dependency bumps: vitest 5.0 (#441) and grouped minor/patch updates (#444, #450, #453).
- Dependency bumps: jsdom 31 (supersedes #526), grouped minor/patch updates (supersedes #525), typescript-eslint 8.72.2, prettier 3.10.1, viem 2.57.19; lockfile regenerated so `npm ci` is in sync again. The `three` override now references the direct dependency (`"$three"`) so Dependabot can bump it instead of failing with "Override for three conflicts with direct dependency".
- three 0.180 → 0.187 (supersedes #528, whose Dependabot lockfile dropped nested `typescript@5.9.3` / `@noble/hashes@2.4.0` entries and broke `npm ci`); lockfile regenerated, typecheck/lint/843 tests/build pass. The e2e WASD diagonal check now presses/releases chord keys concurrently: sequential key round-trips let W move alone for ~1 frame, and three 0.187's ~10% slower software-GL frames pushed the diagonal/cardinal ratio past 1.05 in CI.
- `CHANGELOG.md` and `FEATURES.md` moved into `docs/` (#460); multiplayer planning docs live under `docs/projects/multi/`.

### Docs

- Planning docs reset for 2027 (`pmo-ff`): completed roadmap items condensed into FEATURES/CHANGELOG, all open 2026 items carried into 2027 Q1, stale `docs/MULTIPLAYER_*` paths fixed, breadcrumb navigation + README docs index added.
- Documentation audit passes (PRs #409, #419, #420): refreshed METRICS.md coverage/test figures, corrected README test-count staleness, archived the superseded `docs/ROADMAP_DETAILED.md`, and updated `docs/projects/conkers/TECH_DEBT.md` to reflect the completed mobile-controls and `PlayerCharacter.tsx` refactor items.

## [1.1.0] - 2026-08-08

### Added

- **ShotgunVFX component** — cone particle burst effect for every shotgun shot, rendered in the 3D scene (`src/pages/Solo/components/ShotgunVFX.tsx`)
- **Reserve ammo system** — `reserveAmmo` field on `Player`, tracked and decremented in `WeaponManager`; HUD displays magazine/reserve separately
- **Tag mode health** — `TagMode` now initializes `health: 100 / maxHealth: 100` on each player and handles `"hit"` actions for damage in tag mode, enabling weapon-based interactions without disrupting IT-transfer logic
- **Reload precision meter v2** — timing-based snap mechanic overlays the reload bar; landing the indicator in the snap zone grants an instant reload bonus
- **Homepage redesign** — glassmorphism game-mode cards, feature-highlight section, roadmap teaser section, and mobile-first CTA ("Play Now →") replacing the previous card-flip interaction; meta/OG social preview updated
- **Favicon** — emoji favicon (`🌑`) added to `index.html`
- **`useGameStart` hook** — mode-specific start logic and `ensureBot` helper extracted from `Solo.tsx`
- **`useBotPositionHandlers` hook** — per-frame position sync, CTF flag pickup/capture, and bot position updates extracted from `Solo.tsx`
- **`useDebugModes` hook** — `useBotDebugMode`, `useGalleryDebugMode`, and `useAutoRestart` sub-hooks extracted from `Solo.tsx`
- **15 GameUI sub-components** — `GameUI.tsx` (2,078 lines) split into focused components under `src/components/GameUI/components/`: `DamageFlash`, `HitDirectionIndicator`, `KillAnnouncement`, `PickupToast`, `ScoreBoard`, `KillFeed`, `MinimapRadar`, `Crosshair`, `BottomHUD`, `DeathScreen`, `StreakAnnouncement`, `BonusRoundOverlay`, `GameStatusPanel`, `GameResultsScreen`, `GameLobbyPanel`; original `GameUI.tsx` kept as a barrel re-export
- **`useGameUIState.ts` hook** — all event-driven HUD state (damage flash, hit direction, hit marker, mouse position, gallery state, crosshair spread, scoreboard, pickup toast, kill announcements) extracted from the GameUI monolith
- **Documentation compliance** — Comprehensive FEATURES.md, TASKS.md, and METRICS.md added for Overseer integration
- **Expanded test suite** — 74 test files, 558 passing tests (up from 62 files / 371 tests); new tests cover A/D camera-relative strafe, `botDebugMode` hitbox prop wiring, TagMode health, and more

### Changed

- **Weapon swap key bindings** — Tab (weapon swap), Q/E (strafe-like swap aliases) captured via module-level frozen `GAMEPLAY_KEYS` constant in `Solo.tsx`; scoreboard toggled with `I` (was Tab) to avoid conflict; BottomHUD hint updated to `[Tab]swap [I]scores`
- **A/D camera-relative strafing** — fixed strafe direction computation to be relative to current camera yaw, not world axes
- **Crosshair positioning** — moved from `top`/`left` layout properties to `transform: translate()` for GPU-composited, layout-thrash-free mouse tracking
- **`tensionWarning` memoisation** — wrapped in `React.useMemo` to avoid recomputing on every mouse-move render
- **Crosshair spread decay** — replaced self-rescheduling `setTimeout` chain with a single `setInterval` running once per mount
- **Scoreboard blur reset** — `useScoreboard` now listens to `window blur` to clear the scoreboard when the tab loses focus
- **`GameUI/index.tsx` type safety** — `onPlayAgain` guarded with `mode !== "none" && mode !== "solo"` before casting; `currentPlayer!` non-null assertion replaced with `currentPlayer &&` guard
- **Security patches** — `ip-address` and `socket.io-parser` CVEs patched via dependency upgrades
- **Refactored ROADMAP.md** to quarterly format with checkboxes
- Bumped vitest from 4.0.4 to 4.0.15
- Bumped @vitest/coverage-v8 from 4.0.4 to 4.0.15
- Synced react-dom to 19.2.3 to match react version
- Bumped Vite from 7.1.12 to 8.2.1

## [1.0.0] - 2025-11-23

### Added

- **Multiplayer 3D Tag Game**: Real-time multiplayer gameplay with Socket.io
- **Solo Mode with AI Bots**: Practice mode with intelligent bot opponents
- **React Three Fiber**: 3D scene rendering with Three.js
- **Desktop Controls**: WASD movement, mouse camera, jetpack mechanics
- **Mobile Controls**: Virtual joystick and touch buttons
- **Dark Mode**: System preference detection with manual toggle
- **CI/CD Pipeline**: GitHub Actions with automated testing and deployment
- **Test Suite**: Vitest + React Testing Library (41 test files, 302 test cases)
- **Code Quality Tools**: ESLint, Prettier, TypeScript strict mode
- **Pre-commit Hooks**: Husky + lint-staged for quality gates
- **WebSocket Server**: Express + Socket.io with health check endpoint
- **Netlify Deployment**: Automated deployment with CDN delivery

### Technical Details

- React 19.2.3 with TypeScript
- Vite 7.1.12 for fast builds and HMR
- Socket.io 4.8.3 for real-time communication
- Three.js 0.180.0 for 3D graphics
- Comprehensive test coverage with Vitest

## [0.1.0] - 2025-10-15

### Added

- Initial project setup
- Basic multiplayer lobby system
- 3D character models (astronaut theme)
- Collision detection system
- Tag game mechanics

---

**Note**: Dates are approximate based on commit history. For detailed commit history, see [GitHub commits](https://github.com/nitsuah/darkmoon/commits).
