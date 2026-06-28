import React from "react";
import "../../styles/Notification.css"; // Assuming a shared style or equivalent

interface NotificationProps {
  id: string;
  message: string;
  type?: "success" | "warning" | "error" | "info";
  onClose?: (id: string) => void;
  style?: React.CSSProperties;
}

export const Notification: React.FC<NotificationProps> = ({
  id,
  message,
  type = "info",
  onClose,
  style,
}) => {
  const notificationClasses = `notification notification-${type}`;

  return (
    <div className={notificationClasses} style={style}>
      <p style={{ margin: 0 }}>{message}</p>
      {onClose && (
        <button
          type="button"
          className="notification-close-btn"
          onClick={() => onClose(id)}
        >
          &times;
        </button>
      )}
    </div>
  );
};
