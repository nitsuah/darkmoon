import React, { useState, useEffect } from "react";
import { Button } from "./21st.dev/Button";
import "../styles/Button.css";

export type QualityLevel = "low" | "medium" | "high" | "auto";

interface QualitySettingsProps {
  onChange: (quality: QualityLevel) => void;
  currentFPS?: number;
}

const QualitySettings: React.FC<QualitySettingsProps> = ({
  onChange,
  currentFPS,
}) => {
  const [quality, setQuality] = useState<QualityLevel>(() => {
    const saved =
      typeof window !== "undefined"
        ? window.localStorage.getItem("graphics-quality")
        : null;
    return (saved as QualityLevel) || "auto";
  });
  const [isOpen, setIsOpen] = useState<boolean>(false);

  // Auto-adjust quality based on FPS
  useEffect(() => {
    if (quality === "auto" && currentFPS !== undefined) {
      let recommendedQuality: QualityLevel = "high";

      if (currentFPS < 30) {
        recommendedQuality = "low";
      } else if (currentFPS < 50) {
        recommendedQuality = "medium";
      }

      onChange(recommendedQuality);
    }
  }, [quality, currentFPS, onChange]);

  const handleQualityChange = (newQuality: QualityLevel) => {
    setQuality(newQuality);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("graphics-quality", newQuality);
    }
    onChange(newQuality);
    setIsOpen(false);
  };

  const getQualityDescription = (level: QualityLevel): string => {
    switch (level) {
      case "low":
        return "Low - Better performance";
      case "medium":
        return "Medium - Balanced";
      case "high":
        return "High - Best visuals";
      case "auto":
        return "Auto - Adaptive (Recommended)";
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        bottom: "20px",
        right: "20px",
        zIndex: 9998,
      }}
    >
      {isOpen && (
        <div
          style={{
            position: "absolute",
            bottom: "50px",
            right: "0",
            backgroundColor: "rgba(0, 0, 0, 0.9)",
            border: "1px solid #555",
            borderRadius: "8px",
            padding: "12px",
            minWidth: "200px",
          }}
        >
          <div
            style={{
              color: "#fff",
              fontSize: "14px",
              fontWeight: "bold",
              marginBottom: "8px",
              borderBottom: "1px solid #555",
              paddingBottom: "8px",
            }}
          >
            Graphics Quality
          </div>
          {(["auto", "high", "medium", "low"] as QualityLevel[]).map(
            (level) => (
              <Button
                key={level}
                onClick={() => handleQualityChange(level)}
                variant={quality === level ? "primary" : "secondary"}
                size="small"
                className="quality-setting-button"
              >
                {getQualityDescription(level)}
              </Button>
            ),
          )}
        </div>
      )}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="quality-settings-toggle-button"
        title="Graphics Settings"
      >
        ⚙️
      </Button>
    </div>
  );
};

export default QualitySettings;
