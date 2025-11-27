# Tasks

## Done

- [x] Set up CI/CD pipeline with GitHub Actions
- [x] Created initial project structure
- [x] Implement multiplayer functionality with Socket.io
- [x] Build 3D scene with React Three Fiber
- [x] Desktop controls (WASD, mouse)
- [x] Tagging game mechanics
- [x] Solo mode with AI bots
- [x] Basic mobile UI components (joystick, buttons)
- [x] Dark mode toggle
- [x] Test suite with Vitest
- [x] Pre-commit hooks (Husky + lint-staged)
- [x] ESLint and Prettier configuration
- [x] TypeScript strict mode setup
- [x] Netlify deployment configuration
- [x] WebSocket server with health check

## In Progress

- [ ] Fix mobile touch controls (joystick responsiveness)
- [ ] Fix mobile UI layout (home page cards visibility)
- [ ] Documentation compliance updates

## Todo

### Phase 1: Critical Mobile Fixes

- [ ] Add touch event logging to MobileJoystick.tsx
- [ ] Test on physical iOS (Safari) and Android (Chrome) devices
- [ ] Fix touch preventDefault/stopPropagation issues
- [ ] Add haptic feedback for touch interactions
- [ ] Create mobile control integration test suite
- [ ] Make home page cards responsive with swipe support
- [ ] Ensure game UI adapts to portrait/landscape orientation
- [ ] Move dark mode toggle to accessible position on mobile

### Phase 2: Code Architecture Refactoring

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

### Phase 3: Server Hardening

- [ ] Add server input validation (Zod schemas)
- [ ] Implement rate limiting (express-rate-limit)
- [ ] Validate position/rotation bounds
- [ ] Add connection queue (max 100 concurrent)
- [ ] Integrate error tracking (Sentry)
- [ ] Add structured logging (Winston or Pino)
- [ ] Create health check dashboard
- [ ] Implement graceful shutdown

### Phase 4: Performance Optimization

- [ ] Analyze bundle with visualizer
- [ ] Implement route-based code splitting
- [ ] Lazy load 3D models
- [ ] Convert images to WebP format
- [ ] Remove unused dependencies
- [ ] Optimize Three.js imports

### Phase 5: Testing

- [ ] Increase test coverage to 85%
- [ ] Add mobile touch interaction tests
- [ ] Add collision system edge case tests
- [ ] Add bot AI behavior tests
- [ ] Add socket connection resilience tests
- [ ] Set up Playwright for E2E testing

<!--
AGENT INSTRUCTIONS:
This file tracks specific actionable tasks using a structured format.

CRITICAL FORMAT REQUIREMENTS:
1. Use EXACTLY these section names: "## Todo", "## In Progress", "## Done"
2. Tasks MUST use checkbox format: "- [ ]" for incomplete, "- [x]" for complete
3. Keep task titles on single lines`
1. Section headers must be ## (h2) level

STATUS MARKERS:
- [ ] = todo (not started)
- [/] = in-progress (actively working) - OPTIONAL, use "In Progress" section instead
- [x] = done (completed)

GOOD EXAMPLES:
## Todo
- [ ] Add user authentication
- [ ] Implement dark mode

## In Progress
- [ ] Refactor API endpoints

## Done
- [x] Set up database schema

BAD EXAMPLES (will break parser):
### Todo (wrong heading level)
* [ ] Task (wrong bullet marker)
- Task without checkbox
- [ ] Multi-line task
      with continuation (avoid this)

When updating:
1. Move tasks between sections as status changes
2. Mark completed tasks with [x] and move to "Done"
3. Add new tasks to "Todo" section
4. Keep descriptions actionable and concise
-->
