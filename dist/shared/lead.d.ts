import { z } from 'zod';
export declare const LeadStatusSchema: z.ZodEnum<["new", "contacted", "interested", "meeting", "proposal", "won", "lost"]>;
export type LeadStatus = z.infer<typeof LeadStatusSchema>;
export declare const LeadScoreSchema: z.ZodObject<{
    value: z.ZodNumber;
    reason: z.ZodString;
    at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    value: number;
    at: string;
    reason: string;
}, {
    value: number;
    at: string;
    reason: string;
}>;
export type LeadScore = z.infer<typeof LeadScoreSchema>;
export declare const AdsInfoSchema: z.ZodObject<{
    running: z.ZodBoolean;
    platforms: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    checkedAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    running: boolean;
    platforms: string[];
    checkedAt?: string | null | undefined;
}, {
    running: boolean;
    platforms?: string[] | undefined;
    checkedAt?: string | null | undefined;
}>;
export type AdsInfo = z.infer<typeof AdsInfoSchema>;
export interface LeadDTO {
    id: string;
    placeKey: string;
    name: string;
    phones: string[];
    phoneNorm?: string;
    emails: string[];
    website?: string;
    websiteNorm?: string;
    address?: string;
    country: string;
    city: string;
    lat?: number;
    lng?: number;
    categoryId: string;
    rating?: number;
    source: string;
    tags: string[];
    score?: LeadScore;
    status: LeadStatus;
    lostReason?: string;
    ownerId?: string;
    ownerName?: string;
    adsInfo?: AdsInfo;
    archivedAt?: string | null;
    createdAt: string;
    updatedAt: string;
}
//# sourceMappingURL=lead.d.ts.map