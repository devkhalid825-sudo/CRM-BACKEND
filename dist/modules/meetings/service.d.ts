export interface ScheduleMeetingInput {
    leadId: string;
    userId: string;
    title: string;
    startTime: Date;
    endTime?: Date;
    meetLink?: string;
    notes?: string;
}
export declare class MeetingsService {
    /**
     * Schedule a meeting with a lead
     */
    scheduleMeeting(input: ScheduleMeetingInput): Promise<{
        status: string;
        createdAt: Date;
        updatedAt: Date;
        id: string;
        userId: string;
        leadId: string;
        notes: string | null;
        title: string;
        startTime: Date;
        endTime: Date | null;
        meetLink: string | null;
        aiSummary: string | null;
    }>;
    /**
     * List scheduled meetings
     */
    listMeetings(query: {
        leadId?: string;
        userId?: string;
    }): Promise<{
        status: string;
        createdAt: Date;
        updatedAt: Date;
        id: string;
        userId: string;
        leadId: string;
        notes: string | null;
        title: string;
        startTime: Date;
        endTime: Date | null;
        meetLink: string | null;
        aiSummary: string | null;
    }[]>;
    /**
     * Update meeting status or notes
     */
    updateMeeting(id: string, data: {
        status?: string;
        notes?: string;
        aiSummary?: string;
    }): Promise<{
        status: string;
        createdAt: Date;
        updatedAt: Date;
        id: string;
        userId: string;
        leadId: string;
        notes: string | null;
        title: string;
        startTime: Date;
        endTime: Date | null;
        meetLink: string | null;
        aiSummary: string | null;
    }>;
}
export declare const meetingsService: MeetingsService;
//# sourceMappingURL=service.d.ts.map