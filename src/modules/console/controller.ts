import { Request, Response } from 'express';
import { consoleService } from './service.js';
import { runtimeConfig } from '../../config/runtimeConfig.js';
import { recordAuditLog } from '../../middleware/audit.js';

export class ConsoleController {
  async getConfig(req: Request, res: Response): Promise<void> {
    const configs = await consoleService.getConfig();
    res.json({ success: true, data: configs });
  }

  async setConfig(req: Request, res: Response): Promise<void> {
    const { key, value, group } = req.body;
    await consoleService.setConfig(key, value, group, req.user?.id);

    await recordAuditLog(req, 'set_config', `AppConfig:${key}`, null, {
      key,
      group,
    });

    res.json({ success: true, message: 'Configuration saved and applied' });
  }

  async parseEnv(req: Request, res: Response): Promise<void> {
    const { content } = req.body;
    const preview = consoleService.parseEnv(content || '');
    res.json({ success: true, data: preview });
  }

  async applyEnv(req: Request, res: Response): Promise<void> {
    const { items } = req.body;
    const count = await consoleService.applyEnvImport(items, req.user?.id);

    await recordAuditLog(req, 'import_env', 'app_config', null, { appliedKeysCount: count });

    res.json({ success: true, message: `Applied ${count} runtime configuration keys` });
  }

  async getLogs(req: Request, res: Response): Promise<void> {
    const logs = await consoleService.getLogs({
      level: req.query.level as string,
      module: req.query.module as string,
      search: req.query.search as string,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
    });
    res.json({ success: true, data: logs });
  }

  async getAudit(req: Request, res: Response): Promise<void> {
    const logs = await consoleService.getAuditLogs({
      action: req.query.action as string,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
    });
    res.json({ success: true, data: logs });
  }

  async reloadConfig(req: Request, res: Response): Promise<void> {
    const count = await runtimeConfig.reload();
    await recordAuditLog(req, 'reload_config', 'runtimeConfig', null, { cachedKeys: count });
    res.json({ success: true, message: `Reloaded ${count} runtime config keys into cache` });
  }

  async getHealth(req: Request, res: Response): Promise<void> {
    const health = await consoleService.getHealth();
    res.json({ success: true, data: health });
  }
}

export const consoleController = new ConsoleController();
