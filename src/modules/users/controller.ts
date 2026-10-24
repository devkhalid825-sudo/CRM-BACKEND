import { Request, Response } from 'express';
import { usersService } from './service.js';
import { recordAuditLog } from '../../middleware/audit.js';

export class UsersController {
  async listUsers(req: Request, res: Response): Promise<void> {
    const users = await usersService.listUsers();
    res.json({ success: true, data: users });
  }

  async createUser(req: Request, res: Response): Promise<void> {
    const user = await usersService.createUser(req.body);

    await recordAuditLog(req, 'create_user', `User:${user.id}`, null, {
      name: user.name,
      email: user.email,
      role: user.role,
    });

    res.status(201).json({ success: true, data: user });
  }

  async updateUser(req: Request, res: Response): Promise<void> {
    const id = String(req.params.id);
    const user = await usersService.updateUser(id, req.body);

    await recordAuditLog(req, 'update_user', `User:${id}`, null, {
      name: user.name,
      email: user.email,
      role: user.role,
      active: user.active,
    });

    res.json({ success: true, data: user });
  }

  async deleteUser(req: Request, res: Response): Promise<void> {
    const id = String(req.params.id);
    await usersService.deleteUser(id);

    await recordAuditLog(req, 'delete_user', `User:${id}`);
    res.json({ success: true, message: 'User soft-deleted successfully' });
  }
}

export const usersController = new UsersController();
