import { Router } from 'express';
import { usersController } from './controller.js';
import { usersService } from './service.js';
import { authenticateToken } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/requireRole.js';
import { validateBody } from '../../middleware/validate.js';
import { CreateUserSchema, UpdateUserSchema } from '../../shared/index.js';

const router = Router();

router.use(authenticateToken);

// Accessible by all authenticated team members for task delegation & mentions
router.get('/assignees', async (req, res, next) => {
  try {
    const users = await usersService.listUsers();
    res.json({
      success: true,
      data: users.map((u: any) => ({ id: u.id, name: u.name, email: u.email, role: u.role })),
    });
  } catch (err) {
    next(err);
  }
});

// Periodic heartbeat to track active screen time
router.post('/heartbeat', async (req: any, res: any, next: any) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { seconds, path } = req.body;
    usersService.recordHeartbeat(userId, Number(seconds) || 30, path, req.headers['user-agent']);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// Track lead click / view
router.post('/track-lead-view', async (req: any, res: any, next: any) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { leadId, leadName } = req.body;
    if (leadId) {
      await usersService.recordLeadView(userId, leadId, leadName);
    }
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// Get team screen time, active status & performance stats
router.get('/team-performance', async (req: any, res: any, next: any) => {
  try {
    const stats = await usersService.getTeamPerformance();
    res.json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
});

// Get activity audit trail for a specific team member
router.get('/activities/:id', async (req: any, res: any, next: any) => {
  try {
    const activities = await usersService.getUserActivities(String(req.params.id));
    res.json({ success: true, data: activities });
  } catch (err) {
    next(err);
  }
});

router.use(requireRole('admin'));

router.get('/', (req, res, next) =>
  usersController.listUsers(req, res).catch(next)
);

router.post('/', validateBody(CreateUserSchema), (req, res, next) =>
  usersController.createUser(req, res).catch(next)
);

router.patch('/:id', validateBody(UpdateUserSchema), (req, res, next) =>
  usersController.updateUser(req, res).catch(next)
);

router.delete('/:id', (req, res, next) =>
  usersController.deleteUser(req, res).catch(next)
);

export const userRoutes = router;
