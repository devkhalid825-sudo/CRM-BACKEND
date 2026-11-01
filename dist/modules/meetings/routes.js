import { Router } from 'express';
import { meetingsController } from './controller.js';
import { authenticateToken } from '../../middleware/auth.js';
export const meetingRoutes = Router();
meetingRoutes.use(authenticateToken);
meetingRoutes.post('/', (req, res) => meetingsController.schedule(req, res));
meetingRoutes.get('/', (req, res) => meetingsController.list(req, res));
meetingRoutes.patch('/:id', (req, res) => meetingsController.update(req, res));
//# sourceMappingURL=routes.js.map