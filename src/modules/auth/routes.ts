import { Router } from 'express';
import { authController } from './controller.js';
import { authenticateToken } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';
import { authRateLimiter } from '../../middleware/rateLimit.js';
import { LoginSchema } from '@lead-crm/shared';
import { z } from 'zod';

const router = Router();

const Verify2FALoginSchema = z.object({
  tempToken: z.string().min(1),
  code: z.string().length(6),
});

const Verify2FASetupSchema = z.object({
  secret: z.string().min(1),
  token: z.string().length(6),
});

router.post('/login', authRateLimiter, validateBody(LoginSchema), (req, res, next) =>
  authController.login(req, res).catch(next)
);

router.post('/login/2fa', authRateLimiter, validateBody(Verify2FALoginSchema), (req, res, next) =>
  authController.verify2FALogin(req, res).catch(next)
);

router.post('/refresh', (req, res, next) =>
  authController.refresh(req, res).catch(next)
);

router.post('/logout', (req, res, next) =>
  authController.logout(req, res).catch(next)
);

router.get('/me', authenticateToken, (req, res, next) =>
  authController.me(req, res).catch(next)
);

router.post('/2fa/setup', authenticateToken, (req, res, next) =>
  authController.setup2FA(req, res).catch(next)
);

router.post('/2fa/verify', authenticateToken, validateBody(Verify2FASetupSchema), (req, res, next) =>
  authController.verify2FA(req, res).catch(next)
);

export const authRoutes = router;
