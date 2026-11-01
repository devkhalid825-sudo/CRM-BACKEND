import { commsService } from './service.js';
export class CommsController {
    async call(req, res) {
        try {
            const { leadId, phone } = req.body;
            if (!leadId || !phone) {
                res.status(400).json({ success: false, error: 'leadId and phone are required' });
                return;
            }
            const result = await commsService.initiateCall(leadId, phone, req.user?.id || 'system');
            res.json({ success: true, data: result });
        }
        catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }
    async whatsapp(req, res) {
        try {
            const { leadId, phone, text } = req.body;
            if (!leadId || !phone || !text) {
                res.status(400).json({ success: false, error: 'leadId, phone, and text are required' });
                return;
            }
            const result = await commsService.sendWhatsApp(leadId, phone, text, req.user?.id || 'system');
            res.json({ success: true, data: result });
        }
        catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }
    async status(_req, res) {
        res.json({
            success: true,
            data: {
                voice: 'active',
                whatsapp: 'active',
                methods: ['tel_direct', 'webrtc_ready', 'wa_me_direct', 'cloud_api_ready'],
            },
        });
    }
}
export const commsController = new CommsController();
//# sourceMappingURL=controller.js.map