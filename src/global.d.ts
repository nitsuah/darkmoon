/// <reference types="vite/client" />
/// <reference types="vitest" />
/// <reference types="@testing-library/jest-dom" />

// Development debugging utilities
interface Window {
  enableBotDebug?: () => void;
  disableBotDebug?: () => void;
}
