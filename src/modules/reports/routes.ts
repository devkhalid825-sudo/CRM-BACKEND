import { Router } from 'express';
import { reportsController } from './controller.js';
import { authenticateToken } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/requireRole.js';

export const reportsRoutes = Router();

// Reports are accessible by admin and manager roles
reportsRoutes.use(authenticateToken);
reportsRoutes.use(requireRole('admin', 'manager', 'sales', 'viewer'));

reportsRoutes.get('/overview', (req, res) => reportsController.getOverview(req, res));
reportsRoutes.get('/geo', (req, res) => reportsController.getGeo(req, res));
reportsRoutes.get('/categories', (req, res) => reportsController.getCategories(req, res));
reportsRoutes.get('/team', (req, res) => reportsController.getTeam(req, res));
