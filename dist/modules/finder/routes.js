import { Router } from 'express';
import { finderService } from './service.js';
import { authenticateToken } from '../../middleware/auth.js';
import { prisma } from '../../db/prisma.js';
import { encrypt } from '../../services/crypto.js';
import { placesProviders } from '../../integrations/places/index.js';
const router = Router();
router.use(authenticateToken);
// Real-time API Key Health & Status endpoint for Lead Finder
router.get('/keys-status', async (req, res, next) => {
    try {
        const keys = await prisma.providerKey.findMany({
            where: {
                providerId: { in: ['serper', 'gemini', 'gemini_places', 'google_places', 'serpapi', 'apify'] },
            },
            select: {
                id: true,
                providerId: true,
                label: true,
                priority: true,
                enabled: true,
                dailyCap: true,
                usageToday: true,
                status: true,
                lastUsedAt: true,
                lastError: true,
                cooldownUntil: true,
                createdAt: true,
            },
            orderBy: [{ providerId: 'asc' }, { priority: 'asc' }],
        });
        res.json({ success: true, data: keys });
    }
    catch (err) {
        next(err);
    }
});
// Quick Hot-Swap / Add API Key directly without server reboot
router.post('/quick-add-key', async (req, res, next) => {
    try {
        const { providerId, label, apiKey, priority, dailyCap } = req.body;
        if (!providerId || !apiKey) {
            return res.status(400).json({ success: false, error: 'providerId and apiKey are required' });
        }
        // 1. Live test key before saving if provider has testConnection
        let testMessage = 'Valid';
        const provider = placesProviders[providerId] || (providerId === 'gemini' ? placesProviders.gemini_places : null);
        if (provider?.testConnection) {
            const testResult = await provider.testConnection({ apiKey });
            testMessage = testResult.message;
        }
        // 2. Encrypt and save to database
        const encryptedKey = encrypt(apiKey.trim());
        const saved = await prisma.providerKey.create({
            data: {
                providerId,
                label: label?.trim() || `${providerId.toUpperCase()} Key`,
                encryptedKey,
                priority: Number(priority) || 1,
                dailyCap: Number(dailyCap) || 0,
                enabled: true,
                status: 'healthy',
            },
        });
        res.status(201).json({
            success: true,
            message: `Key successfully verified and activated! (${testMessage})`,
            data: {
                id: saved.id,
                providerId: saved.providerId,
                label: saved.label,
                status: saved.status,
            },
        });
    }
    catch (err) {
        res.status(400).json({ success: false, error: err.message || 'Failed to verify and save key' });
    }
});
router.post('/estimate', async (req, res, next) => {
    try {
        const estimate = await finderService.estimateJob(req.body);
        res.json({ success: true, data: estimate });
    }
    catch (err) {
        next(err);
    }
});
router.post('/jobs', async (req, res, next) => {
    try {
        const job = await finderService.createJob(req.user.id, req.body);
        res.status(201).json({ success: true, data: job });
    }
    catch (err) {
        next(err);
    }
});
router.get('/jobs', async (req, res, next) => {
    try {
        const jobs = await prisma.searchJob.findMany({
            orderBy: { createdAt: 'desc' },
            take: 50,
        });
        res.json({ success: true, data: jobs });
    }
    catch (err) {
        next(err);
    }
});
router.get('/jobs/:id', async (req, res, next) => {
    try {
        const id = String(req.params.id);
        const job = await prisma.searchJob.findUnique({ where: { id } });
        const tasks = await prisma.searchTask.findMany({
            where: { jobId: id },
            orderBy: { createdAt: 'asc' },
        });
        res.json({ success: true, data: { job, tasks } });
    }
    catch (err) {
        next(err);
    }
});
router.post('/jobs/:id/pause', async (req, res, next) => {
    try {
        const id = String(req.params.id);
        const job = await prisma.searchJob.update({
            where: { id },
            data: { status: 'paused', pausedReason: 'Manually paused by user' },
        });
        res.json({ success: true, data: job });
    }
    catch (err) {
        next(err);
    }
});
router.post('/jobs/:id/resume', async (req, res, next) => {
    try {
        const id = String(req.params.id);
        const job = await prisma.searchJob.update({
            where: { id },
            data: { status: 'running', pausedReason: null },
        });
        setImmediate(() => finderService.executeJob(id));
        res.json({ success: true, data: job });
    }
    catch (err) {
        next(err);
    }
});
export const finderRoutes = router;
//# sourceMappingURL=routes.js.map