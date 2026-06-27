import React from "react";
import "../../styles/Spinner.css"; // Assuming a shared style or equivalent

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
  const spinnerStyle = {
    borderColor: `${color}40`, // Lighter shade for the track
    borderTopColor: color,
    borderWidth: thickness,
  };

  return <div className={spinnerClasses} style={spinnerStyle}></div>;
};