import { Router } from 'express';
import { providersController } from './controller.js';
import { authenticateToken } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/requireRole.js';
import { validateBody } from '../../middleware/validate.js';
import { CreateProviderKeySchema, UpdateProviderKeySchema } from '../../shared/index.js';
import { z } from 'zod';
const router = Router();
// Protect all provider routes: requires admin
router.use(authenticateToken);
router.use(requireRole('admin'));
const TestKeySchema = z.object({
    apiKey: z.string().min(1, 'API Key is required to test'),
});
// Providers
router.get('/', (req, res, next) => providersController.getProviders(req, res).catch(next));
router.get('/:id/keys', (req, res, next) => providersController.getKeys(req, res).catch(next));
router.post('/:id/keys', validateBody(CreateProviderKeySchema), (req, res, next) => providersController.addKey(req, res).catch(next));
router.post('/:id/test', validateBody(TestKeySchema), (req, res, next) => providersController.testConnection(req, res).catch(next));
export const providerRoutes = router;
// Dedicated key routes (/api/keys)
const keyRouter = Router();
keyRouter.use(authenticateToken);
keyRouter.use(requireRole('admin'));
keyRouter.patch('/:id', validateBody(UpdateProviderKeySchema), (req, res, next) => providersController.updateKey(req, res).catch(next));
keyRouter.delete('/:id', (req, res, next) => providersController.deleteKey(req, res).catch(next));
keyRouter.post('/:id/test', (req, res, next) => providersController.testSavedKey(req, res).catch(next));
export const keyRoutes = keyRouter;
//# sourceMappingURL=routes.js.map