import jwt from 'jsonwebtoken';
import { env } from '../config/bootstrap.js';
let chatNs = null;
export function setupChatSocket(ns) {
    chatNs = ns;
    ns.use((socket, next) => {
        const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
        if (!token)
            return next(new Error('Authentication required'));
        try {
            const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
            socket.data.user = decoded;
            next();
        }
        catch {
            next(new Error('Invalid token'));
        }
    });
    ns.on('connection', (socket) => {
        const user = socket.data.user;
        // Join personal user room and broadcast presence
        socket.join(`user:${user.id}`);
        ns.emit('presence', { userId: user.id, status: 'online' });
        // Join conversation room
        socket.on('join_conversation', (conversationId) => {
            socket.join(`conv:${conversationId}`);
        });
        socket.on('typing', (data) => {
            socket.to(`conv:${data.conversationId}`).emit('typing', {
                userId: user.id,
                userName: user.name,
                isTyping: data.isTyping,
            });
        });
        socket.on('disconnect', () => {
            ns.emit('presence', { userId: user.id, status: 'offline' });
        });
    });
}
export function broadcastChatMessage(conversationId, message) {
    if (chatNs) {
        chatNs.to(`conv:${conversationId}`).emit('new_message', message);
    }
}
//# sourceMappingURL=chat.js.map