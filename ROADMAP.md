# Roadmap

Last Updated: 2026-08-22

## 2025 Q4 ✅

> Completed. Browser-game foundation and baseline gameplay infrastructure shipped.

## Beyond Original Scope — Combat Gameplay (Phases BC–BM) ✅

> Significant combat gameplay shipped beyond the original roadmap scope. Phases BC–BM delivered: auto-restart after results screen, hit direction indicator, bot jumping in deathmatch, score tension warning, bot tracer beams, weapon reload system (R key, ammo limits, HUD bar, timing-based precision snap mechanic), bot LOS wall checks, bot angular spread/miss physics, smooth velocity-based player movement, mouse-aimed firing with player reticle, shooting gallery mode with crosshair improvements, ShotgunVFX cone particle effects, reserve ammo system, tag-mode health/damage support, and camera-relative A/D strafing. Deathmatch (Phase C) and CTF (Phase D) modes also shipped. GameUI and Solo.tsx fully componentized (Phase E partial).

## 2026 Q1 ✅ (Completed / Deferred)

- [x] Fix the Docker production build and validate the run path.
- [x] Align README, FEATURES.md, and roadmap language with solo mode as the live experience.
- [ ] Validate mobile controls and responsive layouts on real devices. _(deferred)_

## 2026 Q2 (Deferred)

### CEO Priorities

- [ ] **21st.dev components integration**: leverage 21st.dev component library to enhance the look, feel, and interactivity of the game site — replace or augment existing UI surfaces with higher-quality, more interactive components.
- [ ] **UI/UX polish pass using 21st.dev**: apply improved card layouts, transitions, and interactive states to the game lobby, scoreboard, and game-over screens.
- [ ] **Open-source safety scrub**: remove or anonymize any sensitive, proprietary, or employer-identifying content so the repo can be shared publicly without exposing confidential details.

### Existing Planned Items

- [x] Define the multiplayer readiness gate around deployment, CORS, logging, shutdown behavior, and operational visibility. _(completed 2026-08-27; see `docs/MULTIPLAYER_GATE.md` — all four criteria pass)_
- [x] Add `ARCHITECTURE.md` and `API.md`. _(completed 2026-08-21; `docs/ARCHITECTURE.md` and `docs/API.md` exist)_
- [ ] Measured `METRICS.md` refresh. _(estimates remain; in-progress)_
- [ ] Re-scope the remaining refactor backlog against the current codebase.

## 2026 Q3 (In Progress)

- [ ] Ship the first validated multiplayer-capable experience after the readiness gate is met.
- [ ] Revisit additional gameplay modes only after the live foundation is stable.

## 2026 Q4 (Exploratory)

- [ ] Evaluate identity, progression, and social systems.
- [ ] Evaluate broader platform expansion such as native mobile packaging.
