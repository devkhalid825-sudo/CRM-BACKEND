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
export type LeadStatus = z.infer<typeof LeadStatusSchema>;

export const LeadScoreSchema = z.object({
  value: z.number().min(0).max(100),
  reason: z.string(),
  at: z.string(),
});
export type LeadScore = z.infer<typeof LeadScoreSchema>;

export const AdsInfoSchema = z.object({
  running: z.boolean(),
  platforms: z.array(z.string()).default([]),
  checkedAt: z.string().nullable().optional(),
});
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
