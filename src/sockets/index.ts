import { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { env } from '../config/bootstrap.js';
import { setupLogsSocket } from './logs.js';
import { setupNotificationsSocket } from './notifications.js';
import { setupChatSocket } from './chat.js';

export function setupSockets(httpServer: HttpServer): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: env.CLIENT_ORIGIN,
      credentials: true,
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
