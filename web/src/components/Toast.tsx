import React, { useEffect } from 'react';
import { useNotificationStore, NotificationType } from '../store/notificationStore';
import { CheckCircleIcon, XCircleIcon, InformationCircleIcon, ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import './Toast.css';

const Toast: React.FC = () => {
  const { notifications, removeNotification } = useNotificationStore();

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="toast-container">
      {notifications.map((notification) => (
        <ToastItem
          key={notification.id}
          notification={notification}
          onClose={() => removeNotification(notification.id)}
        />
      ))}
    </div>
  );
};

interface ToastItemProps {
  notification: {
    id: string;
    type: NotificationType;
    message: string;
  };
  onClose: () => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ notification, onClose }) => {
  useEffect(() => {
    // Auto-close animation
    const timer = setTimeout(() => {
      onClose();
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return <CheckCircleIcon className="toast-icon toast-icon-success" />;
      case 'error':
        return <XCircleIcon className="toast-icon toast-icon-error" />;
      case 'warning':
        return <ExclamationTriangleIcon className="toast-icon toast-icon-warning" />;
      case 'info':
      default:
        return <InformationCircleIcon className="toast-icon toast-icon-info" />;
    }
  };

  return (
    <div className={`toast toast-${notification.type}`}>
      <div className="toast-content">
        {getIcon()}
        <span className="toast-message">{notification.message}</span>
      </div>
      <button
        className="toast-close"
        onClick={onClose}
        aria-label="Fermer"
      >
        <XMarkIcon className="toast-close-icon" />
      </button>
    </div>
  );
};

export default Toast;

