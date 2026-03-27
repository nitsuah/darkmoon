# Roadmap

Last Updated: 2026-03-27

> Darkmoon is currently a browser game with solo practice live in production and multiplayer still positioned as a future mode. The roadmap prioritizes packaging reliability, honest product messaging, and mobile playability before expansion work.

## 2025 Q4 (Status: Completed)

- [x] Establish the core browser game foundation.
	- Shipped: React + Vite app, 3D gameplay scene, live solo route, and supporting CI/governance docs.

- [x] Land baseline gameplay infrastructure.
	- Shipped: AI-supported solo practice, shared gameplay modules, Socket.io server, health endpoint, validation helpers, and in-memory rate limiting.

## 2026 Q1 (Status: In Progress)

- [ ] Production Packaging Reliability (Committed)
	- Objective: fix the broken Docker production build and document a validated run path.
	- Why Now: the current Docker build fails in audit, which blocks dependable release validation.
	- Exit Criteria: `.dockerignore` added, image builds cleanly, and runtime instructions are proven.

- [ ] Solo-Live Product Honesty (Committed)
	- Objective: align README, features, and roadmap language with the deployed state where solo is live and multiplayer is not yet available.
	- Why Now: current messaging overstates shipped multiplayer capability.
	- Exit Criteria: docs consistently distinguish live functionality from planned modes.

- [ ] Mobile Playability Validation (Committed)
	- Objective: verify and fix touch controls plus responsive layout on real devices.
	- Why Now: solo mode is the only live experience, so mobile issues are release-quality defects.
	- Exit Criteria: device-tested controls, responsive home/game UI, and regression coverage for mobile interactions.

## 2026 Q2 (Status: Planned)

- [ ] Multiplayer Readiness Gate (Committed)
	- Objective: define and satisfy the minimum bar for turning multiplayer from roadmap promise into deployable experience.
	- Scope: deployment topology, CORS/origin contract, structured logging, graceful shutdown, and operational visibility.
	- Exit Criteria: documented launch checklist and validated server hardening tasks complete.

- [ ] Documentation and Metrics Integrity (Committed)
	- Objective: add missing architecture/API docs and replace estimated metrics with measured values.
	- Scope: `ARCHITECTURE.md`, `API.md`, `METRICS.md` refresh, and deployment/runbook cross-links.
	- Exit Criteria: contributors can understand the system and trust the reported metrics.

- [ ] Refactor Backlog Re-Baselining (Exploratory)
	- Objective: re-scope remaining large-file refactors against the current codebase rather than outdated line counts.
	- Exit Criteria: only high-value refactors remain on the roadmap, each tied to testability or reliability outcomes.

## 2026 Q3 (Status: Planned)

- [ ] Live Multiplayer Expansion (Committed)
	- Objective: ship the first public multiplayer-capable experience once the readiness gate is passed.
	- Scope: lobby readiness, connection resilience, basic social/session expectations, and rollout safety.
	- Exit Criteria: multiplayer moves from "coming soon" to validated playable mode.

- [ ] Gameplay Mode Growth (Exploratory)
	- Objective: evaluate race, collectibles, and tournament-style progression after core live modes stabilize.
	- Exit Criteria: one additional mode is prioritized based on observed user demand and technical readiness.

## 2026 Q4 (Status: Exploratory)

- [ ] Identity, Progression, and Social Layer
	- Objective: consider profiles, stats, friends, and moderation only after the live gameplay foundation is stable.
	- Exit Criteria: decision record defines which account/social systems are worth building next.

- [ ] Platform Expansion
	- Objective: assess whether native mobile wrappers or other platform packaging materially improve adoption.
	- Exit Criteria: feasibility decision backed by usage and maintenance cost evidence.
