import * as React from "react";
import { useState, useEffect } from "react";
import "../styles/HelpModal.css";
import { Button } from "./21st.dev/Button";
import "../styles/Button.css";

const HelpModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input field
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
        return;
      }

      if (e.key.toLowerCase() === "h") {
        setIsOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, []);

  if (!isOpen) return null;

  return (
    <div
      className="help-modal-overlay"
      onClick={() => setIsOpen(false)}
      role="button"
      aria-label="Close help modal"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && setIsOpen(false)}
    >
      <div
        className="help-modal-content"
        onClick={(e) => e.stopPropagation()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.stopPropagation()}
        aria-label="Help modal content"
      >
        <div className="help-modal-header">
          <h2>Help & Controls</h2>
          <Button
            onClick={() => setIsOpen(false)}
            className="help-close-button"
            variant="secondary"
            size="small"
          >
            ×
          </Button>
        </div>
        <div className="help-modal-body">
          <section className="help-section">
            <h3>Movement</h3>
            <ul>
              <li>
                <kbd>W</kbd> Move Forward
              </li>
              <li>
                <kbd>A</kbd> Move Left
              </li>
              <li>
                <kbd>S</kbd> Move Backward
              </li>
              <li>
                <kbd>D</kbd> Move Right
              </li>
              <li>
                <kbd>SHIFT</kbd> Run (hold while moving)
              </li>
            </ul>
          </section>

          <section className="help-section">
            <h3>Camera</h3>
            <ul>
              <li>
                <kbd>Left Click + Drag</kbd> Rotate camera around player
              </li>
              <li>Camera follows your movement smoothly</li>
            </ul>
          </section>

          <section className="help-section">
            <h3>Interface</h3>
            <ul>
              <li>
                <kbd>H</kbd> Toggle this help menu
              </li>
              <li>
                <kbd>C</kbd> Toggle chat
              </li>
              <li>☀️/🌙 Toggle dark/light theme (bottom-left)</li>
              <li>⚙️ Adjust graphics quality (top-right)</li>
              <li>Performance monitor in top-left corner</li>
            </ul>
          </section>

          <section className="help-section">
            <h3>Multiplayer & Games</h3>
            <ul>
              <li>Your character is the blue box (red when &quot;IT&quot;)</li>
              <li>
                Other players appear as green boxes (red when &quot;IT&quot;)
              </li>
              <li>Start Tag game with 2+ players</li>
              <li>Walk into other players to tag them</li>
              <li>Chat with other players in real-time</li>
            </ul>
          </section>
        </div>
        <div className="help-modal-footer">
          <p className="help-hint">Press H or click outside to close</p>
        </div>
      </div>
    </div>
  );
};

export default HelpModal;
