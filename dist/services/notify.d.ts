type NotificationBroadcaster = (userId: string, payload: {
    id: string;
    type: string;
    title: string;
    link?: string;
    createdAt: string;
}) => void;
export declare function registerNotificationBroadcaster(fn: NotificationBroadcaster): void;
export declare function sendNotification(userId: string, type: string, title: string, link?: string): Promise<void>;
export {};
//# sourceMappingURL=notify.d.ts.map