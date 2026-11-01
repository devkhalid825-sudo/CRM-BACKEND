import { Router } from 'express';
import { emailController } from './controller.js';
import { authenticateToken } from '../../middleware/auth.js';

export const emailRoutes = Router();

emailRoutes.use(authenticateToken);

emailRoutes.post('/send', (req, res) => emailController.send(req, res));
emailRoutes.get('/', (req, res) => emailController.list(req, res));
emailRoutes.get('/templates', (req, res) => emailController.getTemplates(req, res));
emailRoutes.post('/templates', (req, res) => emailController.createTemplate(req, res));
emailRoutes.get('/accounts', (req, res) => emailController.getAccounts(req, res));
emailRoutes.post('/accounts', (req, res) => emailController.addAccount(req, res));
