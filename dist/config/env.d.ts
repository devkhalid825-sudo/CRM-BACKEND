import { z } from 'zod';
/**
 * Zod Schema for backend configuration
 */
export declare const EnvSchema: z.ZodObject<{
    NODE_ENV: z.ZodDefault<z.ZodEnum<["development", "production", "test"]>>;
    PORT: z.ZodDefault<z.ZodNumber>;
    DATABASE_URL: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    MONGODB_URI: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    JWT_ACCESS_SECRET: z.ZodDefault<z.ZodString>;
    JWT_REFRESH_SECRET: z.ZodDefault<z.ZodString>;
    ENCRYPTION_MASTER_KEY: z.ZodEffects<z.ZodDefault<z.ZodString>, string, string | undefined>;
    CLIENT_ORIGIN: z.ZodDefault<z.ZodString>;
    PUBLIC_BASE_URL: z.ZodDefault<z.ZodString>;
    GOOGLE_OAUTH_CLIENT_ID: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    GOOGLE_OAUTH_CLIENT_SECRET: z.ZodDefault<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    NODE_ENV: "development" | "production" | "test";
    PORT: number;
    DATABASE_URL: string;
    MONGODB_URI: string;
    JWT_ACCESS_SECRET: string;
    JWT_REFRESH_SECRET: string;
    ENCRYPTION_MASTER_KEY: string;
    CLIENT_ORIGIN: string;
    PUBLIC_BASE_URL: string;
    GOOGLE_OAUTH_CLIENT_ID: string;
    GOOGLE_OAUTH_CLIENT_SECRET: string;
}, {
    NODE_ENV?: "development" | "production" | "test" | undefined;
    PORT?: number | undefined;
    DATABASE_URL?: string | undefined;
    MONGODB_URI?: string | undefined;
    JWT_ACCESS_SECRET?: string | undefined;
    JWT_REFRESH_SECRET?: string | undefined;
    ENCRYPTION_MASTER_KEY?: string | undefined;
    CLIENT_ORIGIN?: string | undefined;
    PUBLIC_BASE_URL?: string | undefined;
    GOOGLE_OAUTH_CLIENT_ID?: string | undefined;
    GOOGLE_OAUTH_CLIENT_SECRET?: string | undefined;
}>;
export type EnvConfig = z.infer<typeof EnvSchema>;
export declare const env: {
    NODE_ENV: "development" | "production" | "test";
    PORT: number;
    DATABASE_URL: string;
    MONGODB_URI: string;
    JWT_ACCESS_SECRET: string;
    JWT_REFRESH_SECRET: string;
    ENCRYPTION_MASTER_KEY: string;
    CLIENT_ORIGIN: string;
    PUBLIC_BASE_URL: string;
    GOOGLE_OAUTH_CLIENT_ID: string;
    GOOGLE_OAUTH_CLIENT_SECRET: string;
};
//# sourceMappingURL=env.d.ts.map