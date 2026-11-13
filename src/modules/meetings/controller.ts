import { Request, Response } from 'express';
import { meetingsService } from './service.js';

export class MeetingsController {
  async schedule(req: Request, res: Response): Promise<void> {
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
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async list(req: Request, res: Response): Promise<void> {
    try {
      const leadId = req.query.leadId as string | undefined;
      const meetings = await meetingsService.listMeetings({ leadId });
      res.json({ success: true, data: meetings });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);
      const { status, notes, aiSummary } = req.body;
      const meeting = await meetingsService.updateMeeting(id, { status, notes, aiSummary });
      res.json({ success: true, data: meeting });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}

export const meetingsController = new MeetingsController();
