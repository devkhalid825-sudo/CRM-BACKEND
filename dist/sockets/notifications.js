import jwt from 'jsonwebtoken';
import { env } from '../config/bootstrap.js';
import { registerNotificationBroadcaster } from '../services/notify.js';
export function setupNotificationsSocket(ns) {
    ns.use((socket, next) => {
        const token = socket.handshake.auth?.token;
        if (!token)
            return next();
        try {
            const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
            socket.data.userId = decoded.id;
            next();
        }
        catch {
            next();
        }
    });
    ns.on('connection', (socket) => {
        if (socket.data.userId) {
            socket.join(`user:${socket.data.userId}`);
        }
    });
    registerNotificationBroadcaster((userId, payload) => {
        ns.to(`user:${userId}`).emit('notification', payload);
    });
}
//# sourceMappingURL=notifications.js.map