import { Router } from 'express';
import { tasksService } from './service.js';
import { authenticateToken } from '../../middleware/auth.js';

const router = Router();
router.use(authenticateToken);

router.get('/', async (req, res, next) => {
  try {
    const user = req.user!;
    const filterAssignee = req.query.assignee ? String(req.query.assignee) : undefined;
    const tasks = await tasksService.listTasks(user.id, user.role, filterAssignee);
    res.json({ success: true, data: tasks });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const user = req.user!;
    const { title, assignedTo, leadId, dueDate, priority, notes } = req.body;
    if (!title || !assignedTo) {
      return res.status(400).json({ success: false, error: 'Title and assignedTo are required' });
    }

    const task = await tasksService.createTask(user.id, user.name || 'Manager', {
      title,
      assignedTo,
      leadId,
      dueDate,
      priority,
      notes,
    });

    res.status(201).json({ success: true, data: task });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/status', async (req, res, next) => {
  try {
    const user = req.user!;
    const taskId = String(req.params.id);
    const { status } = req.body;
    if (!status || !['pending', 'completed'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Status must be pending or completed' });
    }

    const result = await tasksService.updateStatus(taskId, status, user.id);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const taskId = String(req.params.id);
    const result = await tasksService.deleteTask(taskId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

export const taskRoutes = router;
