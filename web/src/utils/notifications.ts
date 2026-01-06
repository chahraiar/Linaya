import { useNotificationStore } from '../store/notificationStore';
import { NotificationType } from '../store/notificationStore';

// Helper function to show notifications
// This can be called from anywhere in the app
export const showNotification = (
  type: NotificationType,
  message: string,
  duration?: number
) => {
  const store = useNotificationStore.getState();
  return store.addNotification(type, message, duration);
};

// Convenience functions
export const showSuccess = (message: string, duration?: number) => {
  return showNotification('success', message, duration);
};

export const showError = (message: string, duration?: number) => {
  return showNotification('error', message, duration);
};

export const showInfo = (message: string, duration?: number) => {
  return showNotification('info', message, duration);
};

export const showWarning = (message: string, duration?: number) => {
  return showNotification('warning', message, duration);
};

