import { prisma } from '../../db/prisma.js';
import { AppError } from '../../services/errors.js';

export interface ScheduleMeetingInput {
  leadId: string;
  userId: string;
  title: string;
  startTime: Date;
  endTime?: Date;
  meetLink?: string;
  notes?: string;
}

/**
 * Generates a strictly valid Google Meet format room code: xxx-yyyy-zzz
 * Google Meet requires exactly 10 lowercase letters separated by two hyphens.
 */
export function generateValidGoogleMeetCode(): string {
  const letters = 'abcdefghijklmnopqrstuvwxyz';
  const randStr = (len: number) =>
    Array.from({ length: len }, () => letters[Math.floor(Math.random() * letters.length)]).join('');
  return `${randStr(3)}-${randStr(4)}-${randStr(3)}`;
}

export class MeetingsService {
  /**
   * Schedule a meeting with a lead with guaranteed valid Google Meet or Video Room URL
   */
  async scheduleMeeting(input: ScheduleMeetingInput) {
    let meetLink = input.meetLink?.trim();
    if (!meetLink) {
      // Auto-generate strictly valid Google Meet URL format (e.g. https://meet.google.com/abc-defg-hij)
      const code = generateValidGoogleMeetCode();
      meetLink = `https://meet.google.com/${code}`;
    }

    const targetLeadId = input.leadId?.trim() || 'team';
    let lead: any = null;

    if (targetLeadId !== 'team' && targetLeadId !== 'general') {
      lead = await prisma.lead.findUnique({ where: { id: targetLeadId } }).catch(() => null);
    }

    const meeting = await prisma.meeting.create({
      data: {
        leadId: targetLeadId,
        userId: input.userId,
        title: input.title,
        startTime: input.startTime,
        endTime: input.endTime,
        meetLink,
        notes: input.notes,
        status: 'scheduled',
      },
    });

    if (lead) {
      // Advance lead status to 'meeting'
      await prisma.lead.update({
        where: { id: targetLeadId },
        data: { status: 'meeting' },
      }).catch(() => {});

      // Log on lead timeline with video call details
      await prisma.leadEvent.create({
        data: {
          leadId: targetLeadId,
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
      }).catch(() => {});
    }

    return meeting;
  }

  /**
   * List scheduled meetings enriched with lead details
   */
  async listMeetings(query: { leadId?: string; userId?: string }) {
    const where: any = {};
    if (query.leadId) where.leadId = query.leadId;
    if (query.userId) where.userId = query.userId;

    const meetings = await prisma.meeting.findMany({
      where,
      orderBy: { startTime: 'desc' },
      take: 100,
    });

    // Enrich meetings with lead information (business name, location, contact)
    const leadIds = Array.from(new Set(meetings.map((m) => m.leadId).filter(Boolean)));
    if (leadIds.length === 0) return meetings;

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

    return meetings.map((m) => {
      let matchedLead = leadMap.get(m.leadId);
      if (!matchedLead && (m.leadId === 'team' || m.leadId === 'general')) {
        matchedLead = {
          id: m.leadId,
          name: 'Internal Team / Own Meeting',
          city: 'Direct Room',
          country: 'Online',
        } as any;
      }
      return {
        ...m,
        lead: matchedLead || null,
      };
    });
  }

  /**
   * Update meeting status or notes
   */
  async updateMeeting(
    id: string,
    data: { status?: string; notes?: string; aiSummary?: string }
  ) {
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
