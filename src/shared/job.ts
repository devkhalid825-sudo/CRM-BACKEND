import { z } from 'zod';

export const JobStatusSchema = z.enum([
  'queued',
  'running',
  'paused',
  'done',
  'failed',
  'cancelled',
]);
export type JobStatus = z.infer<typeof JobStatusSchema>;

export interface SearchJobDTO {
  id: string;
  createdBy: string;
  country: string;
  region?: string;
  city?: string;
  categoryId: string;
  categoryName?: string;
  providerId: string;
  keyId?: string;
  status: JobStatus;
  progress: {
    done: number;
    total: number;
  };
  stats: {
    found: number;
    new: number;
    duplicates: number;
  };
  costEstimate: number;
  costActual: number;
  pausedReason?: string;
  createdAt: string;
  updatedAt: string;
}
