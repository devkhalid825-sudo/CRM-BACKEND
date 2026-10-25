export declare class AppError extends Error {
    statusCode: number;
    constructor(message: string, statusCode?: number);
}
export declare class QuotaExceededError extends AppError {
    constructor(message?: string);
}
export declare class RateLimitedError extends AppError {
    constructor(message?: string);
}
export declare class AuthError extends AppError {
    constructor(message?: string);
}
export declare class TransientError extends AppError {
    constructor(message?: string);
}
export declare class PermanentError extends AppError {
    constructor(message?: string);
}
export declare class AllProvidersExhaustedError extends AppError {
    constructor(message?: string);
}
//# sourceMappingURL=errors.d.ts.map