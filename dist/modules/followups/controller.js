import { followupService } from './service.js';
export class FollowupController {
    async getRules(_req, res) {
        try {
            const data = await followupService.listRules();
            res.json({ success: true, data });
        }
        catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }
    async createRule(req, res) {
        try {
            const { name, triggerOn, conditionJson, templateId, delayHours } = req.body;
            if (!name || !triggerOn) {
                res.status(400).json({ success: false, error: 'Name and triggerOn are required' });
                return;
            }
            const result = await followupService.createRule({
                name,
                triggerOn,
                conditionJson: conditionJson || {},
                templateId,
                delayHours: delayHours || 24,
            });
            res.json({ success: true, data: result });
        }
        catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }
    async toggleRule(req, res) {
        try {
            const id = String(req.params.id);
            const result = await followupService.toggleRule(id);
            res.json({ success: true, data: result });
        }
        catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }
    async getTasks(req, res) {
        try {
            const status = req.query.status;
            const data = await followupService.listTasks(status);
            res.json({ success: true, data });
        }
        catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }
    async runCheck(_req, res) {
        try {
            const result = await followupService.runFollowupCheck();
            res.json({ success: true, data: result });
        }
        catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }
}
export const followupController = new FollowupController();
//# sourceMappingURL=controller.js.map