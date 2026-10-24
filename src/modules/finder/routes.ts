import { Router } from 'express';
import { finderService } from './service.js';
import { authenticateToken } from '../../middleware/auth.js';
import { prisma } from '../../db/prisma.js';

const router = Router();

router.use(authenticateToken);

router.post('/estimate', async (req, res, next) => {
  try {
    const estimate = await finderService.estimateJob(req.body);
    res.json({ success: true, data: estimate });
  } catch (err) {
    next(err);
  }
});

router.post('/jobs', async (req, res, next) => {
  try {
    const job = await finderService.createJob(req.user!.id, req.body);
    res.status(201).json({ success: true, data: job });
  } catch (err) {
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
  } catch (err) {
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
  } catch (err) {
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
  } catch (err) {
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
  } catch (err) {
    next(err);
  }
});

export const finderRoutes = router;
