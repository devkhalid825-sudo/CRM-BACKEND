import { meetingsService } from './service.js';
export class MeetingsController {
    async schedule(req, res) {
        try {
            const { leadId, title, startTime, endTime, meetLink, notes } = req.body;
            if (!title || !startTime) {
                res.status(400).json({ success: false, error: 'title and startTime are required' });
                return;
            }
            const meeting = await meetingsService.scheduleMeeting({
                leadId: leadId || 'team',
                userId: req.user?.id || 'system',
                title,
                startTime: new Date(startTime),
                endTime: endTime ? new Date(endTime) : undefined,
                meetLink,
                notes,
            });
            res.json({ success: true, data: meeting });
        }
        catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }
    async list(req, res) {
        try {
            const leadId = req.query.leadId;
            const meetings = await meetingsService.listMeetings({ leadId });
            res.json({ success: true, data: meetings });
        }
        catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }
    async update(req, res) {
        try {
            const id = String(req.params.id);
            const { status, notes, aiSummary } = req.body;
            const meeting = await meetingsService.updateMeeting(id, { status, notes, aiSummary });
            res.json({ success: true, data: meeting });
        }
        catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }
}
export const meetingsController = new MeetingsController();
//# sourceMappingURL=controller.js.map