export interface CreateJobInput {
    country: string;
    region?: string;
    city?: string;
    categoryId: string;
    providerId?: string;
    keyId?: string;
}
export declare class FinderService {
    /**
     * Estimates total requests and expected leads before starting
     */
    estimateJob(input: CreateJobInput): Promise<{
        cellsCount: number;
        keywordsCount: number;
        totalRequests: number;
        estimatedLeads: number;
    }>;
    /**
     * Create a new search job with all grid checkpoint tasks
     */
    createJob(createdBy: string, input: CreateJobInput): Promise<any>;
    /**
     * Executes the job processing pending tasks checkpoint by checkpoint
     */
    executeJob(jobId: string): Promise<void>;
    /**
     * Resumes all paused jobs (e.g. when an admin adds or enables a new key)
     */
    resumePausedJobs(): Promise<number>;
}
export declare const finderService: FinderService;
//# sourceMappingURL=service.d.ts.map