import React from "react";
import "../../styles/Spinner.css";

interface SpinnerProps {
  size?: "small" | "medium" | "large";
  color?: string;
  thickness?: number;
}

export const Spinner: React.FC<SpinnerProps> = ({
  size = "medium",
  color = "#fff",
  thickness = 5,
}) => {
  const spinnerClasses = `spinner spinner-${size}`;
  const spinnerStyle: React.CSSProperties = {
    // If color is a CSS variable (starts with --) or hex, use it directly.
    // If it's a standard color name or RGB/HSL, it still works.
    // We add opacity using filter or rgba if it's a hex color.
    borderColor: color.startsWith("#") ? `${color}40` : `${color}80`,
    borderTopColor: color,
    borderWidth: thickness,
    borderStyle: "solid",
  };

  return <div className={spinnerClasses} style={spinnerStyle}></div>;
};
