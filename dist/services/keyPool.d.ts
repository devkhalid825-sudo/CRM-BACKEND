export interface ActiveKey {
    id: string;
    providerId: string;
    rawKey: string;
    label: string;
}
export declare class KeyPoolService {
    private isMongo;
    /**
     * Resets usage counters for a key if the date has passed UTC midnight
     */
    private checkAndResetDailyUsage;
    /**
     * Get all eligible healthy keys for a provider, sorted by priority then least-used
     */
    getAvailableKeys(providerId: string, pinnedKeyId?: string): Promise<ActiveKey[]>;
    /**
     * Mark success: increment usage and set status to healthy
     */
    recordSuccess(keyId: string): Promise<void>;
    /**
     * Mark error: adjust status, set cooldown or disable key on auth error
     */
    recordFailure(keyId: string, error: unknown): Promise<void>;
}
export declare const keyPool: KeyPoolService;
//# sourceMappingURL=keyPool.d.ts.map