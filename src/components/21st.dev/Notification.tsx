import React from "react";
import "../../styles/Notification.css"; // Assuming a shared style or equivalent

interface NotificationProps {
  id: string;
  message: string;
  type?: "success" | "warning" | "error" | "info";
  onClose?: (id: string) => void;
}

export const Notification: React.FC<NotificationProps> = ({
  id,
  message,
  type = "info",
  onClose,
}) => {
  const notificationClasses = `notification notification-${type}`;

  return (
    <div className={notificationClasses}>
      <p>{message}</p>
      {onClose && (
        <button className="notification-close-btn" onClick={() => onClose(id)}>
          &times;
        </button>
      )}
    </div>
  );
};