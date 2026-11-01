import { prisma } from '../../db/prisma.js';
export class MeetingsService {
    /**
     * Schedule a meeting with a lead
     */
    async scheduleMeeting(input) {
        let meetLink = input.meetLink;
        if (!meetLink) {
            // Generate clean Google Meet room or room identifier
            const roomId = `crm-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
            meetLink = `https://meet.google.com/${roomId}`;
        }
        const meeting = await prisma.meeting.create({
            data: {
                leadId: input.leadId,
                userId: input.userId,
                title: input.title,
                startTime: input.startTime,
                endTime: input.endTime,
                meetLink,
                notes: input.notes,
                status: 'scheduled',
            },
        });
        // Advance lead status to 'meeting'
        await prisma.lead.update({
            where: { id: input.leadId },
            data: { status: 'meeting' },
        });
        // Log on lead timeline
        await prisma.leadEvent.create({
            data: {
                leadId: input.leadId,
                type: 'meeting',
                actorId: input.userId,
                payload: {
                    meetingId: meeting.id,
                    title: meeting.title,
                    startTime: meeting.startTime,
                    meetLink: meeting.meetLink,
                    notes: meeting.notes,
                },
            },
        });
        return meeting;
    }
    /**
     * List scheduled meetings
     */
    async listMeetings(query) {
        const where = {};
        if (query.leadId)
            where.leadId = query.leadId;
        if (query.userId)
            where.userId = query.userId;
        return prisma.meeting.findMany({
            where,
            orderBy: { startTime: 'desc' },
            take: 50,
        });
    }
    /**
     * Update meeting status or notes
     */
    async updateMeeting(id, data) {
        const meeting = await prisma.meeting.update({
            where: { id },
            data,
        });
        if (data.status) {
            await prisma.leadEvent.create({
                data: {
                    leadId: meeting.leadId,
                    type: 'meeting',
                    payload: {
                        action: `meeting_${data.status}`,
                        title: meeting.title,
                        notes: data.notes,
                        aiSummary: data.aiSummary,
                    },
                },
            });
        }
        return meeting;
    }
}
export const meetingsService = new MeetingsService();
//# sourceMappingURL=service.js.map