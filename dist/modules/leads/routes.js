import { Router } from 'express';
import { leadsService } from './service.js';
import { authenticateToken } from '../../middleware/auth.js';
import { recordActivityLog } from '../../middleware/audit.js';
import { seedTestLeadsAndMeetings } from '../../services/seedTestData.js';
const router = Router();
router.use(authenticateToken);
// Excel export
router.get('/export.xlsx', async (req, res, next) => {
    try {
        const buffer = await leadsService.generateExcelWorkbook(req.query, req.user?.role, req.user?.id);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="leads_export_${Date.now()}.xlsx"`);
        res.send(buffer);
    }
    catch (err) {
        next(err);
    }
});
// Seed rich test leads & meetings (for testing meetings, pipeline, Meta integration, and ads)
router.post('/seed-test-data', async (req, res, next) => {
    try {
        const result = await seedTestLeadsAndMeetings(req.user?.id);
        await recordActivityLog(req.user?.id, 'seed_test_data', 'lead', undefined, result);
        res.json(result);
    }
    catch (err) {
        next(err);
    }
});
// List leads with filters, search, metaIntegrated, runningAds, and pagination
router.get('/', async (req, res, next) => {
    try {
        const data = await leadsService.getLeads(req.query, req.user?.role, req.user?.id);
        res.json({ success: true, data });
    }
    catch (err) {
        next(err);
    }
});
// Scrape email from lead's website
router.post('/:id/scrape-email', async (req, res, next) => {
    try {
        const id = String(req.params.id);
        const result = await leadsService.scrapeLeadEmail(id);
        res.json({ success: true, ...result });
    }
    catch (err) {
        next(err);
    }
});
// Batch enrich website emails
router.post('/enrich-all', async (req, res, next) => {
    try {
        const limit = Number(req.query.limit) || 50;
        const result = await leadsService.enrichAllLeadEmails(limit);
        res.json({ success: true, ...result });
    }
    catch (err) {
        next(err);
    }
});
// Single lead Meta Pixel & Ads detection
router.post('/:id/scan-meta', async (req, res, next) => {
    try {
        const id = String(req.params.id);
        const result = await leadsService.scanLeadMeta(id);
        res.json({ success: true, ...result });
    }
    catch (err) {
        next(err);
    }
});
// Batch scan leads for Meta integration & Ads
router.post('/scan-meta-all', async (req, res, next) => {
    try {
        const limit = Number(req.query.limit) || 50;
        const result = await leadsService.scanAllLeadsMeta(limit);
        res.json({ success: true, ...result });
    }
    catch (err) {
        next(err);
    }
});
// AI Company Needs & Sales Pitch Analysis
router.get('/:id/ai-audit', async (req, res, next) => {
    try {
        const id = String(req.params.id);
        const analysis = await leadsService.analyzeLeadNeeds(id);
        res.json({ success: true, data: analysis });
    }
    catch (err) {
        next(err);
    }
});
// Single lead
router.get('/:id', async (req, res, next) => {
    try {
        const lead = await leadsService.getLeadById(String(req.params.id));
        if (!lead)
            return res.status(404).json({ success: false, error: 'Lead not found' });
        res.json({ success: true, data: lead });
    }
    catch (err) {
        next(err);
    }
});
// Update lead status, notes, or owner
router.patch('/:id', async (req, res, next) => {
    try {
        const id = String(req.params.id);
        const updated = await leadsService.updateLead(id, req.body);
        await recordActivityLog(req.user?.id, 'update_lead', 'lead', id, req.body);
        res.json({ success: true, data: updated });
    }
    catch (err) {
        next(err);
    }
});
// Assign lead
router.post('/:id/assign', async (req, res, next) => {
    try {
        const id = String(req.params.id);
        const { ownerId } = req.body;
        const updated = await leadsService.updateLead(id, { ownerId });
        await recordActivityLog(req.user?.id, 'assign_lead', 'lead', id, { ownerId });
        res.json({ success: true, data: updated });
    }
    catch (err) {
        next(err);
    }
});
export const leadRoutes = router;
//# sourceMappingURL=routes.js.map