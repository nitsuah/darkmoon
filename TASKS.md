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
