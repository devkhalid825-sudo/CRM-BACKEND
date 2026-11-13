import { Router } from 'express';
import { proposalsController } from './controller.js';
import { authenticateToken } from '../../middleware/auth.js';
export const proposalRoutes = Router();
// 1. Public Client Portal Routes (Unauthenticated)
proposalRoutes.get('/public/:token', (req, res) => proposalsController.getPublicByToken(req, res));
proposalRoutes.post('/public/:token/action', (req, res) => proposalsController.actionPublic(req, res));
// 2. Authenticated CRM Routes
proposalRoutes.post('/', authenticateToken, (req, res) => proposalsController.create(req, res));
proposalRoutes.get('/', authenticateToken, (req, res) => proposalsController.list(req, res));
proposalRoutes.post('/ai-generate', authenticateToken, (req, res) => proposalsController.generateDraft(req, res));
proposalRoutes.post('/generate-ai', authenticateToken, (req, res) => proposalsController.generateDraft(req, res));
//# sourceMappingURL=routes.js.map