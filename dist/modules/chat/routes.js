import { Router } from 'express';
import { prisma } from '../../db/prisma.js';
import { authenticateToken } from '../../middleware/auth.js';
import { broadcastChatMessage, broadcastMessageUpdated, broadcastMessageDeleted, broadcastConversationDeleted, } from '../../sockets/chat.js';
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
// Edit / Update a message
router.patch('/conversations/:convId/messages/:msgId', async (req, res, next) => {
    try {
        const { convId, msgId } = req.params;
        const { body } = req.body;
        if (!body || !body.trim())
            return res.status(400).json({ error: 'Message body cannot be empty' });
        const existing = await prisma.message.findUnique({ where: { id: msgId } });
        if (!existing)
            return res.status(404).json({ error: 'Message not found' });
        if (existing.senderId !== req.user?.id && req.user?.role !== 'admin') {
            return res.status(403).json({ error: 'You can only edit your own messages' });
        }
        const updated = await prisma.message.update({
            where: { id: msgId },
            data: { body: body.trim() },
        });
        broadcastMessageUpdated(convId, updated);
        res.json({ success: true, data: updated });
    }
    catch (err) {
        next(err);
    }
});
// Delete a message
router.delete('/conversations/:convId/messages/:msgId', async (req, res, next) => {
    try {
        const { convId, msgId } = req.params;
        const existing = await prisma.message.findUnique({ where: { id: msgId } });
        if (!existing)
            return res.status(404).json({ error: 'Message not found' });
        if (existing.senderId !== req.user?.id && req.user?.role !== 'admin') {
            return res.status(403).json({ error: 'You can only delete your own messages' });
        }
        await prisma.message.delete({ where: { id: msgId } });
        broadcastMessageDeleted(convId, msgId);
        res.json({ success: true, message: 'Message deleted successfully' });
    }
    catch (err) {
        next(err);
    }
});
// Delete entire conversation / channel thread & all messages
router.delete('/conversations/:id', async (req, res, next) => {
    try {
        const conversationId = String(req.params.id);
        const existing = await prisma.conversation.findUnique({ where: { id: conversationId } });
        if (!existing)
            return res.status(404).json({ error: 'Conversation not found' });
        // Delete associated messages
        await prisma.message.deleteMany({ where: { conversationId } });
        // Delete conversation
        await prisma.conversation.delete({ where: { id: conversationId } });
        broadcastConversationDeleted(conversationId);
        res.json({ success: true, message: 'Conversation thread deleted successfully' });
    }
    catch (err) {
        next(err);
    }
});
export const chatRoutes = router;
//# sourceMappingURL=routes.js.map