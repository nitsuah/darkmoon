# Tasks

## Done

- [x] Bump vitest from 4.0.4 to 4.0.15
- [x] Bump @vitest/coverage-v8 from 4.0.4 to 4.0.15
- [x] Sync react-dom to 19.2.3 to match react version
- [x] Documentation compliance updates

## In Progress

### v2.1: Critical Mobile inputs

- [ ] Fix mobile touch controls (joystick responsiveness)
- [ ] Fix mobile UI layout (home page cards visibility)

## Todo

### v2.1: Critical Mobile Fixes

- [ ] Add touch event logging to MobileJoystick.tsx
- [ ] Test on physical iOS (Safari) and Android (Chrome) devices
- [ ] Fix touch preventDefault/stopPropagation issues
- [ ] Add haptic feedback for touch interactions
- [ ] Create mobile control integration test suite
- [ ] Make home page cards responsive with swipe support
- [ ] Ensure game UI adapts to portrait/landscape orientation
- [ ] Move dark mode toggle to accessible position on mobile

### v2.2: Code Architecture Refactoring

- [ ] Decompose Solo.tsx (1,002 lines → modular structure)
- [ ] Extract useSocketConnection hook
- [ ] Extract useGameBots hook
- [ ] Extract useSoloGame hook
- [ ] Create SoloScene component for 3D rendering
- [ ] Create SoloHUD component for UI overlay
- [ ] Decompose PlayerCharacter.tsx (900 lines → 5 hooks)
- [ ] Extract usePlayerMovement hook
- [ ] Extract usePlayerCamera hook
- [ ] Extract usePlayerCollision hook
- [ ] Extract usePlayerTagging hook
- [ ] Extract useJetpack hook
- [ ] Create unified logger utility (lib/utils/logger.ts)

### v2.3: Server Hardening

- [ ] Add server input validation (Zod schemas)
- [ ] Implement rate limiting (express-rate-limit)
- [ ] Validate position/rotation bounds
- [ ] Add connection queue (max 100 concurrent)
- [ ] Integrate error tracking (Sentry)
- [ ] Add structured logging (Winston or Pino)
- [ ] Create health check dashboard
- [ ] Implement graceful shutdown

### v2.4: Performance Optimization

- [ ] Analyze bundle with visualizer
- [ ] Implement route-based code splitting
- [ ] Lazy load 3D models
- [ ] Convert images to WebP format
- [ ] Remove unused dependencies
- [ ] Optimize Three.js imports

### v2.5: Testing

- [ ] Increase test coverage to 85%
- [ ] Add mobile touch interaction tests
- [ ] Add collision system edge case tests
- [ ] Add bot AI behavior tests
- [ ] Add socket connection resilience tests
- [ ] Set up Playwright for E2E testing
