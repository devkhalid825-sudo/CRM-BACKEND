import { prisma } from '../../db/prisma.js';
import { AppError } from '../../services/errors.js';
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
        const lead = await prisma.lead.findUnique({ where: { id: input.leadId } });
        if (!lead) {
            throw new AppError(`Lead with ID '${input.leadId}' not found`, 404);
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
     * List scheduled meetings enriched with lead details
     */
    async listMeetings(query) {
        const where = {};
        if (query.leadId)
            where.leadId = query.leadId;
        if (query.userId)
            where.userId = query.userId;
        const meetings = await prisma.meeting.findMany({
            where,
            orderBy: { startTime: 'desc' },
            take: 100,
        });
        // Enrich meetings with lead information (business name, location, contact)
        const leadIds = Array.from(new Set(meetings.map((m) => m.leadId).filter(Boolean)));
        if (leadIds.length === 0)
            return meetings;
        const leads = await prisma.lead.findMany({
            where: { id: { in: leadIds } },
            select: {
                id: true,
                name: true,
                city: true,
                country: true,
                website: true,
                phoneNorm: true,
                phones: true,
                emails: true,
                tags: true,
            },
        });
        const leadMap = new Map(leads.map((l) => [l.id, l]));
        return meetings.map((m) => ({
            ...m,
            lead: leadMap.get(m.leadId) || null,
        }));
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
                    actorId: meeting.userId,
                    payload: {
                        meetingId: meeting.id,
                        action: 'status_changed',
                        status: data.status,
                    },
                },
            });
        }
        return meeting;
    }
}
export const meetingsService = new MeetingsService();
//# sourceMappingURL=service.js.map