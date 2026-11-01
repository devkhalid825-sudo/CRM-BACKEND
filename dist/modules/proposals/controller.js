import { proposalsService } from './service.js';
export class ProposalsController {
    async create(req, res) {
        try {
            const { leadId, title, currency, items, notes, validUntil } = req.body;
            if (!leadId || !title || !items || !Array.isArray(items)) {
                res.status(400).json({ success: false, error: 'leadId, title, and valid items array are required' });
                return;
            }
            const proposal = await proposalsService.createProposal({
                leadId,
                userId: req.user?.id || 'system',
                title,
                currency,
                items,
                notes,
                validUntil: validUntil ? new Date(validUntil) : undefined,
            });
            res.json({ success: true, data: proposal });
        }
        catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }
    async list(req, res) {
        try {
            const leadId = req.query.leadId;
            const proposals = await proposalsService.listProposals({ leadId });
            res.json({ success: true, data: proposals });
        }
        catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }
    async generateDraft(req, res) {
        try {
            const { leadId } = req.body;
            if (!leadId) {
                res.status(400).json({ success: false, error: 'leadId is required' });
                return;
            }
            const draft = await proposalsService.generateAIProposalDraft(leadId);
            res.json({ success: true, data: draft });
        }
        catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }
    async getPublicByToken(req, res) {
        try {
            const token = String(req.params.token);
            const proposal = await proposalsService.getProposalByToken(token);
            if (!proposal) {
                res.status(404).json({ success: false, error: 'Proposal not found or expired' });
                return;
            }
            res.json({ success: true, data: proposal });
        }
        catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }
    async actionPublic(req, res) {
        try {
            const token = String(req.params.token);
            const { action, notes } = req.body;
            if (!action || !['accept', 'reject'].includes(action)) {
                res.status(400).json({ success: false, error: 'Action must be "accept" or "reject"' });
                return;
            }
            const result = await proposalsService.updatePublicProposalAction(token, action, notes);
            res.json({ success: true, data: result });
        }
        catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }
}
export const proposalsController = new ProposalsController();
//# sourceMappingURL=controller.js.map