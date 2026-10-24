import { Namespace, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/bootstrap.js';
import { registerLogBroadcaster } from '../services/logger.js';
import { UserRole } from '../shared/index.js';

export function setupLogsSocket(logsNamespace: Namespace) {
  // Middleware to ensure ONLY admin can connect to /logs
  logsNamespace.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
    if (!token) {
      return next(new Error('Authentication required for log stream'));
    }

    try {
      const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as { role: UserRole; email: string };
      if (decoded.role !== 'admin') {
        return next(new Error('Access denied: Admin role required for live log streaming'));
      }
      socket.data.user = decoded;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  logsNamespace.on('connection', (socket: Socket) => {
    socket.emit('log', {
      level: 'info',
      module: 'socket',
      msg: `Connected to live system log stream as ${socket.data.user?.email}`,
      createdAt: new Date().toISOString(),
    });
  });

  // Hook into logger broadcaster to stream out to all connected admin sockets
  registerLogBroadcaster((logEntry) => {
    logsNamespace.emit('log', logEntry);
  });
}
