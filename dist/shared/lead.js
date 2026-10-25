import { z } from 'zod';
export const LeadStatusSchema = z.enum([
    'new',
    'contacted',
    'interested',
    'meeting',
    'proposal',
    'won',
    'lost',
]);
export const LeadScoreSchema = z.object({
    value: z.number().min(0).max(100),
    reason: z.string(),
    at: z.string(),
});
export const AdsInfoSchema = z.object({
    running: z.boolean(),
    platforms: z.array(z.string()).default([]),
    checkedAt: z.string().nullable().optional(),
});
//# sourceMappingURL=lead.js.map