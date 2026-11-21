import { Router } from 'express';
import { finderService } from './service.js';
import { authenticateToken } from '../../middleware/auth.js';
import { prisma } from '../../db/prisma.js';
import { encrypt } from '../../services/crypto.js';
import { placesProviders } from '../../integrations/places/index.js';
import { DEFAULT_CATEGORIES } from '../categories/defaults.js';
import { DEFAULT_COUNTRIES, DEFAULT_CITIES } from '../geo/defaults.js';
const router = Router();
router.use(authenticateToken);
// 1. Countries endpoint
router.get('/countries', async (req, res, next) => {
    try {
        let list = await prisma.country.findMany({ orderBy: { name: 'asc' } }).catch(() => []);
        if (!list || list.length === 0) {
            list = DEFAULT_COUNTRIES;
        }
        res.json({ success: true, data: list });
    }
    catch (err) {
        next(err);
    }
});
// 2. Categories endpoint
router.get('/categories', async (req, res, next) => {
    try {
        let list = await prisma.category.findMany({
            where: { active: true },
            orderBy: { name: 'asc' },
        }).catch(() => []);
        if (!list || list.length === 0) {
            list = DEFAULT_CATEGORIES.map((c, i) => ({
                id: `cat_${i + 1}`,
                name: c.name,
                keywords: c.keywords,
                active: true,
            }));
        }
        res.json({ success: true, data: list });
    }
    catch (err) {
        next(err);
    }
});
// 3. Custom Category creation endpoint
router.post('/categories/custom', async (req, res, next) => {
    try {
        const { name, keywords } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, error: 'Category name is required' });
        }
        const trimmedName = name.trim();
        let formattedKeywords = keywords;
        if (typeof keywords === 'string') {
            const terms = keywords.split(',').map((k) => k.trim()).filter(Boolean);
            formattedKeywords = [{ lang: 'en', terms: terms.length > 0 ? terms : [trimmedName] }];
        }
        else if (Array.isArray(keywords) && keywords.length > 0 && typeof keywords[0] === 'string') {
            formattedKeywords = [{ lang: 'en', terms: keywords }];
        }
        else if (!formattedKeywords) {
            formattedKeywords = [{ lang: 'en', terms: [trimmedName] }];
        }
        const cat = await prisma.category.upsert({
            where: { name: trimmedName },
            update: { keywords: formattedKeywords, active: true },
            create: {
                name: trimmedName,
                keywords: formattedKeywords,
                active: true,
            },
        });
        res.status(201).json({ success: true, category: cat, data: cat });
    }
    catch (err) {
        next(err);
    }
});
// 4. Cities endpoint by country code
router.get('/cities', async (req, res, next) => {
    try {
        const country = (req.query.country || '').toUpperCase();
        const where = country ? { countryCode: country } : {};
        let list = await prisma.city.findMany({
            where,
            orderBy: { population: 'desc' },
            take: 100,
        }).catch(() => []);
        if (!list || list.length === 0) {
            list = (country
                ? DEFAULT_CITIES.filter((c) => c.countryCode.toUpperCase() === country)
                : DEFAULT_CITIES);
        }
        res.json({ success: true, data: list });
    }
    catch (err) {
        next(err);
    }
});
// Real-time API Key Health & Status endpoint for Lead Finder (support both /keys-status and /keys/status)
const getKeysStatusHandler = async (req, res, next) => {
    try {
        const keys = await prisma.providerKey.findMany({
            where: {
                providerId: { in: ['serper', 'geoapify', 'gemini', 'gemini_places', 'google_places', 'serpapi', 'apify'] },
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
        const resultList = [...keys];
        // Check environment keys and expose them as active keys in status
        const envCheckMap = {
            serper: process.env.SERPER_API_KEY || process.env.SERPER_KEY,
            geoapify: process.env.GEOAPIFY_API_KEY || process.env.GEOAPIFY_KEY,
            gemini: process.env.GEMINI_API_KEY || process.env.GEMINI_KEY,
            groq: process.env.GROQ_API_KEY,
            openrouter: process.env.OPENROUTER_API_KEY,
        };
        for (const [pId, envVal] of Object.entries(envCheckMap)) {
            if (envVal) {
                resultList.push({
                    id: `env_${pId}`,
                    providerId: pId,
                    label: `${pId.toUpperCase()} Key (.env)`,
                    priority: 1,
                    enabled: true,
                    dailyCap: 0,
                    usageToday: 0,
                    status: 'healthy',
                    lastError: null,
                    cooldownUntil: null,
                });
            }
        }
        // Always include OpenStreetMap 100% Free engine
        resultList.push({
            id: 'overpass_free_key',
            providerId: 'overpass',
            label: 'OpenStreetMap (Overpass & Nominatim Free)',
            priority: 1,
            enabled: true,
            dailyCap: 0,
            usageToday: 0,
            status: 'healthy',
            lastError: null,
            cooldownUntil: null,
        });
        res.json({ success: true, data: resultList });
    }
    catch (err) {
        next(err);
    }
};
router.get('/keys-status', getKeysStatusHandler);
router.get('/keys/status', getKeysStatusHandler);
// Quick Hot-Swap / Add API Key (support both /quick-add-key and /keys/add)
const addKeyHandler = async (req, res, next) => {
    try {
        const providerId = req.body.providerId;
        const apiKey = req.body.apiKey || req.body.key;
        const label = req.body.label;
        const priority = req.body.priority;
        const dailyCap = req.body.dailyCap;
        if (!providerId || !apiKey) {
            return res.status(400).json({ success: false, error: 'providerId and apiKey/key are required' });
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
};
router.post('/quick-add-key', addKeyHandler);
router.post('/keys/add', addKeyHandler);
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
        res.status(201).json({ success: true, data: job, jobId: job.id });
    }
    catch (err) {
        next(err);
    }
});
router.post('/jobs/start', async (req, res, next) => {
    try {
        const job = await finderService.createJob(req.user.id, req.body);
        res.status(201).json({ success: true, data: job, jobId: job.id });
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
// Delete a search job and its associated tasks
router.delete('/jobs/:id', async (req, res, next) => {
    try {
        const id = String(req.params.id);
        await prisma.searchTask.deleteMany({ where: { jobId: id } });
        await prisma.searchJob.delete({ where: { id } }).catch(() => { });
        res.json({ success: true, message: 'Search job deleted successfully' });
    }
    catch (err) {
        next(err);
    }
});
router.post('/jobs/:id/delete', async (req, res, next) => {
    try {
        const id = String(req.params.id);
        await prisma.searchTask.deleteMany({ where: { jobId: id } });
        await prisma.searchJob.delete({ where: { id } }).catch(() => { });
        res.json({ success: true, message: 'Search job deleted successfully' });
    }
    catch (err) {
        next(err);
    }
});
export const finderRoutes = router;
//# sourceMappingURL=routes.js.map