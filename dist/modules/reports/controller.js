import { reportsService } from './service.js';
export class ReportsController {
    async getOverview(_req, res) {
        try {
            const data = await reportsService.getOverview();
            res.json({ success: true, data });
        }
        catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }
    async getGeo(_req, res) {
        try {
            const data = await reportsService.getGeoDistribution();
            res.json({ success: true, data });
        }
        catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }
    async getCategories(_req, res) {
        try {
            const data = await reportsService.getCategoryDistribution();
            res.json({ success: true, data });
        }
        catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }
    async getTeam(_req, res) {
        try {
            const data = await reportsService.getAgentPerformance();
            res.json({ success: true, data });
        }
        catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }
}
export const reportsController = new ReportsController();
//# sourceMappingURL=controller.js.map