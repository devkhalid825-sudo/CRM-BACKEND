import { Router } from 'express';
import { commsController } from './controller.js';
import { authenticateToken } from '../../middleware/auth.js';
export const commsRoutes = Router();
commsRoutes.use(authenticateToken);
commsRoutes.post('/call', (req, res) => commsController.call(req, res));
commsRoutes.post('/whatsapp', (req, res) => commsController.whatsapp(req, res));
commsRoutes.get('/status', (req, res) => commsController.status(req, res));
//# sourceMappingURL=routes.js.map