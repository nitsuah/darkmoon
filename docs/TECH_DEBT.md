# Tech Debt Tracker

**Last Updated:** November 23, 2025  
**Status:** Actively tracked, see [L7_ENGINEERING_REVIEW.md](./L7_ENGINEERING_REVIEW.md) for full analysis

> **Note:** This document tracks immediate tech debt items. For long-term planning, see [ROADMAP.md](./ROADMAP.md)

---

## 🔴 Critical (P0) - Fix Immediately

### 1. Mobile Touch Controls Non-Functional

**Status:** 🔴 BLOCKING  
**Impact:** Game unplayable on mobile  
**Files:** `src/components/MobileJoystick.tsx`, `src/components/MobileButton.tsx`  
**Details:** Touch events not responding on iOS Safari and Android Chrome. Two-finger camera rotation not working.  
**Owner:** [Assign]  
**Due:** [Sprint 1]

**Action Items:**

- [ ] Add touch event logging
- [ ] Test on physical iOS/Android devices
- [ ] Fix preventDefault/stopPropagation issues
- [ ] Add mobile control integration tests

---

### 2. Solo.tsx Monolithic (1,002 lines)

**Status:** 🔴 URGENT  
**Impact:** Hard to maintain, test, and extend  
**Files:** `src/pages/Solo.tsx`  
**Details:** Game state, socket logic, bot AI, and rendering all in one file with 20+ useState hooks  
**Owner:** [Assign]  
**Due:** [Sprint 2]

**Action Items:**

- [ ] Extract `useSocketConnection` hook
- [ ] Extract `useGameBots` hook
- [ ] Extract `useSoloGame` hook
- [ ] Create `SoloScene` and `SoloHUD` components
- [ ] Move bot configs to separate file

**Target:** Reduce to <200 lines

---

### 3. PlayerCharacter.tsx Game Loop (900+ lines)

**Status:** 🔴 URGENT  
**Impact:** Complex testing, hard to debug  
**Files:** `src/components/characters/PlayerCharacter.tsx`  
**Details:** Movement, camera, collision, tagging, jetpack all in one useFrame hook  
**Owner:** [Assign]  
**Due:** [Sprint 2]

**Action Items:**

- [ ] Extract `usePlayerMovement` hook
- [ ] Extract `usePlayerCamera` hook
- [ ] Extract `usePlayerCollision` hook
- [ ] Extract `usePlayerTagging` hook
- [ ] Extract `useJetpack` hook

**Target:** Reduce to <200 lines

---

## 🟡 High Priority (P1) - Next Sprint

### 4. Server Lacks Input Validation

**Status:** 🟡 SECURITY RISK  
**Impact:** Vulnerable to position spoofing, chat flooding  
**Files:** `server.js`  
**Details:** No validation on move/chat events, trusts client data  
**Owner:** [Assign]  
**Due:** [Sprint 1]

**Action Items:**

- [ ] Add Zod schemas for socket events
- [ ] Implement express-rate-limit
- [ ] Validate position/rotation bounds
- [ ] Add per-IP rate limits

---

### 5. Duplicate Debug Logger (4 implementations)

**Status:** 🟡 CODE SMELL  
**Impact:** Inconsistent logging, harder to debug  
**Files:** `Solo.tsx`, `PlayerCharacter.tsx`, `GameManager.ts`, `useBotAI.ts`  
**Details:** Each file reimplements the same dev-only logger  
**Owner:** [Assign]  
**Due:** [Sprint 1]

**Action Items:**

- [ ] Create `lib/utils/logger.ts` with namespaced logging
- [ ] Replace all debug loggers with unified utility
- [ ] Add log levels (debug, info, warn, error)

---

### 6. No Mobile-Specific Test Coverage

**Status:** 🟡 QUALITY ISSUE  
**Impact:** Mobile bugs slip through to production  
**Files:** `src/__tests__/`  
**Details:** Zero tests for touch interactions, orientation changes  
**Owner:** [Assign]  
**Due:** [Sprint 2]

**Action Items:**

- [ ] Create `MobileJoystick.integration.test.tsx`
- [ ] Create `MobileButton.test.tsx`
- [ ] Test portrait/landscape transitions
- [ ] Target 80%+ mobile control coverage

---

### 7. SoundManager.ts Too Large (621 lines)

**Status:** 🟡 MAINTAINABILITY  
**Impact:** Hard to extend with new sounds  
**Files:** `src/components/SoundManager.ts`  
**Details:** Procedural music + SFX + volume management all in one class  
**Owner:** [Assign]  
**Due:** [Sprint 3]

**Action Items:**

- [ ] Extract `ProceduralMusic.ts`
- [ ] Extract `SoundEffects.ts`
- [ ] Extract `AudioContext.ts`
- [ ] Keep SoundManager as orchestrator (~150 lines)

---

## 🟢 Medium Priority (P2) - Backlog

### 8. Commented-Out Spline Integration

**Status:** 🟢 DECISION NEEDED  
**Impact:** Code confusion, dependency bloat  
**Files:** `src/pages/Home.tsx`  
**Details:** Spline imports commented out, unclear if needed  
**Owner:** [Assign]  
**Due:** [Sprint 3]

**Action Items:**

- [ ] Decide: Remove permanently or create feature flag?
- [ ] If removing: uninstall `@splinetool` dependencies
- [ ] If keeping: implement proper lazy loading

---

### 9. Unused Assets

**Status:** 🟢 CLEANUP  
**Impact:** Unnecessary bundle size  
**Files:** `src/assets/emoji.ico`, `src/assets/emoji.png`  
**Details:** No references found in codebase  
**Owner:** [Assign]  
**Due:** [Sprint 4]

**Action Items:**

- [ ] Verify emoji files are truly unused
- [ ] Remove if confirmed unused
- [ ] Optimize twitter-512.png (68KB → WebP ~15KB)

---

### 10. CSS Architecture (Global namespace pollution)

**Status:** 🟢 REFACTOR NEEDED  
**Impact:** Risk of style conflicts, hard to maintain  
**Files:** `src/styles/*.css`, inline styles in components  
**Details:** No CSS modules, duplicate theme variables, inline styles  
**Owner:** [Assign]  
**Due:** [Sprint 5]

**Action Items:**

- [ ] Migrate to CSS Modules
- [ ] Create design token system
- [ ] Extract inline styles from GameUI.tsx
- [ ] Convert to mobile-first responsive design

---

### 11. Outdated Dependencies

**Status:** 🟢 MAINTENANCE  
**Impact:** Missing bug fixes and features  
**Files:** `package.json`  
**Details:** Prettier 2.x (latest 3.x), Husky 8.x (latest 9.x)  
**Owner:** [Assign]  
**Due:** [Sprint 6]

**Action Items:**

- [ ] Update Prettier to 3.x
- [ ] Update Husky to 9.x
- [ ] Test for breaking changes
- [ ] Monitor React 19 + R3F compatibility

---

### 12. Lobby.tsx Deprecated?

**Status:** 🟢 DECISION NEEDED  
**Impact:** Dead code in repo  
**Files:** `src/pages/Lobby.tsx` (119 lines)  
**Details:** Appears unused in favor of Solo.tsx  
**Owner:** [Assign]  
**Due:** [Sprint 7]

**Action Items:**

- [ ] Confirm Lobby.tsx is not used
- [ ] Archive or remove if confirmed
- [ ] Update tests if removed

---

### 13. Duplicate Profanity Filter

**Status:** 🟢 INCONSISTENCY  
**Impact:** Client/server filter mismatch  
**Files:** `src/lib/constants/profanity.ts`, `server/profanity.js`  
**Details:** Server uses env var, client has hardcoded list  
**Owner:** [Assign]  
**Due:** [Sprint 8]

**Action Items:**

- [ ] Share config via JSON file or npm package
- [ ] Ensure client/server parity
- [ ] Add tests for filter consistency

---

## 📊 Tech Debt Metrics

| Category                | Items  | Estimated Effort |
| ----------------------- | ------ | ---------------- |
| 🔴 Critical (P0)        | 3      | 4-6 weeks        |
| 🟡 High Priority (P1)   | 4      | 3-4 weeks        |
| 🟢 Medium Priority (P2) | 6      | 4-6 weeks        |
| **Total**               | **13** | **11-16 weeks**  |

---

## Completed ✅

_(Move items here as they're resolved)_

---

## Notes

- **Review Cycle:** Weekly during sprint planning
- **Prioritization:** Based on user impact, security risk, and development velocity
- **Effort Estimates:** T-shirt sizing (S=1-2d, M=3-5d, L=1-2w, XL=2-4w)

---

**Related Documents:**

- [L7_ENGINEERING_REVIEW.md](./L7_ENGINEERING_REVIEW.md) - Detailed analysis
- [ROADMAP.md](./ROADMAP.md) - Long-term product plan
- [TODO.md](./TODO.md) - QA checklist and bugs
