import { Router } from 'express';
import { leadsService } from './service.js';
import { authenticateToken } from '../../middleware/auth.js';
import { recordActivityLog } from '../../middleware/audit.js';

const router = Router();

router.use(authenticateToken);

// Excel export
router.get('/export.xlsx', async (req, res, next) => {
  try {
    const buffer = await leadsService.generateExcelWorkbook(
      req.query as any,
      req.user?.role,
      req.user?.id
    );

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="leads_export_${Date.now()}.xlsx"`
    );
    res.send(buffer);
  } catch (err) {
    next(err);
  }
});

// List leads with filters and pagination
router.get('/', async (req, res, next) => {
  try {
    const data = await leadsService.getLeads(
      req.query as any,
      req.user?.role,
      req.user?.id
    );
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// Single lead
router.get('/:id', async (req, res, next) => {
  try {
    const lead = await leadsService.getLeadById(String(req.params.id));
    if (!lead) return res.status(404).json({ success: false, error: 'Lead not found' });
    res.json({ success: true, data: lead });
  } catch (err) {
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
  } catch (err) {
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
  } catch (err) {
    next(err);
  }
});

export const leadRoutes = router;
