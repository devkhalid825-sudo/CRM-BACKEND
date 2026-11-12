import { Router } from 'express';
import { usersController } from './controller.js';
import { usersService } from './service.js';
import { authenticateToken } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/requireRole.js';
import { validateBody } from '../../middleware/validate.js';
import { CreateUserSchema, UpdateUserSchema } from '../../shared/index.js';

const router = Router();

router.use(authenticateToken);

// Accessible by all authenticated team members for task delegation & mentions
router.get('/assignees', async (req, res, next) => {
  try {
    const users = await usersService.listUsers();
    res.json({
      success: true,
      data: users.map((u: any) => ({ id: u.id, name: u.name, email: u.email, role: u.role })),
    });
  } catch (err) {
    next(err);
  }
});

router.use(requireRole('admin'));

router.get('/', (req, res, next) =>
  usersController.listUsers(req, res).catch(next)
);

router.post('/', validateBody(CreateUserSchema), (req, res, next) =>
  usersController.createUser(req, res).catch(next)
);

router.patch('/:id', validateBody(UpdateUserSchema), (req, res, next) =>
  usersController.updateUser(req, res).catch(next)
);

router.delete('/:id', (req, res, next) =>
  usersController.deleteUser(req, res).catch(next)
);

export const userRoutes = router;
