import { useState, useMemo } from "react";
import { QualityLevel } from "../../components/QualitySettings";

export interface QualitySettings {
  shadows: boolean;
  pixelRatio: number;
  antialias: boolean;
}

/**
 * Hook for managing graphics quality settings
 * Returns appropriate settings based on quality level and current FPS
 */
export const useQualitySettings = (currentFPS: number) => {
  const [quality, setQuality] = useState<QualityLevel>("auto");

  const qualitySettings = useMemo<QualitySettings>(() => {
    switch (quality) {
      case "low":
        return {
          shadows: false,
          pixelRatio: 1,
          antialias: false,
        };
      case "medium":
        return {
          shadows: true,
          pixelRatio: Math.min(window.devicePixelRatio, 1.5),
          antialias: true,
        };
      case "high":
        return {
          shadows: true,
          pixelRatio: window.devicePixelRatio,
          antialias: true,
        };
      default: // auto
        return {
          shadows: currentFPS >= 50,
          pixelRatio: currentFPS >= 50 ? window.devicePixelRatio : 1,
          antialias: currentFPS >= 40,
        };
    }
  }, [quality, currentFPS]);

  return {
    quality,
    setQuality,
    qualitySettings,
  };
};
