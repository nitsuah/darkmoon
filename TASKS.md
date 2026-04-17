# Tasks

Last Updated: 2026-04-03

## Done

- [x] **[Q2-CEO] Fix player tag system** — players cannot tag bots (and bots cannot reliably tag players back); the hit-detection and tagging collision logic needs to be fixed and symmetrical.
  - Priority: P0
  - Problem: bot-to-bot tagging works but player-to-bot and bot-to-player tagging is broken or inconsistent, making the game unplayable in mixed mode.
  - Acceptance Criteria: players can tag bots using the same mechanics bots use on each other; bot-to-player tagging registers correctly; regression tests or a documented test scenario covers both directions.
  - Completed: 2026-04-03
  - Evidence: solo-mode bot AI now targets live player position and performs bot->player tag transfer through `GameManager.tagPlayer`; regression test `src/__tests__/bots.tagging.test.tsx` passes in Docker.

## In Progress

## Todo

  - [ ] Review debug mode and regular tag logic for edge cases and regressions.
- [ ] Diagnose and fix any remaining issues where the bot does not chase the player or where tagging is inconsistent in solo mode.
- [ ] Ensure all tag cooldowns and freeze logic are respected for both player and bot, and that tag-back is impossible during cooldown.

- [ ] Stabilize mobile input and mobile layout on physical devices.
  - Priority: P0
  - Problem: mobile touch controls and responsive layout still lack device-level validation.
  - Acceptance Criteria: joystick and camera controls work on iOS Safari and Android Chrome, home and game UI work in portrait and landscape, and regressions are covered.

- [ ] **[Q2-CEO] 21st.dev component integration pass** — replace or augment key game site UI surfaces (lobby, scoreboard, game-over, nav) with 21st.dev components to improve visual quality and interactivity.
  - Priority: P1
  - Problem: current UI is functional but prototype-grade; 21st.dev components can significantly improve look, feel, and animation quality without a full rewrite.
  - Acceptance Criteria: at least lobby, scoreboard, and game-over screens use 21st.dev components; hover states, transitions, and layout quality are demonstrably improved; no regression in game functionality.

- [ ] **[Q2-CEO] UI/UX interactivity improvements** — improve micro-interactions, card layouts, and overall interactivity across the site using 21st.dev patterns.
  - Priority: P1
  - Problem: the site feels static outside of actual gameplay; improving interactivity increases perceived quality and engagement before a player even starts a game.
  - Acceptance Criteria: game cards, stat panels, and navigation have consistent hover/focus states; page transitions are smooth; Lighthouse performance score does not regress.

- [ ] **[Q2-CEO] Open-source safety scrub** — sanitize repository content to remove potentially sensitive, proprietary, or over-specific company and resume details before broader sharing/open sourcing.
  - Priority: P1
  - Problem: historical examples may include details that are too specific for public exposure.
  - Acceptance Criteria: sensitive examples are removed or anonymized; docs are reviewed for proprietary references; a final pass confirms public-share readiness.

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


## See also: docs/INSTRUCTIONS.md for agent handoff and workflow best practices.

- Docker-first validation is blocked by the current production build failure.
- The deployed site presents solo mode as live and multiplayer or tournament work as planned.
