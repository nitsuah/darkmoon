# Tasks

Last Updated: 2026-03-27

## Done

- [x] Validate the deployed solo gameplay entry path.
  - Priority: P1
  - Type: Feature
  - Confidence: High
  - Evidence: `https://darkmoon.dev` loads successfully and `START PLAYING` routes to `/solo`.
  - Acceptance Criteria Met: home page loads, solo route is reachable, and live UI exposes gameplay controls.

- [x] Confirm solo-mode modularization work already landed.
  - Priority: P1
  - Type: Tech Debt
  - Confidence: High
  - Evidence: `src/pages/Solo.tsx` imports `useSocketConnection`, `useSoloGame`, `SoloScene`, and `SoloHUD`; `lib/utils/logger.ts` is already in use.
  - Acceptance Criteria Met: stale tasks for these completed refactors removed from active backlog.

- [x] Confirm server-side validation and rate limiting are already implemented.
  - Priority: P1
  - Type: Security
  - Confidence: High
  - Evidence: `server.js` applies `validatePosition`, `validateRotation`, `validateChatMessage`, `validateGameMode`, and in-memory rate limiting.
  - Acceptance Criteria Met: stale hardening tasks for baseline validation/rate limiting removed from active backlog.

## In Progress

- [ ] Stabilize mobile input and mobile layout on physical devices.
  - Priority: P0
  - Type: Bug
  - Confidence: Medium
  - Milestone: 2026 Q1
  - Problem Statement: mobile touch controls and mobile layout remain documented as critical issues, but device-level validation evidence is still missing.
  - Why It Matters: solo mode is the only live experience, so broken mobile controls directly reduce product usability.
  - Acceptance Criteria:
    - Verify joystick and camera controls on physical iOS Safari and Android Chrome.
    - Confirm home page cards and in-game UI work in portrait and landscape.
    - Add automated coverage for mobile control regressions.
  - Dependencies: none.

## Todo

- [ ] Fix the Docker production build path.
  - Priority: P0
  - Type: Bug
  - Confidence: High
  - Milestone: 2026 Q1
  - Problem Statement: `docker build -t darkmoon-pmo-audit .` fails because the repository lacks `.dockerignore`, causing a large build context and an invalid `node_modules/.bin/browserslist` request.
  - Why It Matters: the documented production container path is currently broken, which blocks reliable deployment validation.
  - Acceptance Criteria:
    - Add `.dockerignore` rules for `node_modules`, coverage output, logs, and local artifacts.
    - `docker build` completes successfully from repository root.
    - Docker run instructions are validated and documented.
  - Dependencies: none.

- [ ] Align product messaging with the deployed experience.
  - Priority: P0
  - Type: Docs
  - Confidence: High
  - Milestone: 2026 Q1
  - Problem Statement: `README.md` still leads with real-time multiplayer, while the deployed site presents solo practice as live and multiplayer as coming soon.
  - Why It Matters: marketing an unavailable core mode creates user confusion and weakens roadmap credibility.
  - Acceptance Criteria:
    - Update `README.md`, `FEATURES.md`, and landing-page copy plan to describe solo mode as the live experience.
    - Distinguish playable now vs planned modes consistently across docs.
    - Preserve multiplayer direction as roadmap work, not shipped functionality.
  - Dependencies: none.

- [ ] Add architecture and deployment contract documentation.
  - Priority: P1
  - Type: Docs
  - Confidence: High
  - Milestone: 2026 Q2
  - Problem Statement: `ARCHITECTURE.md` and `API.md` are missing despite the repo shipping a Vite frontend, Express/Socket.io server, health endpoint, and deployment configs.
  - Why It Matters: contributors lack a canonical description of routing, WebSocket behavior, CORS expectations, and deployment topology.
  - Acceptance Criteria:
    - Create `ARCHITECTURE.md` covering app structure, gameplay boundaries, server responsibilities, and deployment targets.
    - Create `API.md` or equivalent interface spec for `/health` and socket event contracts.
    - Document the intended production origin/CORS model.
  - Dependencies: none.

- [ ] Refresh `METRICS.md` with measured values instead of estimates.
  - Priority: P1
  - Type: Docs
  - Confidence: Medium
  - Milestone: 2026 Q2
  - Problem Statement: current metrics include estimated coverage, build time, and lines of code rather than observed command output.
  - Why It Matters: PMO planning quality depends on trustworthy measurements.
  - Acceptance Criteria:
    - Run build/test/coverage commands in a working Node environment or CI.
    - Replace estimates with actual results or mark values `TBD` with blocker notes.
    - Update `Last Updated` with the audit date.
  - Dependencies: functioning Node toolchain or CI artifact access.

- [ ] Finish server production-hardening work beyond the current baseline.
  - Priority: P1
  - Type: Tech Debt
  - Confidence: Medium
  - Milestone: 2026 Q3
  - Problem Statement: base validation and rate limiting exist, but structured logging, graceful shutdown, and operational visibility are not yet verified.
  - Why It Matters: multiplayer readiness and safe live operations depend on observability and clean process management.
  - Acceptance Criteria:
    - Add structured logging and graceful shutdown handling.
    - Expose a lightweight operational status view or documented metrics path.
    - Validate failure handling for socket/server shutdown scenarios.
  - Dependencies: architecture and deployment contract documentation.

- [ ] Re-baseline the remaining large-file refactor work.
  - Priority: P2
  - Type: Tech Debt
  - Confidence: Medium
  - Milestone: 2026 Q3
  - Problem Statement: older refactor tasks no longer match the current code layout, and the next biggest maintainability hotspots need a fresh scope.
  - Why It Matters: stale file-size assumptions lead to low-value refactor planning.
  - Acceptance Criteria:
    - Re-measure large gameplay modules.
    - Keep only refactor tasks that are still materially beneficial.
    - Tie each refactor to testability, performance, or debugging outcomes.
  - Dependencies: none.

## Audit Notes

- Docker-first validation is available but currently failing due to missing `.dockerignore`.
- `npm` is not installed in this shell, so local Node-based test/build commands could not be executed from the current environment.
- The deployed site currently exposes solo mode as live and multiplayer/tournament as coming soon.
