declare class RuntimeConfigService {
    private cache;
    private isLoaded;
    private reloadListeners;
    private isMongo;
    /**
     * Load and cache all runtime configs from SQL (Prisma) or MongoDB
     */
    init(): Promise<void>;
    /**
     * Reload runtime config cache
     */
    reload(): Promise<number>;
    onReload(fn: () => void): void;
    /**
     * Get a config value by key
     */
    get(key: string, defaultValue?: string): string;
    getInt(key: string, defaultValue?: number): number;
    getBool(key: string, defaultValue?: boolean): boolean;
    /**
     * Set or update a config value
     */
    set(key: string, value: string, group?: string, userId?: string): Promise<void>;
    /**
     * Return all configs with sensitive values masked
     */
    getAllMasked(): Promise<Array<{
        id: string;
        key: string;
        maskedValue: string;
        group: string;
        version: number;
        updatedAt: string;
    }>>;
}
export declare const runtimeConfig: RuntimeConfigService;
export {};
//# sourceMappingURL=runtimeConfig.d.ts.map