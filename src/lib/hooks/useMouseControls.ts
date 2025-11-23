import { useState } from "react";

export interface MouseControls {
  leftClick: boolean;
  rightClick: boolean;
  middleClick: boolean;
  mouseX: number;
  mouseY: number;
}

/**
 * Hook for managing mouse input state
 * Tracks mouse position and button states
 */
export const useMouseControls = () => {
  const [mouseControls, setMouseControls] = useState<MouseControls>({
    leftClick: false,
    rightClick: false,
    middleClick: false,
    mouseX: 0,
    mouseY: 0,
  });

  return { mouseControls, setMouseControls };
};
