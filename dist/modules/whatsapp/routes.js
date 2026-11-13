import { Router } from 'express';
import { whatsAppService } from './service.js';
import { authenticateToken } from '../../middleware/auth.js';
const router = Router();
router.use(authenticateToken);
// Get current user's WhatsApp connection status
router.get('/status', async (req, res, next) => {
    try {
        const userId = req.user?.id;
        if (!userId)
            return res.status(401).json({ error: 'Unauthorized' });
        const status = await whatsAppService.getStatus(userId);
        res.json({ success: true, data: status });
    }
    catch (err) {
        next(err);
    }
});
// Start session & request QR code
router.post('/connect', async (req, res, next) => {
    try {
        const userId = req.user?.id;
        if (!userId)
            return res.status(401).json({ error: 'Unauthorized' });
        const result = await whatsAppService.startSession(userId);
        res.json({ success: true, data: result });
    }
    catch (err) {
        next(err);
    }
});
// Disconnect / logout WhatsApp
router.post('/disconnect', async (req, res, next) => {
    try {
        const userId = req.user?.id;
        if (!userId)
            return res.status(401).json({ error: 'Unauthorized' });
        const result = await whatsAppService.disconnect(userId);
        res.json({ success: true, data: result });
    }
    catch (err) {
        next(err);
    }
});
// Send single direct message
router.post('/send', async (req, res, next) => {
    try {
        const userId = req.user?.id;
        if (!userId)
            return res.status(401).json({ error: 'Unauthorized' });
        const { phone, text, leadId } = req.body;
        if (!phone || !text) {
            return res.status(400).json({ error: 'Phone and text are required' });
        }
        const result = await whatsAppService.sendMessage(userId, phone, text, leadId);
        res.json({ success: true, data: result });
    }
    catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});
// Bulk broadcast to multiple selected leads
router.post('/broadcast', async (req, res, next) => {
    try {
        const userId = req.user?.id;
        if (!userId)
            return res.status(401).json({ error: 'Unauthorized' });
        const { leads, template, delaySeconds } = req.body;
        if (!Array.isArray(leads) || leads.length === 0) {
            return res.status(400).json({ error: 'No leads provided' });
        }
        if (!template) {
            return res.status(400).json({ error: 'Message template is required' });
        }
        const result = await whatsAppService.sendBulkBroadcast(userId, leads, template, delaySeconds || 4);
        res.json({ success: true, data: result });
    }
    catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});
export const whatsAppRoutes = router;
//# sourceMappingURL=routes.js.map