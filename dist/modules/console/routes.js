import { Router } from 'express';
import { consoleController } from './controller.js';
import { authenticateToken } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/requireRole.js';
import { validateBody } from '../../middleware/validate.js';
import { z } from 'zod';
const router = Router();
// Strict admin-only access
router.use(authenticateToken);
router.use(requireRole('admin'));
const SetConfigSchema = z.object({
    key: z.string().min(1),
    value: z.string().min(1),
    group: z.string().optional().default('general'),
});
const ParseEnvSchema = z.object({
    content: z.string(),
});
const ApplyEnvSchema = z.object({
    items: z.array(z.object({
        key: z.string(),
        value: z.string(),
        type: z.enum(['bootstrap', 'runtime']),
        group: z.string().optional(),
    })),
});
router.get('/config', (req, res, next) => consoleController.getConfig(req, res).catch(next));
router.post('/config', validateBody(SetConfigSchema), (req, res, next) => consoleController.setConfig(req, res).catch(next));
router.post('/config/parse-env', validateBody(ParseEnvSchema), (req, res, next) => consoleController.parseEnv(req, res).catch(next));
router.post('/config/apply-env', validateBody(ApplyEnvSchema), (req, res, next) => consoleController.applyEnv(req, res).catch(next));
router.get('/logs', (req, res, next) => consoleController.getLogs(req, res).catch(next));
router.get('/audit', (req, res, next) => consoleController.getAudit(req, res).catch(next));
router.post('/restart/reload-config', (req, res, next) => consoleController.reloadConfig(req, res).catch(next));
router.get('/health', (req, res, next) => consoleController.getHealth(req, res).catch(next));
export const consoleRoutes = router;
//# sourceMappingURL=routes.js.map