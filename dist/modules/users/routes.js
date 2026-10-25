import { Router } from 'express';
import { usersController } from './controller.js';
import { authenticateToken } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/requireRole.js';
import { validateBody } from '../../middleware/validate.js';
import { CreateUserSchema, UpdateUserSchema } from '../../shared/index.js';
const router = Router();
router.use(authenticateToken);
router.use(requireRole('admin'));
router.get('/', (req, res, next) => usersController.listUsers(req, res).catch(next));
router.post('/', validateBody(CreateUserSchema), (req, res, next) => usersController.createUser(req, res).catch(next));
router.patch('/:id', validateBody(UpdateUserSchema), (req, res, next) => usersController.updateUser(req, res).catch(next));
router.delete('/:id', (req, res, next) => usersController.deleteUser(req, res).catch(next));
export const userRoutes = router;
//# sourceMappingURL=routes.js.map