# Tasks

Last Updated: 2026-03-27

## Done

- [x] Validate the deployed solo gameplay entry path.
- [x] Confirm the solo-mode modularization work already landed.
- [x] Confirm baseline server-side validation and rate limiting are already implemented.

## In Progress

- [ ] Stabilize mobile input and mobile layout on physical devices.
  - Priority: P0
  - Problem: mobile touch controls and responsive layout still lack device-level validation.
  - Acceptance Criteria: joystick and camera controls work on iOS Safari and Android Chrome, home and game UI work in portrait and landscape, and regressions are covered.

## Todo

- [ ] **[Q2-CEO] Fix player tag system** — players cannot tag bots (and bots cannot reliably tag players back); the hit-detection and tagging collision logic needs to be fixed and symmetrical.
  - Priority: P0
  - Problem: bot-to-bot tagging works but player-to-bot and bot-to-player tagging is broken or inconsistent, making the game unplayable in mixed mode.
  - Acceptance Criteria: players can tag bots using the same mechanics bots use on each other; bot-to-player tagging registers correctly; regression tests or a documented test scenario covers both directions.

- [ ] **[Q2-CEO] 21st.dev component integration pass** — replace or augment key game site UI surfaces (lobby, scoreboard, game over, nav) with 21st.dev components to improve visual quality and interactivity.
  - Priority: P1
  - Problem: current UI is functional but prototype-grade; 21st.dev components can significantly improve look, feel, and animation quality without a full rewrite.
  - Acceptance Criteria: at least lobby, scoreboard, and game-over screens use 21st.dev components; hover states, transitions, and layout quality are demonstrably improved; no regression in game functionality.

- [ ] **[Q2-CEO] UI/UX interactivity improvements** — improve micro-interactions, card layouts, and overall interactivity across the site using 21st.dev patterns.
  - Priority: P1
  - Problem: the site feels static outside of actual gameplay; improving interactivity increases perceived quality and engagement before a player even starts a game.
  - Acceptance Criteria: game cards, stat panels, and navigation have consistent hover/focus states; page transitions are smooth; Lighthouse performance score does not regress.

- [ ] Fix the Docker production build path.
  - Priority: P0
  - Problem: the documented Docker build path is currently broken.
  - Acceptance Criteria: `.dockerignore` is in place, `docker build` succeeds from repo root, and the run instructions are revalidated.

- [ ] Align product messaging with the deployed experience.
  - Priority: P0
  - Problem: docs still overstate live multiplayer even though solo mode is the live experience.
  - Acceptance Criteria: README.md and FEATURES.md clearly separate playable-now solo work from planned multiplayer work.

- [ ] Add architecture and deployment contract documentation.
  - Priority: P1
  - Problem: the repo ships a Vite frontend plus Express and Socket.io server work without a dedicated architecture or interface reference.
  - Acceptance Criteria: `ARCHITECTURE.md` and `API.md` document app boundaries, socket and health contracts, and deployment expectations.

- [ ] Refresh `METRICS.md` with measured values instead of estimates.
  - Priority: P1
  - Problem: current metrics are still estimate-heavy.
  - Acceptance Criteria: build, test, and coverage values are measured or clearly marked `TBD` with blockers.

- [ ] Finish server production-hardening work beyond the current baseline.
  - Priority: P1
  - Problem: structured logging, graceful shutdown, and operational visibility have not been fully verified.
  - Acceptance Criteria: hardening tasks are documented, implemented, and validated.

- [ ] Re-baseline the remaining large-file refactor work.
  - Priority: P2
  - Problem: older refactor tasks no longer match the codebase hotspots.
  - Acceptance Criteria: only current, high-value refactors remain and each one ties back to reliability, testability, or performance.

## Audit Notes

- Docker-first validation is blocked by the current production build failure.
- The deployed site presents solo mode as live and multiplayer or tournament work as planned.
