import { Router } from 'express';
import { followupController } from './controller.js';
import { authenticateToken } from '../../middleware/auth.js';

export const followupRoutes = Router();

followupRoutes.use(authenticateToken);

followupRoutes.get('/rules', (req, res) => followupController.getRules(req, res));
followupRoutes.post('/rules', (req, res) => followupController.createRule(req, res));
followupRoutes.patch('/rules/:id/toggle', (req, res) => followupController.toggleRule(req, res));
followupRoutes.get('/tasks', (req, res) => followupController.getTasks(req, res));
followupRoutes.post('/run-check', (req, res) => followupController.runCheck(req, res));
