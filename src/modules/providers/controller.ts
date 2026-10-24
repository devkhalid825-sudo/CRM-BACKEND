import { Request, Response } from 'express';
import { providersService } from './service.js';
import { recordAuditLog } from '../../middleware/audit.js';
import { maskKey } from '../../services/crypto.js';

export class ProvidersController {
  async getProviders(req: Request, res: Response): Promise<void> {
    const list = await providersService.getProviders();
    res.json({ success: true, data: list });
  }

  async getKeys(req: Request, res: Response): Promise<void> {
    const id = String(req.params.id);
    const keys = await providersService.getKeysForProvider(id);
    res.json({ success: true, data: keys });
  }

  async addKey(req: Request, res: Response): Promise<void> {
    const id = String(req.params.id);
    const body = { ...req.body, providerId: id || req.body.providerId };

    const keyDTO = await providersService.addKey(body);

    await recordAuditLog(
      req,
      'create_key',
      `ProviderKey:${keyDTO.id}`,
      null,
      { label: keyDTO.label, providerId: keyDTO.providerId, maskedKey: keyDTO.maskedKey }
    );

    res.status(201).json({ success: true, data: keyDTO });
  }

  async updateKey(req: Request, res: Response): Promise<void> {
    const id = String(req.params.id);
    const keyDTO = await providersService.updateKey(id, req.body);

    await recordAuditLog(
      req,
      'update_key',
      `ProviderKey:${id}`,
      null,
      { label: keyDTO.label, enabled: keyDTO.enabled, priority: keyDTO.priority }
    );

    res.json({ success: true, data: keyDTO });
  }

  async deleteKey(req: Request, res: Response): Promise<void> {
    const id = String(req.params.id);
    await providersService.deleteKey(id);

    await recordAuditLog(req, 'delete_key', `ProviderKey:${id}`);
    res.json({ success: true, message: 'Key removed successfully' });
  }

  async testConnection(req: Request, res: Response): Promise<void> {
    const id = String(req.params.id);
    const { apiKey } = req.body;
    const result = await providersService.testConnection(id as any, apiKey);

    await recordAuditLog(req, 'test_key_connection', `Provider:${id}`, null, {
      ok: result.ok,
      maskedKey: maskKey(apiKey),
    });

    res.json({ success: true, data: result });
  }

  async testSavedKey(req: Request, res: Response): Promise<void> {
    const id = String(req.params.id);
    const result = await providersService.testSavedKey(id);

    await recordAuditLog(req, 'test_saved_key', `ProviderKey:${id}`, null, {
      ok: result.ok,
    });

    res.json({ success: true, data: result });
  }
}

export const providersController = new ProvidersController();
