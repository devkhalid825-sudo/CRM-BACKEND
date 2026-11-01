import { Request, Response } from 'express';
import { reportsService } from './service.js';

export class ReportsController {
  async getOverview(_req: Request, res: Response): Promise<void> {
    try {
      const data = await reportsService.getOverview();
      res.json({ success: true, data });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async getGeo(_req: Request, res: Response): Promise<void> {
    try {
      const data = await reportsService.getGeoDistribution();
      res.json({ success: true, data });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async getCategories(_req: Request, res: Response): Promise<void> {
    try {
      const data = await reportsService.getCategoryDistribution();
      res.json({ success: true, data });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async getTeam(_req: Request, res: Response): Promise<void> {
    try {
      const data = await reportsService.getAgentPerformance();
      res.json({ success: true, data });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}

export const reportsController = new ReportsController();
