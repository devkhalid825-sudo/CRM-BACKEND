import { emailService } from './service.js';
export class EmailController {
    async send(req, res) {
        try {
            const { leadId, to, subject, bodyText, bodyHtml, templateId } = req.body;
            if (!to || !subject) {
                res.status(400).json({ success: false, error: 'Recipient "to" and "subject" are required' });
                return;
            }
            const result = await emailService.sendEmail({
                leadId,
                userId: req.user?.id || 'system',
                to,
                subject,
                bodyText,
                bodyHtml,
                templateId,
            });
            res.json({ success: true, data: result });
        }
        catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }
    async list(req, res) {
        try {
            const leadId = req.query.leadId;
            const result = await emailService.listEmails({
                leadId,
                userId: req.user?.role === 'sales' ? req.user.id : undefined,
            });
            res.json({ success: true, data: result });
        }
        catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }
    async getTemplates(_req, res) {
        try {
            const data = await emailService.getTemplates();
            res.json({ success: true, data });
        }
        catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }
    async createTemplate(req, res) {
        try {
            const { name, subject, bodyHtml, bodyText, category } = req.body;
            if (!name || !subject || !bodyHtml) {
                res.status(400).json({ success: false, error: 'Name, subject, and bodyHtml are required' });
                return;
            }
            const result = await emailService.createTemplate({
                name,
                subject,
                bodyHtml,
                bodyText,
                category,
            });
            res.json({ success: true, data: result });
        }
        catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }
    async getAccounts(req, res) {
        try {
            const data = await emailService.getEmailAccounts(req.user?.id || '');
            res.json({ success: true, data });
        }
        catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }
    async addAccount(req, res) {
        try {
            const { provider, email, senderName, credentials, isDefault } = req.body;
            if (!provider || !email || !senderName || !credentials) {
                res.status(400).json({ success: false, error: 'Provider, email, senderName, and credentials are required' });
                return;
            }
            const result = await emailService.addEmailAccount({
                userId: req.user?.id || 'system',
                provider,
                email,
                senderName,
                credentials,
                isDefault,
            });
            res.json({ success: true, data: result });
        }
        catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }
}
export const emailController = new EmailController();
//# sourceMappingURL=controller.js.map