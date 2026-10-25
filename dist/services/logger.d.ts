type LogListener = (logEntry: {
    level: string;
    module: string;
    msg: string;
    meta?: Record<string, unknown>;
    createdAt: string;
}) => void;
export declare function registerLogBroadcaster(fn: LogListener): void;
export declare function log(level: 'info' | 'warn' | 'error' | 'debug', moduleName: string, msg: string, meta?: Record<string, unknown>): void;
export declare const logger: {
    info: (moduleName: string, msg: string, meta?: Record<string, unknown>) => void;
    warn: (moduleName: string, msg: string, meta?: Record<string, unknown>) => void;
    error: (moduleName: string, msg: string, meta?: Record<string, unknown>) => void;
    debug: (moduleName: string, msg: string, meta?: Record<string, unknown>) => void;
};
export {};
//# sourceMappingURL=logger.d.ts.map