import { Namespace, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/bootstrap.js';

let chatNs: Namespace | null = null;

export function setupChatSocket(ns: Namespace) {
  chatNs = ns;

  ns.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
    if (!token) return next(new Error('Authentication required'));

    try {
      const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as { id: string; name: string; email: string };
      socket.data.user = decoded;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  ns.on('connection', (socket: Socket) => {
    const user = socket.data.user;

    // Join personal user room and broadcast presence
    socket.join(`user:${user.id}`);
    ns.emit('presence', { userId: user.id, status: 'online' });

    // Join conversation room
    socket.on('join_conversation', (conversationId: string) => {
      socket.join(`conv:${conversationId}`);
    });

    socket.on('typing', (data: { conversationId: string; isTyping: boolean }) => {
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

export function broadcastChatMessage(conversationId: string, message: any) {
  if (chatNs) {
    chatNs.to(`conv:${conversationId}`).emit('new_message', message);
  }
}
