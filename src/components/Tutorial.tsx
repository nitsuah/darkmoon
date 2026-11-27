import * as React from "react";
import { useState, useEffect } from "react";
import "../styles/Tutorial.css";
import { Button } from "./21st.dev/Button";
import "../styles/Button.css";
import {
  isTouchDevice,
  useDialogFocus,
  useEscapeToClose,
} from "../lib/hooks/useDialog";

interface TutorialProps {
  onComplete?: () => void;
}

const Tutorial: React.FC<TutorialProps> = ({ onComplete }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [step, setStep] = useState(0);

  const isTouch = isTouchDevice();
  const dialogRef = useDialogFocus(isVisible);

  const handleComplete = () => {
    window.localStorage.setItem("darkmoon-tutorial-complete", "true");
    setIsVisible(false);
    onComplete?.();
  };

  // Esc skips the tutorial instead of opening Pause on top of it.
  useEscapeToClose(isVisible, () => handleComplete());

  useEffect(() => {
    // Check if user has seen the tutorial
    const hasSeenTutorial = window.localStorage.getItem(
      "darkmoon-tutorial-complete",
    );
    if (!hasSeenTutorial) {
      setIsVisible(true);
    }
  }, []);

  const steps = [
    {
      title: "Welcome to DARKMOON",
      content:
        "Solo play against bots. Pick a mode from the Game Modes menu; Shooting Gallery is a good place to start.",
    },
    {
      title: "Movement Controls",
      content: isTouch
        ? "Left stick moves, hold Sprint to run. Tap Jump to jump and double-tap it for the jetpack."
        : "W/A/S/D move, Q and E strafe, SHIFT runs, SPACE jumps. Press SPACE again in the air for the jetpack.",
    },
    {
      title: "Camera Control",
      content: isTouch
        ? "Drag the right stick to look and aim. Tap Fire to shoot."
        : "Click the game to lock the mouse, then move it to look. Click to fire, R reloads, and 1 to 5, TAB or the scroll wheel swap weapons.",
    },
    {
      title: "Theme Toggle",
      content:
        "Open the utility menu in the bottom-right corner for the light or dark theme, sound and graphics quality.",
    },
    {
      title: "Need Help?",
      content: isTouch
        ? "Open Controls from the Game Modes menu at any time. Have fun!"
        : "Press H for controls, hold I for scores, and press ESC to pause. Have fun!",
    },
  ];

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  if (!isVisible) return null;

  const currentStep = steps[step];

  return (
    <div className="tutorial-overlay">
      <div
        className="tutorial-content"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tutorial-title"
        tabIndex={-1}
      >
        <div className="tutorial-header">
          <h2 id="tutorial-title">{currentStep.title}</h2>
          <div className="tutorial-progress">
            Step {step + 1} of {steps.length}
          </div>
        </div>
        <div className="tutorial-body">
          <p>{currentStep.content}</p>
        </div>
        <div className="tutorial-footer">
          <Button onClick={handleSkip} variant="secondary" className="tutorial-button">
            Skip Tutorial
          </Button>
          <Button onClick={handleNext} variant="primary" className="tutorial-button">
            {step < steps.length - 1 ? "Next" : "Get Started"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Tutorial;
