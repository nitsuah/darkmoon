import React from "react";
import "../../styles/Button.css";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
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
  style,
  title,
  id,
  ...rest
}) => {
  const buttonClasses = `btn btn-${variant} btn-${size} ${className}`;

  return (
    <button
      className={buttonClasses}
      onClick={onClick}
      disabled={disabled}
      style={style}
      title={title}
      id={id}
      {...rest}
    >
      {children}
    </button>
  );
};
