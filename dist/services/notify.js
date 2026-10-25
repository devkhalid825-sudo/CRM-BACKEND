import { logger } from './logger.js';
let broadcastNotification = null;
export function registerNotificationBroadcaster(fn) {
    broadcastNotification = fn;
}
export async function sendNotification(userId, type, title, link) {
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
        }
        catch {
            // ignore
        }
    }
}
//# sourceMappingURL=notify.js.map