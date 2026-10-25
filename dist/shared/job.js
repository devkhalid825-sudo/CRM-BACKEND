import { z } from 'zod';
export const JobStatusSchema = z.enum([
    'queued',
    'running',
    'paused',
    'done',
    'failed',
    'cancelled',
]);
//# sourceMappingURL=job.js.map