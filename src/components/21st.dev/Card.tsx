import React from "react";
import "../../styles/Card.css"; // Assuming a shared style or equivalent

interface CardProps {
  title: string;
  description: string;
  icon?: string;
  status?: string;
  statusType?: "live" | "coming-soon" | "disabled";
  onClick?: () => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  children?: React.ReactNode; // For back content or additional elements
  className?: string;
  isFlipped?: boolean;
}

export const Card: React.FC<CardProps> = ({
  title,
  description,
  icon,
  status,
  statusType,
  onClick,
  onKeyDown,
  children,
  className = "",
  isFlipped = false,
}) => {
  const statusClass = statusType ? `status-${statusType}` : "";
  const cardClasses = `mode-card ${className} ${isFlipped ? "flipped" : ""}`;
  const isInteractive = !!onClick;

  return (
    <div
      className={`mode-card-flip-container ${cardClasses}`}
      onClick={onClick}
      onKeyDown={
        isInteractive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onKeyDown?.(e);
                onClick?.();
              }
            }
          : undefined
      }
      role={isInteractive ? "button" : undefined}
      tabIndex={isInteractive ? 0 : undefined}
    >
      <div className="mode-card-flip-inner">
        <div className="mode-card-front">
          {icon && <div className="mode-icon">{icon}</div>}
          <h3>{title}</h3>
          <p>{description}</p>
          {status && (
            <div className={`mode-status ${statusClass}`}>{status}</div>
          )}
        </div>
        <div className="mode-card-back">{children}</div>
      </div>
    </div>
  );
};
