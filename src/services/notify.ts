import { logger } from './logger.js';

type NotificationBroadcaster = (userId: string, payload: {
  id: string;
  type: string;
  title: string;
  link?: string;
  createdAt: string;
}) => void;

let broadcastNotification: NotificationBroadcaster | null = null;

export function registerNotificationBroadcaster(fn: NotificationBroadcaster) {
  broadcastNotification = fn;
}

export async function sendNotification(
  userId: string,
  type: string,
  title: string,
  link?: string
): Promise<void> {
  const payload = {
    id: Date.now().toString(),
    type,
    title,
    link,
    createdAt: new Date().toISOString(),
  };

  logger.info('notify', `Notification sent to user ${userId}: ${title}`);

  if (broadcastNotification) {
    try {
      broadcastNotification(userId, payload);
    } catch {
      // ignore
    }
  }
}
