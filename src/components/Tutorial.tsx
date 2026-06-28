import * as React from "react";
import { useState, useEffect } from "react";
import "../styles/Tutorial.css";
import { Button } from "./21st.dev/Button";
import "../styles/Button.css";

interface TutorialProps {
  onComplete?: () => void;
}

const Tutorial: React.FC<TutorialProps> = ({ onComplete }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [step, setStep] = useState(0);

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
      content: "A multiplayer 3D experience. Let's get you started!",
    },
    {
      title: "Movement Controls",
      content: "Use W/A/S/D keys to move around. Hold SHIFT to run faster.",
    },
    {
      title: "Camera Control",
      content: "The camera follows you automatically in third-person view.",
    },
    {
      title: "Theme Toggle",
      content:
        "Click the sun/moon icon in the top-left to switch between dark and light themes.",
    },
    {
      title: "Need Help?",
      content: "Press H at any time to view the help menu. Have fun!",
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

  const handleComplete = () => {
    window.localStorage.setItem("darkmoon-tutorial-complete", "true");
    setIsVisible(false);
    onComplete?.();
  };

  if (!isVisible) return null;

  const currentStep = steps[step];

  return (
    <div className="tutorial-overlay">
      <div className="tutorial-content">
        <div className="tutorial-header">
          <h2>{currentStep.title}</h2>
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
