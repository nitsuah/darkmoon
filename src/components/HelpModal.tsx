import * as React from "react";
import { useState, useEffect } from "react";
import "../styles/HelpModal.css";
import { Button } from "./21st.dev/Button";
import "../styles/Button.css";
import {
  OPEN_HELP_EVENT,
  isTouchDevice,
  useDialogFocus,
  useEscapeToClose,
} from "../lib/hooks/useDialog";

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

    const open = () => setIsOpen(true);
    window.addEventListener("keydown", handleKeyPress);
    window.addEventListener(OPEN_HELP_EVENT, open);
    return () => {
      window.removeEventListener("keydown", handleKeyPress);
      window.removeEventListener(OPEN_HELP_EVENT, open);
    };
  }, []);

  const dialogRef = useDialogFocus(isOpen);
  useEscapeToClose(isOpen, () => setIsOpen(false));

  if (!isOpen) return null;

  const isTouch = isTouchDevice();

  return (
    <div
      className="help-modal-overlay"
      onClick={(e) => e.target === e.currentTarget && setIsOpen(false)}
      role="presentation"
    >
      <div
        className="help-modal-content"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-modal-title"
        tabIndex={-1}
      >
        <div className="help-modal-header">
          <h2 id="help-modal-title">Help & Controls</h2>
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
          {isTouch ? (
            <>
          <section className="help-section">
            <h3>Touch Controls</h3>
            <ul>
              <li>
                Left stick moves; hold Sprint to run
              </li>
              <li>
                Right stick looks and aims
              </li>
              <li>
                Tap Fire to shoot
              </li>
              <li>
                Tap Jump to jump; double-tap for the jetpack
              </li>
            </ul>
          </section>
            </>
          ) : (
            <>
          <section className="help-section">
            <h3>Movement</h3>
            <ul>
              <li>
                <kbd>W A S D</kbd> Move
              </li>
              <li>
                <kbd>Q / E</kbd> Strafe
              </li>
              <li>
                <kbd>SHIFT</kbd> Run (hold while moving)
              </li>
              <li>
                <kbd>SPACE</kbd> Jump; press again in the air for the jetpack
              </li>
            </ul>
          </section>

          <section className="help-section">
            <h3>Combat</h3>
            <ul>
              <li>
                <kbd>Click</kbd> Fire (hold and release to throw a grenade)
              </li>
              <li>
                <kbd>R</kbd> Reload; press again during the reload to snap it
              </li>
              <li>
                <kbd>1 - 5</kbd> Pick a weapon
              </li>
              <li>
                <kbd>TAB / Scroll</kbd> Next weapon
              </li>
              <li>
                <kbd>I</kbd> Hold for scores
              </li>
            </ul>
          </section>

          <section className="help-section">
            <h3>Camera and Interface</h3>
            <ul>
              <li>
                Click the game to lock the mouse, then move it to look
              </li>
              <li>
                <kbd>Alt + Scroll</kbd> Zoom
              </li>
              <li>
                <kbd>H</kbd> Toggle this help menu
              </li>
              <li>
                <kbd>ESC</kbd> Pause
              </li>
            </ul>
          </section>
            </>
          )}

          <section className="help-section">
            <h3>Modes</h3>
            <ul>
              <li>
                You are an astronaut playing solo against bots
              </li>
              <li>
                Tag: fire your laser to pass IT on
              </li>
              <li>
                Deathmatch and CTF: see the goal shown when the round starts
              </li>
              <li>
                The utility menu (bottom-right) has theme, sound and quality
              </li>
            </ul>
          </section>
        </div>
        <div className="help-modal-footer">
          <p className="help-hint">
            {isTouch
              ? "Tap outside to close"
              : "Press H, ESC or click outside to close"}
          </p>
        </div>
      </div>
    </div>
  );
};

export default HelpModal;
