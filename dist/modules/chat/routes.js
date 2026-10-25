import { Router } from 'express';
import { prisma } from '../../db/prisma.js';
import { authenticateToken } from '../../middleware/auth.js';
import { broadcastChatMessage } from '../../sockets/chat.js';
const router = Router();
router.use(authenticateToken);
// List conversations for current user
router.get('/conversations', async (req, res, next) => {
    try {
        const list = await prisma.conversation.findMany({
            orderBy: { updatedAt: 'desc' },
            take: 50,
        });
        res.json({ success: true, data: list });
    }
    catch (err) {
        next(err);
    }
});
// Create conversation (Direct or Channel or Lead thread)
router.post('/conversations', async (req, res, next) => {
    try {
        const { type, name, memberIds, leadId } = req.body;
        const allMembers = Array.from(new Set([req.user.id, ...(memberIds || [])]));
        const conv = await prisma.conversation.create({
            data: {
                type: type || 'direct',
                name,
                memberIds: allMembers,
                leadId,
            },
        });
        res.status(201).json({ success: true, data: conv });
    }
    catch (err) {
        next(err);
    }
});
// Get messages for a conversation
router.get('/conversations/:id/messages', async (req, res, next) => {
    try {
        const conversationId = String(req.params.id);
        const messages = await prisma.message.findMany({
            where: { conversationId },
            orderBy: { createdAt: 'asc' },
            take: 100,
        });
        res.json({ success: true, data: messages });
    }
    catch (err) {
        next(err);
    }
});
// Send a message and broadcast live via WebSockets
router.post('/conversations/:id/messages', async (req, res, next) => {
    try {
        const conversationId = String(req.params.id);
        const { body, fileIds, mentions } = req.body;
        const message = await prisma.message.create({
            data: {
                conversationId,
                senderId: req.user.id,
                senderName: req.user.name,
                body,
                fileIds: fileIds || [],
                mentions: mentions || [],
            },
        });
        // Update conversation timestamp
        await prisma.conversation.update({
            where: { id: conversationId },
            data: { updatedAt: new Date() },
        });
        // Broadcast over Socket.IO /chat namespace
        broadcastChatMessage(conversationId, message);
        res.status(201).json({ success: true, data: message });
    }
    catch (err) {
        next(err);
    }
});
export const chatRoutes = router;
//# sourceMappingURL=routes.js.map