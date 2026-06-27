import React from "react";
import "../../styles/Button.css"; // Assuming a shared style or equivalent

interface ButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
  variant?: "primary" | "secondary" | "danger" | "warning" | "info" | "success";
  size?: "small" | "medium" | "large";
  disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  onClick,
  children,
  className = "",
  variant = "primary",
  size = "medium",
  disabled = false,
}) => {
  const buttonClasses = `btn btn-${variant} btn-${size} ${className}`;

  return (
    <button className={buttonClasses} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
};