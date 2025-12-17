# 🗺️ DARKMOON Roadmap

> Transform Darkmoon from a multiplayer tech demo into a production-ready 3D social gaming platform with exceptional mobile experience, scalable infrastructure, and engaging gameplay loops.

## 2025Q4: 🚀 Foundation & Mobile Fix

- [x] Project structure and CI/CD pipeline setup
- [x] Basic multiplayer functionality with Socket.io
- [x] React Three Fiber 3D scene rendering
- [x] Desktop gameplay mechanics (WASD, mouse controls, tagging)
- [x] Solo mode with AI bots
- [x] Create unified logger utility
- [x] Add server input validation and rate limiting
- [ ] Fix mobile touch controls (joystick and camera rotation)
- [ ] Fix mobile UI layout (home page cards, landscape controls)
- [ ] Refactor Solo.tsx (1,002 lines → modular structure with hooks)
- [ ] Refactor PlayerCharacter.tsx (900 lines → 5 hooks)
- [ ] Add error monitoring and structured logging

## 2026Q1: 🏗️ Polish & Performance

- [ ] Bundle optimization (reduce by 25%, target <500KB)
- [ ] Route-based code splitting and lazy loading
- [ ] Test coverage enhancement (60% → 85%)
- [ ] Mobile touch interaction tests
- [ ] CSS architecture refactor (migrate to CSS Modules)
- [ ] Design token system implementation
- [ ] Storybook for component development
- [ ] Playwright E2E testing
- [ ] Debug overlay (FPS, network stats)
- [ ] Lighthouse score >90

## 2026Q2: 🎮 Features & Scale

- [ ] Collectibles Mode (gather orbs, power-ups, leaderboard)
- [ ] Race Mode (checkpoints, lap timing, ghost racers)
- [ ] Team Tag (2v2/3v3, team chat, matchmaking)
- [ ] User authentication (Supabase Auth)
- [ ] User profiles and persistent stats
- [ ] XP/leveling and achievement system
- [ ] Redis integration (sessions, game state, leaderboards)
- [ ] PostgreSQL database (user accounts, game history)
- [ ] Horizontal scaling infrastructure (500+ concurrent users)

## 2026Q3: 💰 Social & Monetization

- [ ] Friends system
- [ ] Private lobbies (invite-only)
- [ ] Spectator mode
- [ ] Emote system
- [ ] Player reporting/moderation
- [ ] Replay sharing (Twitter/Discord)
- [ ] Character skins (5 free, 20 premium)
- [ ] Jetpack trails and tag effects
- [ ] Cosmetic shop with Stripe integration
- [ ] Battle pass system ($10/season)
- [ ] Ad network integration (optional ads for boosts)

## 2026Q4: 📱 Platform Expansion

- [ ] React Native mobile app (Expo)
- [ ] Native touch controls optimization
- [ ] Push notifications
- [ ] iOS App Store submission
- [ ] Google Play Store submission
- [ ] Electron desktop wrapper (optional)
- [ ] Steam integration (optional)

## 2027: 🌟 UX & Community Enhancements

- [ ] In-game voice chat (WebRTC)
- [ ] Service worker for offline support
- [ ] Component documentation and developer guides
- [ ] Community moderation tools
- [ ] Content creator tools (replay system)
- [ ] Enhanced accessibility features
