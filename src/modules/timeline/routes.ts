import { Router } from 'express';
import { prisma } from '../../db/prisma.js';
import { authenticateToken } from '../../middleware/auth.js';
import { recordActivityLog } from '../../middleware/audit.js';

const router = Router();

router.use(authenticateToken);

// Get lead timeline
router.get('/:id/timeline', async (req, res, next) => {
  try {
    const leadId = String(req.params.id);
    const events = await prisma.leadEvent.findMany({
      where: { leadId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json({ success: true, data: events });
  } catch (err) {
    next(err);
  }
});

// Add timeline event (e.g. note with @mentions or status update)
router.post('/:id/timeline', async (req, res, next) => {
  try {
    const leadId = String(req.params.id);
    const { type, payload } = req.body;

    const event = await prisma.leadEvent.create({
      data: {
        leadId,
        type: type || 'note',
        actorId: req.user?.id,
        actorName: req.user?.name,
        payload: payload || {},
      },
    });

    await recordActivityLog(req.user?.id, 'add_timeline_event', 'lead', leadId, { type });
    res.status(201).json({ success: true, data: event });
  } catch (err) {
    next(err);
  }
});

// Log a call directly to lead
router.post('/:id/calls', async (req, res, next) => {
  try {
    const leadId = String(req.params.id);
    const { direction, outcome, durationSec, notes } = req.body;

    const call = await prisma.callLog.create({
      data: {
        leadId,
        userId: req.user!.id,
        direction: direction || 'outbound',
        outcome: outcome || 'connected',
        durationSec: durationSec || 0,
        notes: notes || '',
      },
    });

    // Also record event in lead timeline
    await prisma.leadEvent.create({
      data: {
        leadId,
        type: 'call',
        actorId: req.user?.id,
        actorName: req.user?.name,
        payload: {
          callId: call.id,
          direction: call.direction,
          outcome: call.outcome,
          durationSec: call.durationSec,
          notes: call.notes,
        },
      },
    });

    await recordActivityLog(req.user?.id, 'log_call', 'lead', leadId, { outcome });
    res.status(201).json({ success: true, data: call });
  } catch (err) {
    next(err);
  }
});

export const timelineRoutes = router;
