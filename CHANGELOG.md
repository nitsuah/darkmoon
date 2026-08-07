# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

- React 19.2.0 with TypeScript
- Vite 7.1.12 for fast builds and HMR
- Socket.io 4.8.1 for real-time communication
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
