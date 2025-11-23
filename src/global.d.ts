/// <reference types="vite/client" />

// Development debugging utilities
interface Window {
  enableBotDebug?: () => void;
  disableBotDebug?: () => void;
}
