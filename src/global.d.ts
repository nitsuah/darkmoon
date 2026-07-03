/// <reference types="vite/client" />
/// <reference types="vitest" />
/// <reference types="@testing-library/jest-dom" />

// Development debugging utilities
interface Window {
  enableBotDebug?: () => void;
  disableBotDebug?: () => void;
}

// Consolidated custom game events — single source of truth
interface WindowEventMap {
  "weapon-pickup": CustomEvent<{ weaponId: string }>;
  "health-pickup": CustomEvent<{ amount: number }>;
  "player-tagged-by-bot": Event;
}
