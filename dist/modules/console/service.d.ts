import { AppConfigDTO, ImportEnvItem, ImportEnvPreview, SystemLogDTO, AuditLogDTO } from '../../shared/index.js';
export declare class ConsoleService {
    private isMongo;
    /**
     * Get all runtime configs masked
     */
    getConfig(): Promise<AppConfigDTO[]>;
    /**
     * Update or create a single runtime config
     */
    setConfig(key: string, value: string, group?: string, userId?: string): Promise<void>;
    /**
     * Parse .env file and classify keys into runtime vs bootstrap
     */
    parseEnv(content: string): ImportEnvPreview;
    /**
     * Apply runtime keys from parsed env into app_config
     */
    applyEnvImport(items: ImportEnvItem[], userId?: string): Promise<number>;
    /**
     * Query system logs
     */
    getLogs(query: {
        level?: string;
        module?: string;
        limit?: number;
        search?: string;
    }): Promise<SystemLogDTO[]>;
    /**
     * Query audit logs
     */
    getAuditLogs(query: {
        action?: string;
        limit?: number;
    }): Promise<AuditLogDTO[]>;
    /**
     * System health check
     */
    getHealth(): Promise<{
        status: 'healthy' | 'degraded' | 'unhealthy';
        mongo: {
            connected: boolean;
            pingMs: number;
        };
        sql: {
            connected: boolean;
            pingMs: number;
        };
        uptimeSeconds: number;
        memoryUsageMB: number;
        keysSummary: {
            total: number;
            healthy: number;
            invalid: number;
        };
        version: string;
    }>;
}
export declare const consoleService: ConsoleService;
//# sourceMappingURL=service.d.ts.map