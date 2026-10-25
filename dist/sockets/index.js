import { Server as SocketIOServer } from 'socket.io';
import { env } from '../config/bootstrap.js';
import { setupLogsSocket } from './logs.js';
import { setupNotificationsSocket } from './notifications.js';
import { setupChatSocket } from './chat.js';
export function setupSockets(httpServer) {
    const io = new SocketIOServer(httpServer, {
        cors: {
            origin: (origin, callback) => {
                // Allow connections from frontend domain, localhost, or env origin
                if (!origin ||
                    origin === env.CLIENT_ORIGIN ||
                    origin.includes('muhammadkhalid.work.gd') ||
                    origin.includes('localhost') ||
                    origin.includes('127.0.0.1')) {
                    callback(null, true);
                }
                else {
                    callback(null, true);
                }
            },
            credentials: true,
            methods: ['GET', 'POST'],
        },
    });
    const logsNs = io.of('/logs');
    setupLogsSocket(logsNs);
    const notifNs = io.of('/notifications');
    setupNotificationsSocket(notifNs);
    const chatNs = io.of('/chat');
    setupChatSocket(chatNs);
    // Future phase placeholder
    io.of('/jobs');
    return io;
}
//# sourceMappingURL=index.js.map